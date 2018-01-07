var _ = require('lodash');
var fs = require('fs');
var trueskill = require('ts-trueskill');

trueskill.TrueSkill();

var outputUsers = './users.json';

module.exports = function (users) {
    var obj = {};

    var exportUsers = function () {
        var tmp = {};
        _.each(users, function (user, key) {
            tmp[key] = {
                name: user.name,
                mu: user.rating.mu,
                sigma: user.rating.sigma,
                wins: user.wins,
                losses: user.losses
            };
        });
        fs.writeFile(outputUsers, JSON.stringify(tmp, null, 4), [], function (err) {
            if (err) {
                return console.log(err);
            } else {
                console.log(outputUsers + ' was saved');
            }
        });
    };

    obj.register = function (message, matches) {
        if (matches[3]) {
            if (users.hasOwnProperty(message.author.id)) {
                message
                    .channel
                    .send('`' + message.author.id + '` is already registered as ' + users[message.author.id].name);
            } else {
                users[message.author.id] = {
                    name: matches[3],
                    rating: new trueskill.Rating(25, 1.618),
                    wins: 0,
                    losses: 0
                };
                message
                    .channel
                    .send('Registered user id `' + message.author.id + '` as ' + matches[3]);
                exportUsers();
            }
        } else {
            message
                .channel
                .send('Please specify a username to register as');
        }
    };

    obj.list = function (message) {
        var tmpUsers = [];
        var count = 0;
        var sortedUsers = _.sortBy(users, function (user) {
            return -1 * user.rating.mu
        });
        _.each(sortedUsers, function (user) {
            if ((user.wins + user.losses) >= 5) {
                if (count === 0) {
                    tmpUsers.push('S. ' + user.name + ' (' + user.wins + '-' + user.losses + ') - ' + Math.floor(100 * user.rating.mu));
                } else {
                    tmpUsers.push(count + '. ' + user.name + ' (' + user.wins + '-' + user.losses + ') - ' + Math.floor(100 * user.rating.mu));
                }
                count += 1;
            }
        });
        message
            .channel
            .send('Top 15 users with 5+ games played are: ```json\n' + JSON.stringify(tmpUsers.slice(0, 15), null, 4) + '\n```');
    };

    obj.profile = function (message, matches) {
        if (matches[3]) {
            let foundUser = {};
            _.each(users, (user) => {
                if (user.name === matches[3]) {
                    foundUser = user;
                }
            });
          
            if (foundUser) {
                message
                    .channel
                    .send("`" + foundUser.name + ' (' + foundUser.wins + '-' + foundUser.losses + ') - ' + Math.floor(100 * foundUser.rating.mu) + "`");

            } else {
                message
                    .channel
                    .send("No found user with registered name " + matches[3]);
            }
        }
    }

    return obj;
};
