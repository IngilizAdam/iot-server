module.exports = {
    initData,
    initSubscriptions,
    saveData
};

const fs = require('fs');

function initData() {
    var data = {};
    var channels = [];

    if (fs.existsSync('./database')) {
        if(fs.existsSync('./database/channels.json')) {
            channels = JSON.parse(fs.readFileSync('./database/channels.json', 'utf8'));
            for (let i = 0; i < channels.length; i++) {
                data[channels[i]["name"]] = channels[i]["default"];
            }

            if (fs.existsSync('./database/data.json')) {
                updateData = JSON.parse(fs.readFileSync('./database/data.json', 'utf8'));
                for (let key in updateData) {
                    if(data.hasOwnProperty(key)){
                        data[key] = updateData[key];
                    }
                }
            }

            fs.writeFileSync('./database/data.json', JSON.stringify(data));
        }
        else {
            if (fs.existsSync('./database/data.json')) {
                data = JSON.parse(fs.readFileSync('./database/data.json', 'utf8'));
                for (let key in data) {
                    var newChannel = {};
                    newChannel["name"] = key;
                    newChannel["type"] = data[key].constructor.name.toLowerCase();
                    newChannel["default"] = data[key];
                    channels.push(newChannel);
                }
                fs.writeFileSync('./database/channels.json', JSON.stringify(channels));
            }
            else {
                fs.writeFileSync('./database/data.json', JSON.stringify({}));
                fs.writeFileSync('./database/channels.json', JSON.stringify([]));
            }
        }
    }
    else {
        fs.mkdirSync('./database');
        fs.writeFileSync('./database/channels.json', JSON.stringify([]));
        fs.writeFileSync('./database/data.json', JSON.stringify({}));
    }

    return [data, channels];
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

function saveData(data, channels) {
    console.log("%s %s", data, channels);
    fs.writeFileSync('./database/data.json', JSON.stringify(data));
    fs.writeFileSync('./database/channels.json', JSON.stringify(channels));
}
