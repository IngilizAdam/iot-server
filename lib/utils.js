module.exports = {
    initData,
    initSubscriptions,
    saveData
};

const fs = require('fs');

function initData() {
    if (fs.existsSync('./database')) {
        if (fs.existsSync('./database/data.json')) {
            data = JSON.parse(fs.readFileSync('./database/data.json', 'utf8'));
        }
        else {
            fs.writeFileSync('./database/data.json', JSON.stringify({}));
        }
    }
    else {
        fs.mkdirSync('./database');
        fs.writeFileSync('./database/data.json', JSON.stringify({}));
    }

    return data;
}

function initSubscriptions(data) {
    let subscriptions = {};
    for (let key in data) {
        console.log(key);
        subscriptions[key] = new Set();
    }
    console.log(subscriptions);

    return subscriptions;
}

function saveData(data) {
    fs.writeFileSync('./database/data.json', JSON.stringify(data));
}