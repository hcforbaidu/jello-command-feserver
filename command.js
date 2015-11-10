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
    // FeServerPort
    opt.port = opt.port || 8000;

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
        // 本机地址：true|false|value
        var enableAddrVal = opt.enable_addr && opt.addr;
        var args = [
            '--harmony',
            serverJSPath,
            opt.dir,
            opt.port,
            opt.name,
            opt.env,
            opt.json,
            enableAddrVal
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

        var isAppend = fis.util.exists(_.getPidFile()) ? true : false;
        fis.util.write(_.getPidFile(), server.pid + ',' + opt.port + '\n', 'UTF-8', isAppend);

        options({
            dir:        opt.dir,
            port:       opt.port,
            process:    'node'
        });

    } else {
        fis.log.error('FeServer Path does not existed: ' + opt.dir);
    }

}

function stopServer(userOptions){
    var tmp = _.getPidFile();
    var opt = options();
    var done = this;

    if (fis.util.exists(tmp)) {
        var fileCont = fis.util.fs.readFileSync(tmp, 'utf8').trim();
        var feHash = {};

        fileCont.split('\n').map(function (row) {
            var fields = row.split(',');
            var feItem = {
                pid: fields[0],
                port: fields[1]
            };
            return feItem;
        }).forEach(function (v) {
            feHash[v.pid+''] = v.port;
        });

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
            var processHash = {};
            msg.split(/[\r\n]+/).forEach(function(item) {
                var reg = new RegExp('\\b' + opt['process'] + '\\b', 'i');

                if (reg.test(item)) {
                    var iMatch = item.match(/\d+/);
                    // 1. 没传递且匹配端口大于0；2. 匹配端口等于传递
                    if (iMatch && iMatch[0] && ((!userOptions.port && feHash[iMatch[0]+''] > 0) || (userOptions.port && feHash[iMatch[0]] == userOptions.port))) {
                        var iMatchPid = iMatch[0];
                        try {
                            fis.log.notice('FeServer is running, so stop it: \n');
                            fis.log.notice(item);

                            process.kill(iMatchPid, 'SIGINT');
                            process.kill(iMatchPid, 'SIGKILL');
                            delete feHash[iMatch[0]];
                        } catch (e) {}
                        fis.log.notice('shutdown ' + opt['process'] + ' process [' + iMatch[0] + ']\n');
                        //process.stdout.write('shutdown ' + opt['process'] + ' process [' + iMatch[0] + ']\n');
                    }
                    iMatch && iMatch[0] && (processHash[iMatch[0]] = true);
                }
            });

            // Update
            fis.util.fs.unlinkSync(tmp);
            Object.keys(feHash).forEach(function (k, i) {

                // 如果不存在，则删除掉，不保存
                if(processHash[k] === undefined){
                    delete feHash[k];
                    return;
                }

                var isAppend = i === 0 ? false : true;
                k && fis.util.write(_.getPidFile(), k + ',' + feHash[k] + '\n', 'UTF-8', isAppend);
            });
            Object.keys(feHash).length === 0 && fis.util.del(tmp);

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
        .option('-e, --env <fe env name>', 'Record the environment name of FE.', '前端FE环境')
        .option('-j, --json <fe json desc>', 'Record the SVN code submit info of FE.')
        .option('--enable_addr', 'Enable embedded Local IP into map resources.')
        .option('-a, --addr <IP Address>', 'Embedded Local IP into map resources.', "0")
        .action(function() {
            var args = [].slice.call(arguments);
            var options = args.pop();
            var cmd = args.shift();

            options.dir  = options.dir ? path.join(options.dir) : serverRoot;

            if (cmd == 'start') {
                // 启动
                step(function () {
                    stopServer.call(this, options);
                }, function () {
                    startServer(options);
                });

            }else if (cmd == 'stop') {
                // 停止
                stopServer(options);
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
