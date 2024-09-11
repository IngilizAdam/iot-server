const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');

const PORT = 8080;
const API_KEY = crypto.createHash('sha256').update(fs.readFileSync('./x-api-key.txt', 'utf8').trim()).digest('hex');
const API_KEY_HEADER = 'x-api-key';

const app = express();
const server = app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('A new WebSocket connection has been established');

    ws.on('message', (message) => {
        console.log('Received message:', message);
        // Handle the received message here
    });

    ws.on('close', () => {
        console.log('WebSocket connection has been closed');
        // Handle the WebSocket connection close event here
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

// Express routes
app.get('/', (req, res) => {
    res.send('Hello, World!');
});
