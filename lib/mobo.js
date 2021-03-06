'use strict';

/**
 * This is the main module that makes use of the several submodules.
 *
 * It triggers the generation and upload of the model.
 */

//////////////////////////////////////////
// Requirements                         //
//////////////////////////////////////////

var _                 = require('lodash');
var fs                = require('fs-extra');

var settings          = require('./settings.json');
var buildRegistry     = require('./model/buildRegistry.js');
var generateWikiText  = require('./model/generateWikiText.js');
var buildGraph        = require('./model/buildGraph.js');
var writeExportFiles  = require('./writeExportFiles.js');
var uploadExportFiles = require('./uploadExportFiles.js');

var logger            = require('./logger.js');
var log               = logger.log;


//////////////////////////////////////////
// Variables                            //
//////////////////////////////////////////

var start;

/**
 * Global Log Object. This is used to share logging entries between the different modules
 *
 * @type {Array}
 */
global.moboLogObject = [];


//////////////////////////////////////////
// PROCESSING                           //
//////////////////////////////////////////

/**
 * Reads the /cli.md file and returns it as a string
 * @returns {string}
 */
exports.getHelp = function() {
    return fs.readFileSync(__dirname + '/../cli.md').toString();
};

/**
 * Returns the current version of mobo.
 * The version is defined in the package.json file in the root directory
 *
 * @returns {exports.version|*}
 */
exports.getVersion = function() {
    return require('./../package').version;
};

/**
 * Loads default settings, calculates paths and overwrites them with custom project settings
 *
 * @returns {{}} Settings Object
 */
exports.getSettings = function() {

    start = (new Date()).getTime();
    var cwd = process.cwd();

    // Get and parse Settings
    try {
        var projectSettings = JSON.parse(fs.readFileSync(cwd + '/settings.json').toString());

        // Calculate paths
        settings.cwd = cwd;
        settings.importModelDir = cwd;
        settings.templateDir =  cwd + '/templates/';
        settings.logDir =  cwd + '/_logfiles/';
        settings.processedModelDir = cwd + '/_processed/';

        // Project settings overwrites default settings!
        _.merge(settings, projectSettings);

    } catch(e) {

        if (e.errno && e.errno === 34) {
            log('> [WARNING] No settings.json file found!');
            log('> Use "mobo --init" to create a new project here.');
        } else {
            log('> [ERROR] Could not parse settings.json!');
            log('> Check the settings.json for valid JSON syntax.');
            log(e);
        }

        settings = false;
    }

    return settings;
};

/**
 * Triggers the complete mobo generation process
 *
 * @param {{}}  settings  Settings Object
 */
exports.run = function(settings) {

    logger.clear();

    start = (new Date()).getTime();

    if (settings.generate) {
        exports.generate(settings);
    }

    if (settings.upload || settings.forceUpload) {
        exports.upload(settings);
    }

    logger.report(settings.processedModelDir + '/logfiles/');
};

/**
 * Generates the model from the development model
 *
 * Steps:
 * * Apply inheritance and build an internal registry
 * * Validates the complete development model
 * * Build a graph from the model and its relationships
 * * Generates wikitext from the complete model
 * * Writes the registry (and resulting files) to filesystem
 *
 *  @param {{}}  settings  Settings Object
 */
exports.generate = function(settings) {

    log('');
    log('=========================================================================');

    var registry = buildRegistry(settings);

    // Builds Graph (with further validation)
    if (settings.buildGraph) {
        buildGraph(settings, registry);
    }

    var generated = generateWikiText(settings, registry);

    if (settings.writeExportFiles) {
         writeExportFiles(generated, settings.processedModelDir + '/wikitext/', 'wikitext');
         writeExportFiles(registry.field, settings.processedModelDir + '/json/field/', 'json');
         writeExportFiles(registry.deep, settings.processedModelDir + '/json/model/', 'json');
         writeExportFiles(registry.deepForm, settings.processedModelDir + '/json/form/', 'json');
    }

    var diff = (new Date()).getTime() - start;
    log('> Generation completed in: ' + diff + 'ms.');
    log('-------------------------------------------------------------------------');
};

/**
 * Uploads the resulting wikitext files to an external wiki
 *
 * @param {{}}  settings  Settings Object
 */
exports.upload = function (settings) {
    uploadExportFiles(settings, function() {
        var diff = (new Date()).getTime() - start;
        log('-------------------------------------------------------------------------');
        log('> Time total: ' + diff + 'ms.');
        log('=========================================================================');
    });
};

/**
 * Creates a new model example in the current working directory
 *
 * @param {String}  name       Name of the example. Must match the folder name in /examples/
 */
exports.create = function(name) {

    var fs  = require('fs-extra');
    var cwd = process.cwd();

    var ncp = require('ncp').ncp;
    ncp.limit = 16;

    var currentDir = fs.readdirSync(cwd);

    var installExample = function(name) {
        ncp(__dirname + '/../examples/' + name, cwd, {clobber: false}, function (err) {
            if (err && err.errno !== 47) {
                log(err);
            } else {
                log('> [SUCCESS] Created example "' + name + '" project structure!');
            }
        });
    };

    try {
       fs.readdirSync(__dirname + '/../examples/' + name);
    } catch (e) {
        log('> [ERROR] Example "' + name + '" does not exist.');
        var examples = fs.readdirSync(__dirname + '/../examples/');
        log('> Available examples: ' + examples.join(', '));
        return;
    }

    // Create a new init project structure if current directory is empty
    if (currentDir.length > 0) {
        if (currentDir.indexOf('settings.json') > -1) {
            log('> [INFO] Skipping init: Current directory has already a project structure!');

            // If an example is to be installed, copy those files on top on the init structure
            if (name !== 'init') {
                installExample(name);
            }

        } else {
            log('> [ERROR] Aborting init process: Current directory is not empty!');
        }

    } else {
        ncp(__dirname + '/../examples/init/', cwd, function (err) {
            if (err) {
                return console.error(err);
            } else {
                log('> [SUCCESS] Created initial project structure!');

                // If an example is to be installed, copy those files on top on the init structure
                if (name !== 'init') {
                    installExample(name);
                }
            }
        });
    }

};
