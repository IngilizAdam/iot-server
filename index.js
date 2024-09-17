const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const utils = require('./lib/utils.js');
const Client = require('./lib/client.js');

const PORT = 8080;
const API_KEY = fs.readFileSync('./x-api-key.txt', 'utf8').trim();
const API_KEY_HEADER = 'x-api-key';
const SAVE_DATA_INTERVAL = 5000; // 5 seconds

var data = utils.initData();
var subscriptions = utils.initSubscriptions(data);
var clients = new Set();

setInterval(() => {
    utils.saveData(data);
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
                            client.subscriptions.add(words[i]);
                            subscriptions[words[i]].add(client);
                        }
                        ws.send(`Subscribed to channels: ${words.slice(1).join(', ')}`);
                    }
                    else if (command === 'unsubscribe') {
                        
                    }
                    else if (command === 'publish') {
                        
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
    });
});

// Middleware for API key authentication
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers[API_KEY_HEADER];

    // Check if the API key is valid
    if (apiKey === API_KEY) {
        // API key is valid, proceed to the next middleware or route handler
        next();
    } else {
        // API key is invalid, send a 401 Unauthorized response
        res.status(401).json({ error: 'Invalid API key' });
    }
};

// Apply the middleware to all routes
app.use(authenticateApiKey);
app.use(express.json());

// Express routes
app.get('/', (req, res) => {
    res.send('Hello, World!');
    //print all headers
    console.log(req.headers);
});

app.get('/v1/get/data', (req, res) => {
    res.json(data);
});

app.post('/v1/post', (req, res) => {
    body = req.body;
    console.log(body);
    res.send('Data received');
});
