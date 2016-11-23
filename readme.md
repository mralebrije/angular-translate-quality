# Angular-Translate Quality

[![Build Status](https://travis-ci.org/linagora/angular-translate-quality.svg?branch=master)](https://travis-ci.org/linagora/angular-translate-quality)
[![Coverage Status](https://coveralls.io/repos/github/linagora/angular-translate-quality/badge.svg?branch=master)](https://coveralls.io/github/linagora/angular-translate-quality?branch=master)
[![NPM](https://img.shields.io/badge/download-NPM-blue.svg)](https://www.npmjs.com/package/angular-translate-quality)

This library allows to verify the correctness of angular-translate elements.  
Angular-translate is an Angular library to manage internationalization through JSon
files and keys in HTML views. Each language is managed in its own JSon file.

This library allows to check that...

* ... a key is declared only once in a JSon file (no duplicate).
* ... a key is declared in upper case.
* ... there is no trailing space in the JSon files (reduce the size).
* ... keys are sorted alphabetically (ease the search for a specific key).
* ... values that contain HTML mark-ups are closed correctly.
* ... values do not contain forbidden patterns (to ban words, check typography, etc).
* ... all the JSon files have the same keys (no missing key).
* ... all the equivalent values (across all the JSon files) have the same number of HTML mark-ups.
* ... all the HTML files reference a key that was declared in the JSon files.
* ... no HTML file mixes the *translate* directive and the *translate* filter.
* ... all the **alt** and **title** attributes are translated in HTML files.
* ... all the mark-ups texts are translated in HTML files.
* ... all the Angular texts (`{{ 'some text' }}`) are translated in HTML files.
* ... all the i18n keys are used somewhere in the HTML files.

This library does not support...

* ... keys declared in Javascript code (only in JSon files).
* ... namespaces in JSon files (at least, not for the moment).


## Options

* **options.loc_i18n**: the location of the JSon files. Default is `./src/i18n/`.
* **options.loc_html**: the location of the JSon files. Default is `./src/**/`.
* **options.cb**: a callback function to handle error messages. Default is `console.log`.
* **options.forbidden_patterns**: a set of forbidden patterns in values. Default is `{}`.
* **options.check_html**: `true` to search non-translated text in HTML mark-ups and attributes, `false otherwise`.  
Default is `true`. All the mark-ups are verified. About attributes, only **alt** and **title** are verified.


## Usage

Add the dependency in your file.

```
npm install angular-translate-quality --save-dev
```

```js
var qual = require('angular-translate-quality');
var valid = qual.validate();
```

... or with other options...

```js
var qual = require('angular-translate-quality');

function cb(msg) {
  console.log(msg);
}

var valid = qual.validate({
  loc_i18n: './i18n/**/',
  loc_html: './html/**/',
  cb: cb
});
```


## Forbidden Patterns

Forbidden patterns is an option to ban words or verify typography in translated text (values in JSon files).  
Each JSon file can have its own patterns.

In this example, we assume we have **en.json**, **fr.json** and **it.json** files.  
We only define forbidden patterns in **en.json** and **fr.json**.

```js
var options = {
      forbidden_patterns: {} 
};

options.forbidden_patterns.en = [
  {regex: '\\s+:', msg: 'Colons cannot be preceded by a white space character.'},
  {regex: 'banned', sensitive: true, msg: '"banned" is a forbidden key word.'}
];

options.forbidden_patterns.fr = [
  {regex: '\\s,', msg: 'Une virgule s\'écrit sans espace avant.'},
  {regex: ',([^ ]| {2,})', msg: 'Une virgule s\'écrit avec un seul espace après.'},
  {regex: '^[a-z]', sensitive: true, msg: 'Une phrase commence avec une majuscule.'}
];
```

The structure of this option is the following.

* Object keys: name of a JSon file, without the *.json* extension. `en.json` => `en`
* Object values: array of objects.

Each object with the following properties.

* **regex**: a regular expression that should output an error when found.
* **sensitive**: true if the pattern search should be case-sensitive (default: false, i.e. case insensitive).
* **msg**: the message to display when the regular expression was found in a value.


## Example with Gulp

```js
var qual = require('angular-translate-quality');
var gutil = require('gulp-util');

gulp.task('check_i18n', function() {

  var res = qual.validate();
  if (! res) {
    throw new gutil.PluginError({
      plugin: 'check_i18n',
      message: 'Errors were found about internationalization.'
    });
  }
});
```

To run checks then, just execute **gulp check_i18n**.


## License

This package is licensed under the terms of the MIT license.


## Changing the Version

Simply update the version in the **package.json** file.  
Then, commit and push your change to the Git repository, before running the release command.


## Developers

* Initialize: `npm install`
* Test: `gulp test`
* Send coverage report to Coveralls: `gulp coveralls` 
* Lint check: `gulp lint`
* [Release](https://www.npmjs.com/~linagora): `gulp complete-release`
* [Local build](http://podefr.tumblr.com/post/30488475488/locally-test-your-npm-modules-without-publishing): `npm pack`

For Linagora folks, releases to [our NPM repository](https://www.npmjs.com/~linagora) are managed through our Jenkins server.  
Please, log into it and run the **angular-translate-quality-release** job.
