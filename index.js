const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const utils = require('./lib/utils.js');
const Client = require('./lib/client.js');

const PORT = 8080;
const API_KEY = fs.readFileSync('./x-api-key.txt', 'utf8').trim();
const API_KEY_HEADER = 'x-api-key';
const SAVE_DATA_INTERVAL = 2000;

var [data, channels] = utils.initData();
var subscriptions = utils.initSubscriptions(data);
var clients = new Set();
var users = utils.initUsers();

setInterval(() => {
    utils.saveData(data, channels);
}, SAVE_DATA_INTERVAL);

const app = express();
const server = app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('A new WebSocket connection has been established');

    const client = new Client(ws);

    ws.send('State your {id, x-api-key, api-version}');

    ws.on('message', (message) => {
        console.log('Received message: %s', message);
        // Handle the received message here

        if (!client.authenticated) {
            console.log('Authenticating user...');
            try {
                message = JSON.parse(message);
                ({ 'id': client.id, 'x-api-key': client.apiKey, 'api-version': client.apiVersion } = message);
                if (client.apiKey !== API_KEY) {
                    ws.send('Invalid API key');
                    client.close();
                    return;
                }
                
                client.authenticate();
                clients.add(client);
                console.log('Authenticated user with id: %s, api-version: %s', client.id, client.apiVersion);
                ws.send('Authenticated');
            } catch (error) {
                ws.send('Invalid JSON format');
                client.close();
                return;
            }
        }
        else {
            // Handle the message from the authenticated user here
            if(client.apiVersion === 'v1') {
                try{
                    // check the first word of the message
                    const words = message.toString().split(' ');
                    const command = words[0];
                    if (command === 'subscribe') {
                        for (let i = 1; i < words.length; i++) {
                            client.subscribe(words[i]);
                            subscriptions[words[i]].add(client);
                        }
                        ws.send(`Subscribed to channels: ${words.slice(1).join(', ')}`);
                        var response = {};
                        for (let channel of words.slice(1)) {
                            response[channel] = data[channel];
                        }
                        ws.send(JSON.stringify(response));
                    }
                    else if (command === 'unsubscribe') {
                        for (let i = 1; i < words.length; i++) {
                            client.unsubscribe(words[i]);
                            subscriptions[words[i]].delete(client);
                        }
                        ws.send(`Unsubscribed from channels: ${words.slice(1).join(', ')}`);
                    }
                    else if (command === 'publish') {
                        const publishedData = message.toString().substring(command.length + 1);
                        const dataObj = JSON.parse(publishedData);
                        var clientsToNotify = new Set();
                        for (let key in dataObj) {
                            if (data.hasOwnProperty(key)) {
                                data[key] = dataObj[key];
                            }
                            for (let client of subscriptions[key]) {
                                clientsToNotify.add(client);
                            }
                        }
                        for (let client of clientsToNotify) {
                            client.ws.send(JSON.stringify(dataObj));
                        }
                    }
                    else {
                        ws.send('Invalid command');
                    }
                }
                catch (error) {
                    console.log(error);
                    ws.send('Invalid message format');
                    return;
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection has been closed');
        // Handle the WebSocket connection close event here

        // Clear the timer when the connection is closed
        clearTimeout(client.timer);

        // Remove the client from the set of clients
        clients.delete(client);

        // Remove the client from the subscriptions
        for (let channel of client.subscriptions) {
            subscriptions[channel].delete(client);
        }
    });
});

// Middleware for authentication
const authenticateUser = (req, res, next) => {
    const apiKey = req.headers[API_KEY_HEADER];
    const authorization = req.headers['authorization'];
    console.log("Headers: ", req.headers);

    // Check if the authorization token is present in the headers
    if (authorization) {
        const [type, token] = authorization.split(' ');
        for(let i = 0; i < users.length; i++) {
            let user = users[i];
            if (type === 'Basic' && token === user.token) {
                // User is authenticated, proceed to the next middleware or route handler
                next();
                return;
            }
        }
    }
    // Check if the API key is present in the headers
    if (apiKey && apiKey === API_KEY) {
        // API key is valid, proceed to the next middleware or route handler
        next();
        return;
    }
    else {
        // API key is missing, send a 401 Unauthorized response
        res.status(401).set('WWW-Authenticate', 'Basic').send('Invalid or missing authentication credentials');
    }
};

// Apply the middleware to all routes
app.use(authenticateUser);
app.use(express.json());

// Express routes
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.get('/v1/get/data', (req, res) => {
    res.json(data);
});

app.post('/v1/post/data', (req, res) => {
    body = req.body;
    console.log(body);
    for (let key in body) {
        if (data.hasOwnProperty(key)) {
            data[key] = body[key];
            for (let client of subscriptions[key]) {
                // TODO: Send data as one combined message instead of multiple messages
                client.ws.send(JSON.stringify({ [key]: body[key] }));
            }
        }
    }
    res.send('Data received');
});

app.get('/v1/get/channel', (req, res) => {
    res.json(channels);
});

app.post('/v1/post/channel', (req, res) => {
    body = req.body;
    console.log(body);
    for (let i=0; i<body.length; i++) {
        let item = body[i];
        console.log(item);
        let found = false;
        for (let j=0; j<channels.length; j++) {
            let channel = channels[j];
            if (channel["name"] === item["name"]) {
                channel["type"] = item["type"];
                channel["default"] = item["default"];
                found = true;
                break;
            }
        }
        if (!found) {
            channels.push(item);
        }
        data[item["name"]] = item["default"];

    }
    res.send('Channels updated');
});
