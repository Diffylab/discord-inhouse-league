var fs = require('fs');
var _ = require('lodash');
var uuidv4 = require('uuid/v4');
var trueskill = require('ts-trueskill');
var combinatorics = require('js-combinatorics');

var outputUsers = './users.json';
var outputGames = './games.json';

module.exports = function(games, users) {
    var obj = {};

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

    var exportGames = function() {
        var tmp = {};
        _.each(games, function(game, key) {
            tmp[key] = {};
            if(game.playerIds) {
                tmp[key].playerIds = game.playerIds;
            }
        });
        console.dir(games);
        console.dir(tmp);
        fs.writeFile(outputGames, JSON.stringify(tmp, null, 4), [], function(err) {
            if(err) {
                return console.log(err);
            } else {
                console.log(outputGames + ' was saved');
            }
        });
    };

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

    obj.create = function(message) {
        var uuid = uuidv4().substring(0, 7);
        games[uuid] = {
            players: [],
            playerIds: []
        };
        message.channel.send('New match created, please join with `!ihl match join ' + uuid + '`');
        exportGames();
        message.delete();
    };

    obj.join = function(message, matches) {
        if(matches[3] && games.hasOwnProperty(matches[3])) {
            if(games[matches[3]].players.length < 6 && games[matches[3]].playerIds.indexOf(message.author.id) === -1) {
                games[matches[3]].players.push(users[message.author.id]);
                games[matches[3]].playerIds.push(message.author.id);
                games[matches[3]].players.push(users[message.author.id]);
                games[matches[3]].playerIds.push(message.author.id);
                games[matches[3]].players.push(users[message.author.id]);
                games[matches[3]].playerIds.push(message.author.id);
                games[matches[3]].players.push(users[message.author.id]);
                games[matches[3]].playerIds.push(message.author.id);
                games[matches[3]].players.push(users[message.author.id]);
                games[matches[3]].playerIds.push(message.author.id);
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
                    exportGames();
                    message.delete();
                } else {
                    message.channel.send('Added player ' + users[message.author.id].name + ' to `' + matches[3] + '`. Match currently has ' + games[matches[3]].players.length + ' players');
                    exportGames();
                    message.delete();
                }
            } else {
                message.channel.send('Match with ID `' + matches[3] + '` is full, or player is already in game.');
                message.delete();
            }
        } else {
            message.channel.send('Match with ID `' + matches[3] + '` not found');
            message.delete();
        }
    };

    obj.report = function(message, matches) {
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
                    message.channel.send('Updated results for match ID `' + matches[3] + '`');
                    message.delete();
                    exportUsers();
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
                        output.push(player.name + ' - ' + Math.floor(100 * player.rating.mu));
                    });
                    delete games[matches[3]];
                    message.channel.send('Updated results for match ID `' + matches[3] + '`');
                    message.delete();
                    exportUsers();
                } else {
                    message.channel.send('Please specify a valid winning team');
                    message.delete();
                }
            } else {
                message.channel.send('Please specify a winning team');
                message.delete();
            }
        } else {
            message.channel.send('Match with ID `' + matches[3] + '` not found');
            message.delete();
        }
    };

    return obj;
};
