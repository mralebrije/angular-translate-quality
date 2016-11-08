'use strict';

process.env.NODE_ENV = 'test';

var assert = require('chai').assert;
var qual = require('../lib/index.js');


describe('Options', function() {

  it('should fix options for empty objects', function() {

    var options = qual.fix_options();
    assert.isNotNull(options);
    assert.equal(options.loc_i18n, './src/i18n/');
    assert.equal(options.loc_html, './src/**/');
    assert.equal(options.cb, console.log);
  });


  it('should fix options for paths without trailing separator', function() {

    var options = qual.fix_options({
      loc_i18n: './src/i18n',
      loc_html: './src/**'
    });

    assert.isNotNull(options);
    assert.equal(options.loc_i18n, './src/i18n/');
    assert.equal(options.loc_html, './src/**/');
    assert.equal(options.cb, console.log);
  });
});