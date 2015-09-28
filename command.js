/**
 * @file 前后端远程联调服务
 * @author songzheng
 * @example
 * jello devserver -d 'd://.jello/www/tmp/' -p 9999
 */
/* jshint -W110, -W098, -W106 */
/* global fis, process */


'use strict';

var path = require('path');
var child_process = require('child_process');
var exec = child_process.exec;
var spawn = child_process.spawn;
var step = require('step');

var _ = require('./util.js');
var util = require('./lib/util');


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


function startServer(opt){

    // FeServerPath
    opt.dir = fis.util.realpath(opt.dir);

    if(opt.name == null){
        // 从缓存中获取
        var tmp = _.getFeName();
        if (fis.util.exists(tmp)) {
            var name = fis.util.fs.readFileSync(tmp, 'utf8').trim();
            opt.name = name || '';
        }else{
            opt.name = '';
        }
    }else{
        // 写入到缓存中
        fis.util.write(_.getFeName(), opt.name);
    }

    if (opt.dir) {
        fis.log.notice('FeServer Path Watch: ' + opt.dir);

        // 命令路径
        var serverJSPath = path.join(__dirname, './lib/server.js');
        var args = [
            '--harmony',
            serverJSPath,
            opt.dir,
            opt.port,
            opt.name
        ];

        var server = spawn('node', args, {
            cwd: __dirname,
            detached: true
        });

        server.stdout.on('data', function(chunk) {
            process.stdout.write(chunk);
        });
        server.stderr.on('data', function(chunk) {
            process.stdout.write(chunk);
        });
        server.on('error', function(err) {
            try {
                process.kill(server.pid, 'SIGKILL');
            } catch (e) {}
            fis.log.error(err);
        });
        process.on('SIGINT', function(code) {
            try {
                process.kill(server.pid, 'SIGKILL');
            } catch (e) {}
        });

        fis.util.write(_.getPidFile(), server.pid);

        options({
            dir:        opt.dir,
            port:       opt.port,
            process:    'node'
        });

    } else {
        fis.log.error('FeServer Path does not existed: ' + opt.dir);
    }

}

function stopServer(){
    var tmp = _.getPidFile();
    var opt = options();
    var done = this;

    if (fis.util.exists(tmp)) {
        var pid = fis.util.fs.readFileSync(tmp, 'utf8').trim();
        var list, msg = '';
        var isWin = fis.util.isWin();

        if (isWin) {
            list = spawn('tasklist');
        } else {
            list = spawn('ps', ['-A']);
        }

        list.stdout.on('data', function(chunk) {
            msg += chunk.toString('utf-8').toLowerCase();
        });

        list.on('exit', function() {
            msg.split(/[\r\n]+/).forEach(function(item) {
                var reg = new RegExp('\\b' + opt['process'] + '\\b', 'i');

                if (reg.test(item)) {
                    var iMatch = item.match(/\d+/);
                    if (iMatch && iMatch[0] == pid) {
                        try {
                            fis.log.notice('FeServer is running, so stop it: \n');
                            fis.log.notice(item);

                            process.kill(pid, 'SIGINT');
                            process.kill(pid, 'SIGKILL');
                        } catch (e) {}
                        fis.log.error('shutdown ' + opt['process'] + ' process [' + iMatch[0] + ']\n');
                        //process.stdout.write('shutdown ' + opt['process'] + ' process [' + iMatch[0] + ']\n');
                    }
                }
            });

            fis.util.fs.unlinkSync(tmp);

            if (done) {
                done(false, opt);
            }
        });

        list.on('error', function(e) {
            if (isWin) {
                fis.log.error('fail to execute `tasklist` command, please add your system path (eg: C:\\Windows\\system32, you should replace `C` with your system disk) in %PATH%');
            } else {
                fis.log.error('fail to execute `ps` command.');
            }
            process.exit(1);
        });

    } else {
        fis.log.notice('FeServer is not running, no need to stop.');
        done && done(false, opt);
    }
}

function options(opt) {
    var tmp = _.getRCFile();

    if (opt) {
        fis.util.write(tmp, JSON.stringify(opt));
    } else {
        if (fis.util.exists(tmp)) {
            opt = fis.util.readJSON(tmp);
        } else {
            opt = {};
        }
    }
    return opt;
}


exports.name = 'feserver';
exports.usage = '<command> [options]';
exports.desc = 'Launch one HTTP WEB Server: take one directory as context root.';

exports.register = function(commander) {

    commander
        .option('-d, --dir <directory>', 'Directory serve as HTTP WEB Server path. Default: jello www.')
        .option('-p, --port <port>', 'Port of HTTP WEB Server runs on. Default: 8000')
        .option('-n, --name <fe username>', 'Record the username of FE author.')
        .action(function() {
            var args = [].slice.call(arguments);
            var options = args.pop();
            var cmd = args.shift();

            options.port = options.port || 8000;
            options.dir  = options.dir ? path.join(options.dir) : serverRoot;

            if (cmd == 'start') {
                // 启动
                step(stopServer, function () {
                    startServer(options);
                });

            }else if (cmd == 'stop') {
                // 停止
                stopServer();
            }else if (cmd == 'restart') {
                // 重启
                step(stopServer, function () {
                    startServer(options);
                });
            }

        });


    // 注册 cmd
    commander
        .command('start')
        .description('start feserver');

    commander
        .command('stop')
        .description('shutdown feserver');

    commander
        .command('restart')
        .description('restart feserver');
};
