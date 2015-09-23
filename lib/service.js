// Core modules
var path = require('path');
var fs = require('fs');

// Utility
var cofs = require('co-fs');

var moment = require('moment');
var markdown = require('markdown').markdown;


/**
 * Business Logic
 */

module.exports = function* (next) {

    // remove suffix
    var pathname = this.path.replace(/\.html$/, '');

    if(/.*\.vm$/.test(this.path)){
        yield this.render("WEB-INF/views/" + this.path);
    }
};
