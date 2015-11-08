'use strict';


// Core modules
var path = require('path');
var fs = require('fs');

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
var svcServer = require('./svcServer');

// Web路径匹配标准
var webRootPattern = /\/(.*)(\/.*)/;

var app = koa();


var dirWebSite = global.dirWebSite = process.argv[2];
var dirWebSiteView = global.dirWebSiteView = path.join(dirWebSite, 'WEB-INF' + path.sep +  'views');
var dirWebSiteMap = global.dirWebSiteMap = path.join(dirWebSite, 'map');


// body parser
app.use(koaBody());


// LOG
// app.use(koaLogger());
app.use(function* log(next) {
    var requestTimeS = Date.now();

    // 云端会有Root目录，但是本地FE环境没有Root目录
    if(this.request.query['withroot'] === 'true' || this.request.header['withroot'] === 'true'){
        var matchRsut = this.path.match(webRootPattern);
        if(matchRsut && matchRsut[1] && !fs.existsSync(path.join(dirWebSite, matchRsut[1]))) {
            // 如果URL包含了Root，但是Root不存在，则转换路径
            this.path = matchRsut[2];
        }
    }

    // 允许跨域
    this.response.set('Access-Control-Allow-Origin', '*');
    // this.response.set('Connection', 'close');

    yield next;

    var requestTimeE = Date.now();
    console.info('LOG: ', (requestTimeE-requestTimeS) + 'ms', this.path, this.method, this.ip.replace('::ffff:', ''));
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

// 端口
var PORT = process.argv[3] || 8000;
// 前端作者或者提交人
var authorName = process.argv[4];
// 前端环境
var envName = process.argv[5] || '前端FE环境';
// 前端JSON
var jsonDesc = process.argv[6];
// 本机IP地址
var localAddr = process.argv[7];

app.listen(PORT);
console.info('Server is listening at $0: '.replace('$0', PORT));


// Promised Request callback.
var http = 'http://dest.nfe.baidu.com/server/feserver';
var httpData = {
    addr:           siteUtil.chooseLocalAddr(localAddr),
    port:           PORT,
    name:           envName,
    authorName:    authorName,
    serverName:    envName,
    serverDesc:    jsonDesc
};
httpData.domain = 'http://' + httpData.addr + ":" + httpData.port;

// 保存到Server
global.options = httpData;

var httpEncodedData = siteUtil.encode(httpData);
var res;
var def = q.defer();


//console.log('FeServer send data: ', httpData);
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


