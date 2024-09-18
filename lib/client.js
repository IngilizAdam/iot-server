const AUTHENTICATION_TIMEOUT = 30000; // 30 seconds

class Client {
    constructor(ws) {
        this.id = null;
        this.apiKey = null;
        this.apiVersion = null;
        this.subscriptions = new Set();
        this.authenticated = false;
        this.ws = ws;

        // Set a timer to close the connection if the client doesn't authenticate within the timeout period
        this.timer = setTimeout(() => {
            ws.close(); // Close the WebSocket connection
            console.log('WebSocket connection has been closed due to inactivity');
        }, AUTHENTICATION_TIMEOUT);
    }

    authenticate() {
        clearTimeout(this.timer);
        this.authenticated = true;
    }

    subscribe(channel) {
        this.subscriptions.add(channel);
    }

    unsubscribe(channel) {
        this.subscriptions.delete(channel);
    }

    close() {
        clearTimeout(this.timer);
        this.ws.close();
    }
}

module.exports = Client;