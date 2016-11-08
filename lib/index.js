'use strict';

// Module dependencies
var fs = require('fs');
var glob = require('glob');
var Set = require('collections/set');


// Module exports
exports.validate = validate;

// Some methods are made visible outside only during tests.
if (process.env.NODE_ENV === 'test') {
  exports.fix_options = fix_options;
  exports.verify_i18n_one = verify_i18n_one;
  exports.verify_i18n_all = verify_i18n_all;
}


/**
 * A callback invoked to deal with every time an error message is found.
 * @callback ErrorHandler
 * @param {string} msg An error message.
 */


/**
 * Validates a project.
 *
 * @typedef {Options} options Validation options.
 * @property {string} loc_i18n The location of the JSon files.
 * @property {string} loc_html The location of the HTML files.
 * @property {ErrorHandler} cb An error handler.
 */


/**
 * Validates a project.
 *
 * @param {Options} options Validation options.
 * @return {boolean} true if the project is valid, false otherwise.
 */
function validate(options) {

  options = fix_options(options);
  return internal_validate(options);
}


/**
 * Fixes the validation options.
 *
 * @param {Options} options Validation options.
 * @return {Options} Valid options.
 */
function fix_options(options) {

  if (! options) {
    options = {};
  }

  options.loc_i18n = options.loc_i18n || './src/i18n/';
  if (! options.loc_i18n.match(/.*\/$/)) {
    options.loc_i18n += '/';
  }

  options.loc_html = options.loc_html || './src/**/';
  if (! options.loc_html.match(/.*\/$/)) {
    options.loc_html += '/';
  }

  if (! options.cb) {
    options.cb = console.log;
  }

  return options;
}


/**
 * Validates a project.
 *
 * @param {Options} options Valid options.
 * @return {boolean} true if the project is valid, false otherwise.
 */
function internal_validate(options) {

  var allKeys = [];
  var valid = true;

  // Find all the JSon files and process them
  glob.sync(options.loc_i18n + '*.json').forEach(function(val) {

      // Analyze each file individually
      var content = fs.readFileSync(val).toString();
      var filename = val.replace(options.loc_i18n, '');

      var res = verify_i18n_one(options, content);
      if (res.failure) {
        console.log('There are errors related to i18n in ' + val + '.');
        valid = false;
      }

      var keySet = new Set(res.keys);
      allKeys.push({
        file: filename,
        set: keySet,
        all: res.all
      });
  });

  // If all the files are valid individually, check the global coherence.
  if (valid) {

    // Verify the coherence between all the keys
    if (! verify_i18n_all(allKeys, options)) {
      console.log('There are global errors related to i18n (coherence across all the JSon files).');
      valid = false;
    }

    // Verify the coherence between the keys and the HTML views
    else if (! verify_i18n_in_code(allKeys, options)) {
      console.log('There are global errors related to i18n (coherence between the code and the JSon files).');
      valid = false;
    }
  }

  return valid;
}


/**
 * Verifies the coherence between HTML and JSon files.
 *
 * @param {object} allKeys All the keys that were found in the JSon files.
 * @param {Options} options Valid options.
 * @return {boolean} true if no error was found, false otherwise.
 */
function verify_i18n_in_code(allKeys, options) {

  var failure = false;
  if (allKeys.length > 1) {

    var refKeys = allKeys[0].set;
    glob.sync(options.loc_html + '*.html').forEach(function(val) {
      var content = fs.readFileSync(val).toString();
      var filename = val.replace(options.loc_i18n, '');

      // Do not mix translate directives and filters
      if (content.match(/.*translate\s*=\s*"[^|]*\|\s*translate.*"/g)) {
        failure = output_i18n_error(options.cb, 'Do NOT mix the translate directive and the translate filter. File in error: ' + filename);
      }

      // Verify all the keys are correctly declared in the JSon files
      var keysToVerify = [];
      var patterns = [
                       /translate\s*=\s*"(\S+)"/g,
                       /'(\S+)'\s*\|\s*translate/g
                     ];

      patterns.forEach(function(pattern) {
        var m;
        while ((m = pattern.exec(content))) {
          keysToVerify.push(m[1]);
        }
      });

      keysToVerify.forEach(function(key) {
        if (! refKeys.has(key)) {
          failure = output_i18n_error(options.cb, 'An unknown i18n key is referenced in ' + filename + '. Key name: ' + key);
        }
      });
    });
  }

  return ! failure;
}


/**
 * Verifies the coherence between all the JSon files.
 *
 * @param {object} allKeys All the keys that were found in the JSon files.
 * @param {Options} options Valid options.
 * @return {boolean} true if no error was found, false otherwise.
 */
function verify_i18n_all(allKeys, options) {

  /* jshint loopfunc:true */

  var failure = false;
  if (allKeys.length > 1) {
    var refSet = allKeys[0];
    for (var i = 1; i < allKeys.length; i++) {

      // Verify keys are the same
      var missingKeySet = refSet.set.difference(allKeys[i].set);
      if (missingKeySet.length > 0) {
        missingKeySet.forEach(function(key) {
          failure = output_i18n_error(options.cb, 'Key present in ' + refSet.file + ' is missing in ' + allKeys[i].file + '. Key: ' + key);
        });
      }

      var extraKeySet = allKeys[i].set.difference(refSet.set);
      extraKeySet.forEach(function(key) {
        failure = output_i18n_error(options.cb, 'Extra key present in ' + allKeys[i].file + '. It was not found in ' + refSet.file + '. Key: ' + key);
      });

      // Values must contain the same number of mark-ups
      refSet.set.forEach(function(val) {

        // Find the values to compare
        var refValue = refSet.all[val];
        var cmpValue = allKeys[i].all[val];
        if (! cmpValue) {
          return;
        }

        // Search all the mark-ups in the reference
        var regex = /<([^/>]+)>/g;
        var refMarkups = [];
        var match;
        while ((match = regex.exec(refValue))) {
          refMarkups.push(match[1]);
        }

        // Search all the mark-ups in the items to compare
        while ((match = regex.exec(cmpValue))) {
          var markup = match[1];
          var index = refMarkups.indexOf(markup);

          if (index === -1) {
            failure = output_i18n_error(
                options.cb,
                'A mark-up was found for ' + val + ' in ' + allKeys[i].file +
                ' but it was not found in ' + refSet.file + '. Mark-up: ' + markup);

          } else {
            refMarkups.splice(index, 1);
          }
        }

        // Remaining mark-ups were not found
        refMarkups.forEach(function(markup) {
          failure = output_i18n_error(
              options.cb,
              'A mark-up was expected for ' + val + ' in ' +
              allKeys[i].file + '. See ' + refSet.file + '. Mark-up: ' + markup);
        });
      });
    }
  }

  return ! failure;
}


/**
 * Parses and verifies the content of a given JSon file.
 *
 * @param {Options} options Valid options.
 * @param {string} content The content of a given JSon file.
 * @return {object} An object indicating if errors were found and other information.
 */
function verify_i18n_one(options, content) {

  var lineCpt = 0;
  var failure = false;
  var keyArray = [];
  var keyValues = {};

  // Per-line verifications
  content.split('\n').forEach(function(val) {

    // Increment the line number
    lineCpt++;

    // Trailing spaces
    if (val.match(/.*\s+$/)) {
      failure = output_i18n_error(options.cb, 'Trailing spaces must be removed.', lineCpt);
    }

    // Process other lines
    if (val.trim().length === 0) {
      return;
    }

    // Verify the syntax
    if (val === '{' || val === '}') {
      return;
    }

    var regex = /^\t?"([^"]+)": "([^"]+)",?/;
    if (! val.match(regex)) {
      failure = output_i18n_error(options.cb, 'Lines must match the following pattern: \t"key": "value". ' + val, lineCpt);
      return failure;
    }

    // Keys must be in upper case
    var cpl = regex.exec(val);
    var key = cpl ? cpl[1] : '';
    if (! key.match(/^[A-Z_0-9]+$/)) {
      failure = output_i18n_error(
          options.cb,
          'i18n keys must all be in upper case (with only letters, numbers and underscores). Key: ' + key, lineCpt);
    }

    var value = cpl[2];
    keyValues[key] = value;

    // Keys must be unique
    if (keyArray.indexOf(key) !== -1) {
      failure = output_i18n_error(options.cb, 'Duplicate key: ' + key, lineCpt);
    } else {
      keyArray.push(key);
    }

    // Keys must be sorted alphabetically
    var keyLength = keyArray.length;
    if (keyLength > 1 &&
        0 > key.localeCompare(keyArray[keyLength - 2])) {
      failure = output_i18n_error(options.cb, 'i18n keys must be sorted alphabetically. Key ' + key + ' breaks this rule.', lineCpt);
    }

    // Mark-ups must be closed correctly in values
    var valueCopy = value;
    var valueCopyLength = valueCopy.length;
    do {
      cpl = /<([^/>]+)>/.exec(valueCopy);
      if (! cpl) {
        break;
      }

      var markup = cpl[1];
      if (valueCopy.indexOf('</' + markup + '>') === -1) {
        failure = output_i18n_error(options.cb, 'A HTML tag is not closed correctly. Tag: ' + markup + '. Key: ' + key, lineCpt);
      }

      valueCopyLength = valueCopy.length;
      valueCopy = valueCopy.replace('<' + markup + '>', '');
      valueCopy = valueCopy.replace('</' + markup + '>', '');

    } while (valueCopy.length !== valueCopyLength);

    // Search for closed mark-ups, without opening ones
    cpl = /<\/([^>]+)>/.exec(valueCopy);
    if (!! cpl) {
      failure = output_i18n_error(options.cb, 'A HTML tag has no opening match. Tag: ' + cpl[1] + '. Key: ' + key, lineCpt);
    }
  });

  return {failure: failure, keys: keyArray, all: keyValues};
}


/**
 * Outputs errors.
 *
 * @param {ErrorHandler} cb An error handler.
 * @param {string} msg An error message (required).
 * @param {number} line A line number (optional).
 * @return {boolean} Always true.
 */
function output_i18n_error(cb, msg, line) {

  if (line) {
    cb(line + ': ' + msg);
  } else {
    cb(msg);
  }

  return true;
}