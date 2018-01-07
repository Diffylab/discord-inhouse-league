'use strict';

var Discord = require('discord.js');
var _ = require('lodash');
var trueskill = require('ts-trueskill');
var combinatorics = require('js-combinatorics');

var usersSeed = require('./users.json');
var gamesSeed = require('./games.json');

trueskill.TrueSkill();

var config = require('./config');

var log = console.log;
const key = require("./privates").key;
console.log = function (body) {
    log('[ts=' + new Date().toISOString() + '][message=' + body + ']');
};

var client = new Discord.Client();

var games = {};
var users = {};

// TODO need to get rid of this duplication, find a better way to load matches
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

var loadUsers = function () {
    _
        .each(usersSeed, function (user, key) {
            users[key] = {
                name: user.name,
                rating: new trueskill.Rating(user.mu, user.sigma),
                wins: user.wins,
                losses: user.losses
            }
        });
};
loadUsers();

var loadMatches = function () {
    _
        .each(gamesSeed, function (game, key) {
            var players = _.map(game.playerIds, function (playerId) {
                return users[playerId];
            });
            games[key] = {
                players: players,
                playerIds: game.playerIds
            };
            if (players.length == 6) {
                games[key].match = getClosestMatch(players);
            }
        });
};
loadMatches();

// Load commands here
var commands = {};
commands.user = require('./commands/user.js')(users);
commands.match = require('./commands/match.js')(games, users);
commands.queue = require('./commands/queue.js')(games, users);

client.on('ready', function () {
    console.log('Logged in as ' + client.user.tag);
});

client.on('error', function (err) {
    console.error(err);
});

client.on('message', function (message) {
    if (message.channel.id == '398946565831655424' || message.channel.id == '398934750892392448' || message.channel.id == '398946650514522113' || message.channel.id == '398946603362287643') {
        var regex = /^!ihl (\w+) {0,1}(\w+)? {0,1}(\w+)? {0,1}(\w+)?$/
        var matches = regex.exec(message.content);
        if (matches) {
            console.log(message.author.username + '/' + message.author.id + ': ' + message.content);
            if (!users.hasOwnProperty(message.author.id) && (matches[2] && matches[2] != 'register')) {
                message
                    .channel
                    .send('Please register using `!ihl user register <username>` before trying to use this ' +
                            'bot');
            } else {
                if (matches[1] && matches[1] === 'user') {
                    if (matches[2] && matches[2] === 'register') {
                        commands
                            .user
                            .register(message, matches);
                    } else if (matches[2] && matches[2] === 'list') {
                        commands
                            .user
                            .list(message);
                    } else if (matches[2] && matches[2] === "profile") {
                        commands
                            .user
                            .profile(message, matches);
                    } else {
                        message
                            .channel
                            .send("Please specify a valid 'user' command");
                    }
                } else if (matches[1] && matches[1] === 'match') {
                    if (matches[2] && matches[2] === 'report') {
                        commands
                            .match
                            .report(message, matches);
                        commands
                            .queue
                            .unsetLobby(matches[3]);
                    } else {
                        message
                            .channel
                            .send("Please specify a valid 'match' command");
                    }
                } else if (matches[1] && matches[1] === 'queue') {
                    if (matches[2] && matches[2] === 'join') {
                        commands
                            .queue
                            .join(message, matches);
                    } else if (matches[2] && matches[2] === 'leave') {
                        commands
                            .queue
                            .leave(message, matches);
                    }
                } else {
                    message
                        .channel
                        .send("Please specify a valid command");
                }
            }
        }
        if (message.author.id != '398933581314916362' && message.author.id != '121630407782432769') {
            message.delete();
        }
    }
});

client.login(key);
