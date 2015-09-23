/**
 * @file 前后端远程联调服务
 * @author songzheng
 * @example
 * jello devserver -d 'd://.jello/www/tmp/' -p 9999
 */
/* jshint -W110 */

'use strict';

var util = require('./lib/util');
var path = require('path');
var child_process = require('child_process');
var exec = child_process.exec;


// 默认 document root 路径
var serverRoot = (function() {
    var key = 'FIS_SERVER_DOCUMENT_ROOT';
    var path;

    if (process.env && process.env[key]) {
        path = process.env[key];

        if (fis.util.exists(path) && !fis.util.isDir(path)) {
            fis.log.error('invalid environment variable [' + key + '] of document root [' + path + ']');
        }

        return path;
    } else {
        return fis.project.getTempPath('www');
    }
})();


exports.name = 'feserver';
exports.usage = '<command> [options]';
exports.desc = 'Launch one HTTP WEB Server: take one directory as context root.';

exports.register = function(commander) {

    commander
        .option('-d, --dir <directory>', 'Directory serve as HTTP WEB Server path. Default: jello www.')
        .option('-p, --port <port>', 'Port of HTTP WEB Server runs on. Default: 8000')
        .action(function() {
            var args = [].slice.call(arguments);
            var options = args.pop();
            var cmd = args.shift();

            var port = options.port || 8000;
            var watchDir = options.dir && path.join(options.dir);

            if (cmd == 'start') {
                // 启动
                if (!watchDir) {
                    watchDir = serverRoot;
                }

                // FeServerPath
                watchDir = fis.util.realpath(watchDir);
                if (watchDir) {
                    fis.log.notice('FeServer Path Watch: ' + watchDir);

                    // 命令路径
                    var serverJSPath = path.join(__dirname, './lib/server.js');
                    var _cmd = 'start node --harmony ' + serverJSPath + ' ' + watchDir + ' ' + port;
                    fis.log.debug('Exec command: ' + _cmd);

                    var pid = exec(_cmd, function(err, stdout, stderr) {
                        if (err) {
                            fis.log.error(err);
                        } else {
                            fis.log.notice('starting...');
                        }
                    });
                } else {
                    fis.log.error('FeServer Path does not existed: ' + watchDir);
                }

            }

            if (cmd == 'stop') {
                // TODO
            }

        });
};
