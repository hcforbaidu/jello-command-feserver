'use strict';

// Core modules
var path = require('path');
var fs = require('fs');

// Utility
var cofs = require('co-fs');

var koaRouter = require('koa-router')();


var dirWebPack = path.join(__dirname, '..');
var dirWebData = path.join(dirWebPack, 'data');
var dirWebSite = path.join(__dirname, '..', 'public');
var dirWebView = path.join(dirWebSite, 'view');

var responseHelper = {
    success: function (data, info) {
        return {
            code:   0,
            data:   data,
            info:   info || 'success'
        };
    },
    error: function (data, info, code) {
        return {
            code:   code || 1,
            data:   data || {},
            info:   info || 'error'
        };
    }
};


// map下的JSON文件
koaRouter.get('/manage/map', function *() {

    var mapDir = global.dirWebSiteMap;
    var fileList = fs.readdirSync(mapDir);
    var filteredFileList = [];

    // Filter . and ..
    filteredFileList = fileList.filter(function (v) {
        return (v !== '.' && v !== '..') ? true : false;
    });

    //console.info('MAP JSON fileList: ', filteredFileList);
    this.body = responseHelper.success(filteredFileList);
});



module.exports = koaRouter;


