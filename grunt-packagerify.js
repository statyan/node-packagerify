/*
 * packagerify
 * https://github.com/statyan/node-packagerify
 *
 * Copyright (c) 2016 statyan
 * Licensed under the MIT license.
 */

var Packagerify = require('./packagerify');

module.exports = function(grunt) {
    grunt.registerMultiTask("packagerify", "Creates a package file", function() {
        var packagerify = new Packagerify(this.options);
    });
}
