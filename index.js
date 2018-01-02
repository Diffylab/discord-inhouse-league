'use strict';

var Discord = require('discord.js');
var _ = require('lodash');
var uuidv4 = require('uuid/v4');
var trueskill = require('ts-trueskill');
var combinatorics = require('js-combinatorics');

var seed = require('./seed.json');

trueskill.TrueSkill();

var config = require('./config');
var commands = require('./commands');

var log = console.log;
console.log = function(body) {
    log('[ts=' + new Date().toISOString() + ']' + '[message=' + body + ']');
};

var client = new Discord.Client();

var users = {};

var loadUsers = function() {
    _.each(seed, function(user, key) {
        users[key] = {
            name: user.name,
            rating: new trueskill.Rating(user.mu, user.sigma),
            wins: user.wins,
            losses: user.losses
        }
    });
};
loadUsers();

var saveUsers = function() {
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
    var fs = require('fs');
    fs.writeFile("./seed.json", JSON.stringify(tmp, null, 4), [], function(err) {
        if(err) {
            return console.log(err);
        } else {
            console.log("The file was saved!");
        }
    });
};

var getUsers = function(users) {
    var tmpUsers = [];
    var sortedUsers = _.sortBy(users, function(user) {
        return -1 * user.rating.mu
    });
    _.each(sortedUsers, function(user, index) {
        tmpUsers.push(index + '. ' + user.name + ' - ' + user.rating.mu);
    });
    return tmpUsers;
};

var games = {};

var getClosestMatch = function(players) {
    var indices = [0, 1, 2, 3, 4, 5];
    var combination;
    var combinations = combinatorics.combination(indices, 3); // can change this if you need more players per team
    var matchup = {
        teamA: [players[0], players[1], players[2]],
        teamB: [players[3], players[4], players[5]],
        quality: 0
    };
    while(combination = combinations.next()) {
        var teamA = [players[combination[0]], players[combination[1]], players[combination[2]]];
        var teamARatings = _.map(teamA, function(playerA) {
            return playerA.rating;
        });
        var teamBIds = _.filter(indices, function(index) {
            return combination.indexOf(index) === -1;
        });
        var teamB = [players[teamBIds[0]], players[teamBIds[1]], players[teamBIds[2]]];
        var teamBRatings = _.map(teamB, function(playerB) {
            return playerB.rating;
        });
        var quality = trueskill.quality([teamARatings, teamBRatings])
        if(quality > matchup.quality) { // pick the match with the higest quality
            matchup.teamA = teamA;
            matchup.teamB = teamB;
            matchup.quality = quality;
        }
    };
    // delete matchup.quality;
    return matchup;
};

client.on('ready', function() {
    console.log('Logged in as ' + client.user.tag);
});

client.on('error', function(err) {
    console.error(err);
});

client.on('message', function(message) {
    var regex = /^!ihl (\w+) {0,1}(\w+)? {0,1}(\w+)? {0,1}(\w+)?$/
    var matches = regex.exec(message.content);
    if(matches) {
        console.log(message.author.username + '/' + message.author.id + ': ' + message.content);
        if(!users.hasOwnProperty(message.author.id) && (matches[2] && matches[2] != 'register')) {
            message.channel.send('Please register using `!ihl user register <username>` before trying to use this bot');

        } else {
            if(matches[1] && matches[1] == 'user') {
                if(matches[2] && matches[2] == 'register') {
                    if(matches[3]) {
                        if(users.hasOwnProperty(message.author.id)) {
                            message.channel.send('`' + message.author.id + '` is already registered as ' + users[message.author.id].name);
                        } else {
                            users[message.author.id] = {
                                name: matches[3],
                                rating: new trueskill.Rating(),
                                wins: 0,
                                losses: 0
                            };
                            message.channel.send('Registered user id `' + message.author.id + '` as ' + matches[3]);
                            saveUsers();
                        }
                    } else {
                        // TODO Please set your username
                    }
                } else if(matches[2] && matches[2] == 'list') {
                    message.channel.send('Current users registered are: ```json\n' + JSON.stringify(getUsers(users), null, 4) + '\n```');
                } else {
                    // TODO Please specify a valid `user` command
                }
            } else if(matches[1] && matches[1] == 'match') {
                if(matches[2] && matches[2] == 'create') {
                    var uuid = uuidv4().substring(0, 7);
                    games[uuid] = {
                        players: [],
                        playerIds: []
                    };
                    message.channel.send('New match created, please join with `!ihl match join ' + uuid + '`');
                } else if(matches[2] && matches[2] == 'join') {
                    if(matches[3] && games.hasOwnProperty(matches[3])) {
                        if(games[matches[3]].players.length < 6 && games[matches[3]].playerIds.indexOf(message.author.id) === -1) {
                            games[matches[3]].players.push(users[message.author.id]);
                            games[matches[3]].playerIds.push(message.author.id);
                            if(games[matches[3]].players.length == 6) {
                                var closestMatch = getClosestMatch(games[matches[3]].players);
                                // TODO
                                var teams = {
                                    teamA: _.map(closestMatch.teamA, function(player) {
                                        return player.name;
                                    }),
                                    teamB: _.map(closestMatch.teamB, function(player) {
                                        return player.name;
                                    })
                                };
                                games[matches[3]].match = closestMatch;

                                message.channel.send(
                                    'Match with ID `' + matches[3] + '` is now full\n' +
                                    'Teams are \n```json\n' + JSON.stringify(teams, null, 4) + '\n```' +
                                    'Please report results for the winning team using `!ihl match report ' + matches[3] + ' <teamA|teamB>`'
                                );
                            } else {
                                message.channel.send('Added player ' + users[message.author.id].name + ' to `' + matches[3] + '`. Match currently has ' + games[matches[3]].players.length + ' players');
                            }
                        } else {
                            message.channel.send('Match with ID `' + matches[3] + '` is full, or player is already in game.');
                        }
                    } else {
                        message.channel.send('Match with ID `' + matches[3] + '` not found');
                    }
                } else if(matches[2] && matches[2] == 'report') {
                    if(matches[3] && games.hasOwnProperty(matches[3])) {
                        if(matches[4]) {
                            if(matches[4].toLowerCase() == 'teama') {
                                _.each(games[matches[3]].match.teamA, function(playerA) {
                                    playerA.wins += 1;
                                });
                                _.each(games[matches[3]].match.teamB, function(playerB) {
                                    playerB.losses += 1;
                                });

                                var teamARatings = _.map(games[matches[3]].match.teamA, function(playerA) {
                                    return playerA.rating;
                                });
                                var teamBRatings = _.map(games[matches[3]].match.teamB, function(playerB) {
                                    return playerB.rating;
                                });
                                var [teamARatings, teamBRatings] = trueskill.rate([teamARatings, teamBRatings]);
                                games[matches[3]].match.teamA[0].rating = teamARatings[0];
                                games[matches[3]].match.teamA[1].rating = teamARatings[1];
                                games[matches[3]].match.teamA[2].rating = teamARatings[2];
                                games[matches[3]].match.teamB[0].rating = teamBRatings[0];
                                games[matches[3]].match.teamB[1].rating = teamBRatings[1];
                                games[matches[3]].match.teamB[2].rating = teamBRatings[2];
                                var output = [];
                                var matchPlayers = games[matches[3]].match.teamA.concat(games[matches[3]].match.teamB);
                                var sortedMatchPlayers = _.sortBy(matchPlayers, function(matchPlayer) {
                                    return -1 * matchPlayer.rating.mu;
                                });
                                _.each(sortedMatchPlayers, function(player) {
                                    output.push(player.name + ': ' + player.rating.mu);
                                });
                                delete games[matches[3]];
                                message.channel.send('New ratings after match: `' + matches[3] + '`\n```json\n' + JSON.stringify(output, null, 4) + '\n```');
                                saveUsers();
                            } else if(matches[4].toLowerCase() == 'teamb') {
                                _.each(games[matches[3]].match.teamA, function(playerA) {
                                    playerA.losses += 1;
                                });
                                _.each(games[matches[3]].match.teamB, function(playerB) {
                                    playerB.wins += 1;
                                });

                                var teamARatings = _.map(games[matches[3]].match.teamA, function(playerA) {
                                    return playerA.rating;
                                });
                                var teamBRatings = _.map(games[matches[3]].match.teamB, function(playerB) {
                                    return playerB.rating;
                                });
                                var [teamBRatings, teamARatings] = trueskill.rate([teamBRatings, teamARatings]);
                                games[matches[3]].match.teamA[0].rating = teamARatings[0];
                                games[matches[3]].match.teamA[1].rating = teamARatings[1];
                                games[matches[3]].match.teamA[2].rating = teamARatings[2];
                                games[matches[3]].match.teamB[0].rating = teamBRatings[0];
                                games[matches[3]].match.teamB[1].rating = teamBRatings[1];
                                games[matches[3]].match.teamB[2].rating = teamBRatings[2];
                                var output = [];
                                var matchPlayers = games[matches[3]].match.teamA.concat(games[matches[3]].match.teamB);
                                var sortedMatchPlayers = _.sortBy(matchPlayers, function(matchPlayer) {
                                    return -1 * matchPlayer.rating.mu;
                                });
                                _.each(sortedMatchPlayers, function(player) {
                                    output.push(player.name + ': ' + player.rating.mu);
                                });
                                delete games[matches[3]];
                                message.channel.send('New ratings after match: `' + matches[3] + '`\n```json\n' + JSON.stringify(output, null, 4) + '\n```');
                                saveUsers();
                            } else {
                                message.channel.send('Please specify a valid winning team');
                            }
                        } else {

                        }
                    } else {
                        message.channel.send('Match with ID `' + matches[3] + '` not found');
                    }
                }
            } else {
                // TODO Please specify a valid
            }
        }
    }
});

client.login(config.discord.secret);
