/*global require*/
var _ = require('lodash');
var winston = require('winston');
var path = require('path');
var baseDir = path.resolve(__dirname, '..');

// SETUP WINSTON LOGGER
var container = new winston.Container();
container.add("exception", {
    console: {
        handleExceptions: true,
        timestamp: true,
        label: "EXCEPTION",
        colorize: true
    }
});
container.get("exception").exitOnError = false;
var keys = [];

module.exports = function(filename) {
    var label = path.relative(baseDir, filename);
    if (!_.contains(keys, label)) {
        container.add(label, {
            console: {
                handleExceptions: false,
                level: 'debug',
                timestamp: true,
                label: label,
                colorize: true
            }
        });
        keys.push(label);
    }
    var logger = container.get(label);
    logger.exitOnError = false;
    return logger;
};