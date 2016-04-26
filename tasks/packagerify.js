/*
 * packagerify
 * https://github.com/statyan/node-packagerify
 *
 * Copyright (c) 2016 statyan
 * Licensed under the MIT license.
 */

var Packagerify = require('./../packagerify');
var path = require('path');

module.exports = function(grunt) {

    grunt.registerMultiTask("packagerify", "Creates a package file", function() {
        var done = this.async();
        try {
            var options = this.options();
            if (!options.packagesFileDir) {
                options.packagesFileDir = '';
            }
            options.packagesFileDir = path.resolve(options.packagesFileDir);
            var packagerify = new Packagerify(options);
        } catch (e) {
            grunt.log.writeln(e);
            done();
        }
    });

}
