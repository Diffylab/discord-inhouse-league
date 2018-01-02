var _ = require('lodash');
var fs = require('fs');

var outputUsers = './users.json';

var exportUsers = function() {
    var tmp = {};
    _.each(users, function(user, key) {
        tmp[key] = {
            name: user.name,
            mu: user.rating.mu,
            sigma: user.rating.sigma,
            wins: user.wins,
            losses: user.losses
        };
    });
    fs.writeFile(outputUsers, JSON.stringify(tmp, null, 4), [], function(err) {
        if(err) {
            return console.log(err);
        } else {
            console.log(outputUsers + ' was saved');
        }
    });
};

module.exports = function(users) {
    var obj = {};

    exportStuff: exportUsers,
    obj.register = function(message, matches) {
        if(matches[3]) {
            if(users.hasOwnProperty(message.author.id)) {
                message.channel.send('`' + message.author.id + '` is already registered as ' + users[message.author.id].name);
                message.delete();
            } else {
                users[message.author.id] = {
                    name: matches[3],
                    rating: new trueskill.Rating(),
                    wins: 0,
                    losses: 0
                };
                message.channel.send('Registered user id `' + message.author.id + '` as ' + matches[3]);
                message.delete();
                exportUsers();
            }
        } else {
            message.channel.send('Please specify a username to register as');
            message.delete();
        }
    };

    obj.list = function(message) {
        var tmpUsers = [];
        var sortedUsers = _.sortBy(users, function(user) {
            return -1 * user.rating.mu
        });
        _.each(sortedUsers, function(user, index) {
            tmpUsers.push(index + '. ' + user.name + ' - ' + Math.floor(100 * user.rating.mu));
        });
        message.channel.send('Current users registered are: ```json\n' + JSON.stringify(tmpUsers, null, 4) + '\n```');
        message.delete();
    };

    return obj;
};
