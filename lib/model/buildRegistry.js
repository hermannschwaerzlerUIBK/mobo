//////////////////////////////////////////
// Requirements                         //
//////////////////////////////////////////

var fs                  = require('fs-extra');
var _                   = require('lodash');

var logger              = require('../logger.js');
var log                 = logger.log;

var getDirectoryContent = require('../getDirectoryContent.js');

//////////////////////////////////////////
// Variables                            //
//////////////////////////////////////////

var registry = {};

/**
 * Stores the JSON model into an internal registry object.
 * Additionally a "deep" registry is built that has all inheritances resolved
 * The registry will be written to
 *
 * @param settings
 * @returns {{}}
 */
module.exports = function(settings) {

    // Fill Registry
    registry.field = getDirectoryContent(settings.importModelDir + '/field/');
    registry.model = getDirectoryContent(settings.importModelDir + '/model/');
    registry.form = getDirectoryContent(settings.importModelDir + '/form/');
    registry.smw_template = getDirectoryContent(settings.importModelDir + '/smw_template/');
    registry.smw_query = getDirectoryContent(settings.importModelDir + '/smw_query/');
    registry.smw_site = getDirectoryContent(settings.importModelDir + '/smw_site/');

    registry.deep = exports.buildDeepRegistry(registry);
    registry.deepForm = exports.buildDeepForms(registry);

    // Write Registry to file
    fs.outputFileSync(settings.processedModelDir + '/_registry.json', JSON.stringify(registry, null, 4));

    return registry;
};

/**
 * Builds a deep registry containing all models with all external refs included and inherited
 *
 * @param registry
 * @returns {{}}
 */
exports.buildDeepRegistry = function(registry) {

    var model;

    //////////////////////////////////////////
    // Build Full Referenced Registry       //
    //////////////////////////////////////////

    // Make deep clone of models
    var deepRegistry = _.cloneDeep(registry.model);

    // Resolve all Models in the Deep Registry
    for (var modelName in deepRegistry) {
        model = deepRegistry[modelName];
        exports.inherit(model);
        exports.order(model);
    }

    // CleanUp / Post-Processing
    for (modelName in deepRegistry) {

        model = deepRegistry[modelName];

        if (model.abstract) {
            delete deepRegistry[modelName];
        }

        model["$schema"] = "http://json-schema.org/draft-04/schema#";
    }

    return deepRegistry;

};

/**
 * Builds a deep Form Registry, based on deep model
 *
 * @param registry
 * @returns {{}}
 */
exports.buildDeepForms = function(registry) {

    var deepForm = {};

    for (var formName in registry.form) {

        var form = registry.form[formName];

        deepForm[formName] = _.cloneDeep(form);
        deepForm[formName].id = formName;

        for (var propertyName in form.properties) {

            var property = form.properties[propertyName];
            var refArray = [];
            var name;

            if (property.$extend) {

                refArray = property.$extend.split('/');

                if (refArray[1] === 'smw_template') {
                    name = refArray[refArray.length - 1].replace('.wikitext', '');

                    deepForm[formName].properties[name] = property;

                    deepForm[formName].properties[propertyName].id = name;
                    deepForm[formName].properties[propertyName].type = "string";
                    deepForm[formName].properties[propertyName].format = property.$extend;
                    deepForm[formName].properties[propertyName].template = registry.smw_template[refArray[2]];

                } else {
                    name = refArray[refArray.length - 1].replace('.json', '');
                    deepForm[formName].properties[propertyName] = registry.deep[name];
                }

            } else if (property.items && property.items.$extend) {
                refArray = property.items.$extend.split('/');
                name = refArray[2].replace('.json', '');
                deepForm[formName].properties[propertyName].items = registry.deep[name];

            } else if (property.wikitext) {
                // Ignore, wikitext is used just for form display
            } else {
                log(property, false);
                log('>>> [WARNING] Form "' + formName + '" is missing its $extend attributes!');
            }
        }

    }

    return deepForm;

};

/**
 * Recursive Function that looks for $extends and resolves them
 * Warning: Does not support circular Structures! Will run forever.
 *
 * @param model
 */
exports.inherit = function(model) {

    // Model inheritance should be implemented via allOf[] !
    // Field inheritance may be implemented through a simple $extend
    if (model.$extend || model.allOf) {

        var refArray = [];

        if (model.allOf) {
            refArray = model.allOf;
        }

        if (model.$extend) {
            refArray.push(model.$extend);
        }

        if (model.$extend) {
            refArray.push(model.$extend);
        }

        for (var i = 0; i < refArray.length; i++) {
            exports.replaceRef(model, refArray[i].$extend);
        }
    }

    // Merge Fields into Models
    if (model.properties) {
        for (var attrName in model.properties) {
            exports.inherit(model.properties[attrName]);
        }
    }

    // Special Case: Handle Array Items
    if (model.items) {
        exports.inherit(model.items);
    }

    // Special SMW Case: Include SMW Templates
//    if (model.smw_template) {
//        model.smw_template = registry.smw_template[model.smw_template];
//    }
};

/**
 * Merges fetched content of $extend tag with own content
 * Helper Function
 *
 * @param obj
 * @param $extend
 */
exports.replaceRef = function(obj, $extend) {

    if (obj.$extend || $extend) {

        var refArray = [];

        if ($extend) {
            refArray = $extend.split('/');
        } else {
            refArray = obj.$extend.split('/');
        }

        var type = refArray[1];
        var name = refArray[refArray.length - 1].replace('.json', '');

        var reference = registry[type][name];

        // Inheritance
        var mergeObject = _.cloneDeep(reference);
        _.merge(mergeObject, obj);
        _.merge(obj, mergeObject);

        obj.$reference = obj.$extend || $extend;

        // Cleanup
        if (obj.$extend) { delete obj.$extend; }
        if (obj.allOf) { delete obj.allOf; }
        if (obj.$schema) { delete obj.$schema; }

    }
};


/**
 * Orders Model Properties by propertyOrder Array
 *
 * Properties which aren't given in the array are positioned at the bottom
 *
 * @param model
 */
exports.order = function(model) {

    if (model.properties && model.propertyOrder) {

        var newOrder = {};

        for (var i = 0; i < model.propertyOrder.length; i++) {

            var propertyName = model.propertyOrder[i];
            newOrder[propertyName] = model.properties[propertyName];
        }

        _.merge(newOrder, model.properties);

        model.properties = newOrder;
    }

};
