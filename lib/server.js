'use strict';


// Core modules
var path = require('path');


var koa = require('koa');


// Middle wares
var favicon = require('koa-favicon');
var serve = require('koa-static');
var koaLogger = require('koa-logger');
var staticCache = require('koa-static-cache');
var conditional = require('koa-conditional-get');
var etag = require('koa-etag');
var compress = require('koa-compress');
var koaBody = require('koa-body');

var views = require('koa-views');
var swig = require('swig');

var koaRouter = require('koa-router')();

// Common
var request = require('request');
var q = require('q');


// SiteUtil
var siteUtil = require('./util');

// Business Logic
var service = require('./service');

// Business Logic
var svcServer = require('./svcServer');


var app = koa();


var dirWebSite = global.dirWebSite = process.argv[2];
var dirWebSiteView = global.dirWebSiteView = path.join(dirWebSite, 'WEB-INF' + path.sep +  'views');
var dirWebSiteMap = global.dirWebSiteMap = path.join(dirWebSite, 'map');


// body parser
app.use(koaBody());


// LOG
// app.use(koaLogger());
app.use(function* log(next) {
    console.info('LOG: Request: ', this.path, this.method, this.ip);

    // 允许跨域
    this.response.set('Access-Control-Allow-Origin', '*');

    yield next;
});


/*// Compression
app.use(compress({
    threshold: 1024,
    flush: require('zlib').Z_SYNC_FLUSH
}));


// ETag, condition
app.use(conditional());
app.use(etag());


// Cache
app.use(staticCache(dirWebSite, {
    maxAge: 365 * 24 * 60 * 60
}));*/


// Render setting
//app.use(views(dirWebSite + '/view', {
//    // default extension
//    default: 'html',
//    // template location
//    root: dirWebSite + '/view',
//    map: {
//        html: 'swig'
//    }
//}));


// favicon
//app.use(favicon(dirWebSite + '/favicon.ico'));


// Static
app.use(serve(dirWebSite));
app.use(serve(dirWebSiteView));


// Render
//app.use(service);

// koaRouter
app.use(koaRouter.allowedMethods());

app.use(svcServer.routes());



app.on('error', function (err, ctx) {
    console.error('Server Error: ', err, ctx);
});

var PORT = process.argv[3] || 80;

app.listen(PORT);
console.info('Server is listening at $0: '.replace('$0', PORT));


// Promised Request callback.
var http = 'http://nfe.baidu.com:8001/server/feserver';
var httpData = {
    port:     PORT,
    name:     '前端FE环境'
};
var httpEncodedData = siteUtil.encode(httpData);
var res;
var def = q.defer();

request({
    url:         http,
    method:     'POST',
    form:       httpEncodedData
}, function(err, httpResponse, body){
    var msg;
    if(err){
        // 错误模板
        msg = 'Failed to register FeServer[$0].'.replace('$0', http);
        console.error(msg, err, body);
        res = err;
    }else{
        msg = 'Succeed to register FeServer[$0].'.replace('$0', http);
        console.info(msg);
        res = body;
    }
    def.resolve(res);
});
//this.body = yield def.promise;

