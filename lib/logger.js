/* jshint unused: false */

var util   = require('util');
var fs     = require('fs-extra');
var colors = require('colors');
var moment = require('moment');

exports.settings = {
    displayNotices: false
};

/**
 * Sets the settings
 * @param settings
 */
exports.setConfig = function(settings) {
    exports.settings = settings;
};

/**
 * Clears (empties) the log object
 */
exports.clear = function() {
    global.moboLogObject = [];
};

/**
 * Writes the current log object to a file in the given directory
 *
 * @param dir   filepath
 */
exports.report = function(dir) {
    if (dir) {
        var fileName = moment().format("YYYY-MM-DD_HH-mm-ss");
        fs.outputFileSync(dir + fileName + '.json', JSON.stringify(global.moboLogObject, false, 4));
    }
};

/**
 * Returns the global.moboLogObject
 *
 * @returns {Array}
 */
exports.returnLogObject = function() {
    return global.moboLogObject;
};

/**
 * Custom Logging function
 *
 * Writes Logs to console, stringifies objects first
 *
 * @param msg   String or Object
 */
exports.log = function (msg, silent) {

    if (msg === undefined) {
        util.print('>> Invalid Log msg Object!'.red + '\n');

    } else { // Actual Logging

        global.moboLogObject.push(msg);

        if (!silent) {
            // If msg is an object -> convert it to a JSON string
            if (msg !== null && typeof msg === 'object') {
                msg = JSON.stringify(msg, false, 4);
            }

            // Colorize Console Output
            if (msg.indexOf('[WARNING]') > -1) {
                util.print(msg.yellow + '\n');
            } else if (msg.indexOf('[ERROR]') > -1) {
                util.print(msg.red + '\n');
            } else if (msg.indexOf('[SUCCESS]') > -1) {
                util.print(msg.green + '\n');
            } else if (msg.indexOf('[NOTICE]') > -1) {
                if (exports.settings.displayNotices) {
                    util.print(msg.blue + '\n');
                }
            } else if (msg.indexOf('[INFO]') > -1) {
                util.print(msg.blue + '\n');
            } else if (msg.indexOf(' + ') > -1) {
                util.print(msg.green + '\n');
            } else if (msg.indexOf(' - ') > -1) {
                util.print(msg.red + '\n');
            } else if (msg.indexOf(' C ') > -1) {
                util.print(msg.cyan + '\n');
            } else {
                util.print(msg + '\n');
            }

        }

    }

};
