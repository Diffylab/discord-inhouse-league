var fs = require('fs');
var _ = require('lodash');
var uuidv4 = require('uuid/v4');
var trueskill = require('ts-trueskill');
var combinatorics = require('js-combinatorics');

var outputUsers = './users.json';
var outputGames = './games.json';

trueskill.TrueSkill();

let mapList = [
    "Araz Day",
    "Araz Night",
    "Skyring Night",
    "Orman Night",
    "Blackstone Day",
    "Blackstone Night",
    "Dragon Day",
    "Dragon Night"
];

const getMaps = () => {
    mapList = _.shuffle(mapList);
    return `Your maps are
    1: ${mapList[0]}
    2: ${mapList[1]}
    3: ${mapList[2]}`;
}
module.exports = function (games, users) {
    var obj = {};
    var queueIds = [];
    var overflowIds = [];

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

    var exportGames = function () {
        var tmp = {};
        _.each(games, function (game, key) {
            tmp[key] = {};
            if (game.playerIds) {
                tmp[key].playerIds = game.playerIds;
            }
        });
        fs.writeFile(outputGames, JSON.stringify(tmp, null, 4), [], function (err) {
            if (err) {
                return console.log(err);
            } else {
                console.log(outputGames + ' was saved');
            }
        });
    };

    var getUserActiveGame = function (userId) {
        var inGame = null;
        _.each(games, function (game, key) {
            if (game.playerIds.indexOf(userId) !== -1) {
                inGame = key;
            }
        });
        return inGame;
    };

    var userInQueue = function (userId) {
        return queueIds.indexOf(userId) !== -1 || overflowIds.indexOf(userId) !== -1;
    };

    var getQueueDisplayNames = function () {
        return _.map(queueIds, function (userId) {
            return users[userId].name;
        });
    };

    var getQueueUsers = function () {
        return _.map(queueIds, function (userId) {
            return users[userId];
        });
    };

    var mergeOverflow = function () {
        if (queueIds.length < 6) {
            if (overflowIds.length > 0) {
                var spaceInQueue = 6 - queueIds.length;
                queueIds = queueIds.concat(overflowIds.splice(0, spaceInQueue));
            }
        }
    };

    var getClosestMatch = function (players) {
        var indices = [
            0,
            1,
            2,
            3,
            4,
            5
        ];
        var combination;
        var combinations = combinatorics.combination(indices, 3); // can change this if you need more players per team
        var matchup = {
            teamA: [
                players[0], players[1], players[2]
            ],
            teamB: [
                players[3], players[4], players[5]
            ],
            quality: 0
        };
        while (combination = combinations.next()) {
            var teamA = [
                players[combination[0]],
                players[combination[1]],
                players[combination[2]]
            ];
            var teamARatings = _.map(teamA, function (playerA) {
                return playerA.rating;
            });
            var teamBIds = _.filter(indices, function (index) {
                return combination.indexOf(index) === -1;
            });
            var teamB = [
                players[teamBIds[0]],
                players[teamBIds[1]],
                players[teamBIds[2]]
            ];
            var teamBRatings = _.map(teamB, function (playerB) {
                return playerB.rating;
            });
            var quality = trueskill.quality([teamARatings, teamBRatings])
            if (quality > matchup.quality) { // pick the match with the higest quality
                matchup.teamA = teamA;
                matchup.teamB = teamB;
                matchup.quality = quality;
            }
        };
        // delete matchup.quality;
        return matchup;
    };

    obj.join = function (message, matches) {
        if (!userInQueue(message.author.id)) {
            var userActiveGame = getUserActiveGame(message.author.id);
            if (!userActiveGame) {
                mergeOverflow(); // need to start cleaning out the overflow queue before adding in new users
                if (queueIds.length < 6) {
                    queueIds.push(message.author.id);
                    message
                        .channel
                        .send('Added ' + users[message.author.id].name + ' to queue. Queue currently has ' + queueIds.length + ' players');
                    if (queueIds.length == 6) {
                        message
                            .channel
                            .send('Queue is now full, creating a match and clearing the queue');
                        var closestMatch = getClosestMatch(getQueueUsers());
                        var teams = {
                            teamA: _.map(closestMatch.teamA, function (player) {
                                return player.name;
                            }),
                            teamB: _.map(closestMatch.teamB, function (player) {
                                return player.name;
                            })
                        };
                        var uuid = uuidv4().substring(0, 7);
                        games[uuid] = {
                            players: getQueueUsers(),
                            playerIds: queueIds.slice() // create a copy of the array
                        };
                        games[uuid].match = closestMatch;
                        queueIds = [];
                        mergeOverflow(); // need to start cleaning out the overflow queue before adding in new users

                        let selectedMaps = message
                            .channel
                            .send('New match created with ID `' + uuid + '` created\nTeams are \n```json\n' + JSON.stringify(teams, null, 4) + '\n```\n Your selected maps are ' + getMaps() + 'Please report results for the winning team using `!ihl match report ' + uuid + ' <teamA|teamB>`');
                        exportGames();
                    } else {
                        // Don't need to do anything here
                    }
                } else {
                    console.log('Adding user ' + message.user.id + ' to overflow queue while previous match is created. You will be moved to the mai' +
                            'n queue shortly.');
                    overflowIds.push(message.user.id);
                    message
                        .channel
                        .send('Added ' + users[message.author.id].name + ' to overflow queue while previous match is created. You will be moved to the mai' +
                                'n queue shortly.');
                }
            } else {
                message
                    .channel
                    .send(users[message.author.id].name + ' is already in a match with ID `' + userActiveGame + '`');
            }
        } else {
            message
                .channel
                .send(users[message.author.id].name + ' is already in queue');
        }
    };

    obj.leave = function (message, matches) {
        var queueId = queueIds.indexOf(message.author.id);
        var overflowId = overflowIds.indexOf(message.author.id);

        if (queueId !== -1 || overflowId !== -1) {
            if (queueId !== -1) {
                queueIds.splice(queueId, 1);
            }
            if (overflowId !== -1) {
                overflowIds.splice(queueId, 1);
            }
            message
                .channel
                .send(users[message.author.id].name + ' removed from queue, there are ' + queueIds.length + " players in queue");
        } else {
            message
                .channel
                .send(users[message.author.id].name + ' cannot be removed from queue as they are not queued');
        }

    };

    return obj;
};
