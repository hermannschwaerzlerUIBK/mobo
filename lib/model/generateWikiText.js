//////////////////////////////////////////
// Requirements                         //
//////////////////////////////////////////

var fs = require('fs-extra');
var _ = require('lodash');

var logger            = require('./../logger.js');
var log               = logger.log;

var parseField = require('./parseField.js');
var parseModel = require('./parseModel.js');
var parseForm = require('./parseForm.js');
var parseQuery = require('./parseQuery.js');


//////////////////////////////////////////
// Variables                            //
//////////////////////////////////////////

var returnObj = {};
var outputStats = {
    property: 0,
    category: 0,
    form: 0,
    template: 0,
    site: 0,
    smw_query: 0
};

//////////////////////////////////////////
// Logic                                //
//////////////////////////////////////////

/**
 * Parses a specific Model Type from JSON Schema to WikiText
 * Uses generator sub-modules
 *
 * @param generator
 * @param data
 */
var callParser = function(settings, generator, data, registry) {

    for (var name in data) {

        var json = data[name];

        if (!json || json == '') {
            log('>>> [NOTICE] File ' + name + ' is empty, will not be parsed!');
        } else {

            var output = generator.exec(settings, json, name, registry);

            for (outputType in output) {

                var name = name.replace('.', '-');

                var fileName = outputType + ':' + name;
                returnObj[fileName] = output[outputType];

                outputStats[outputType] += 1;

            }
        }
    }

};


//////////////////////////////////////////
// Bootstrap                            //
//////////////////////////////////////////

module.exports = function(settings, registry) {


    //////////////////////////////////////////
    // Parse the Model                      //
    //////////////////////////////////////////

    // Get Fields
    _.merge(returnObj, callParser(settings, parseField, registry.field, registry));

    // Get Models
    _.merge(returnObj, callParser(settings, parseModel, registry.deep, registry));

    // Get Forms
    _.merge(returnObj, callParser(settings, parseForm, registry.deepForm, registry));


    //////////////////////////////////////////
    // Parse Queries                        //
    //////////////////////////////////////////

    _.merge(returnObj, callParser(settings, parseQuery, registry.smw_query, registry));


    //////////////////////////////////////////
    // Parse MediaWiki Sites                //
    //////////////////////////////////////////

    // Get / overwrite MediaWiki Templates
    for (var templateName in registry.smw_template) {
        var template = registry.smw_template[templateName];
        var templateSiteName = 'template:' + templateName.replace('.wikitext', '');

        if (returnObj[templateSiteName]) {
            log('>>> [NOTICE] Overwriting Site ' + name + '');
            returnObj[templateSiteName] = template;
        } else {
            returnObj[templateSiteName] = template;
        }

        outputStats.site += 1;
    }

    // Get / overwrite MediaWiki Sites
    for (var siteName in registry.smw_site) {

        var site = registry.smw_site[siteName];
        var newSiteName = siteName.replace('.wikitext', '');
        newSiteName = newSiteName.replace('___', ':');

        if (returnObj[newSiteName]) {
            log('>>> [NOTICE] Overwriting Site ' + name + '');
            returnObj[newSiteName] = site;
        } else {
            returnObj[newSiteName] = site;
        }

        outputStats.site += 1;
    }


    // Write Registry to files
    var header = '// Warning: This file is auto generated!\n';
    var generatedContent = header + 'cbm.wikitext = ' + JSON.stringify(returnObj, null, 4) + ';';
    fs.outputFileSync(settings.processedModelDir + '/_generated.js', generatedContent);
    fs.outputFileSync(settings.processedModelDir + '/_generated.json', JSON.stringify(returnObj, null, 4));

    log('> ' + outputStats.property + ' Properties | '
        + outputStats.template + ' Templates | '
        + outputStats.form + ' Forms | '
        + outputStats.category + ' Categories | '
        + outputStats.site + ' Sites');
    log('-------------------------------------------------------------------------');

    return returnObj;

};