#!/usr/bin/env node

'use strict';

/* eslint-disable no-shadow, no-console */

const fs = require('fs');
const net = require('net');
const debug = require('debug')('webpack-dev-server');
const importLocal = require('import-local');
const yargs = require('yargs');
const webpack = require('webpack');
const Server = require('../lib/Server');
const setupExitSignals = require('../lib/utils/setupExitSignals');
const colors = require('../lib/utils/colors');
const processOptions = require('../lib/utils/processOptions');
const createLogger = require('../lib/utils/createLogger');
const getVersions = require('../lib/utils/getVersions');
const options = require('./options');

let server;
const serverData = {
  server: null,
};
// we must pass an object that contains the server object as a property so that
// we can update this server property later, and setupExitSignals will be able to
// recognize that the server has been instantiated, because we will set
// serverData.server to the new server object.
// 监听终止进程的事件，以便成功退出服务器子进程
setupExitSignals(serverData);

// Prefer the local installation of webpack-dev-server
// 如果本地装了 webpack-dev-server，则使用本地安装包
if (importLocal(__filename)) {
  debug('Using local install of webpack-dev-server');

  return;
}

try {
  // 此方法只是测试一下 webpack-cli 是否安装了，并不会加载该模块
  require.resolve('webpack-cli');
} catch (err) {
  // 没有安装则打印文字提示安装
  console.error('The CLI moved into a separate package: webpack-cli');
  console.error(
    "Please install 'webpack-cli' in addition to webpack itself to use the CLI"
  );
  console.error('-> When using npm: npm i -D webpack-cli');
  console.error('-> When using yarn: yarn add -D webpack-cli');

  process.exitCode = 1;
}

// 显示用法
yargs.usage(
  `${getVersions()}\nUsage:  https://webpack.js.org/configuration/dev-server/`
);

// webpack-cli@3.3 path : 'webpack-cli/bin/config/config-yargs'
let configYargsPath;
try {
  require.resolve('webpack-cli/bin/config/config-yargs');
  configYargsPath = 'webpack-cli/bin/config/config-yargs';
} catch (e) {
  configYargsPath = 'webpack-cli/bin/config-yargs';
}
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line import/no-dynamic-require
require(configYargsPath)(yargs);

// It is important that this is done after the webpack yargs config,
// so it overrides webpack's version info.
yargs.version(getVersions());
yargs.options(options);

const argv = yargs.argv;

// webpack-cli@3.3 path : 'webpack-cli/bin/utils/convert-argv'
let convertArgvPath;
try {
  require.resolve('webpack-cli/bin/utils/convert-argv');
  convertArgvPath = 'webpack-cli/bin/utils/convert-argv';
} catch (e) {
  convertArgvPath = 'webpack-cli/bin/convert-argv';
}
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line import/no-dynamic-require
const config = require(convertArgvPath)(yargs, argv, {
  outputFilename: '/bundle.js',
});

/**
 * 启动 dev server
 * @param {object} config webpack 配置
 * @param {object} options webpack-dev-server 参数
 */
function startDevServer(config, options) {
  const log = createLogger(options);

  let compiler;

  try {
    // 1. 创建 compiler 实例
    compiler = webpack(config);
  } catch (err) {
    if (err instanceof webpack.WebpackOptionsValidationError) {
      log.error(colors.error(options.stats.colors, err.message));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    throw err;
  }

  try {
    // 2. 启动一个 Server
    server = new Server(compiler, options, log);
    serverData.server = server;
  } catch (err) {
    if (err.name === 'ValidationError') {
      log.error(colors.error(options.stats.colors, err.message));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    throw err;
  }

  if (options.socket) {
    server.listeningApp.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        const clientSocket = new net.Socket();

        clientSocket.on('error', (err) => {
          if (err.code === 'ECONNREFUSED') {
            // No other server listening on this socket so it can be safely removed
            fs.unlinkSync(options.socket);

            server.listen(options.socket, options.host, (error) => {
              if (error) {
                throw error;
              }
            });
          }
        });

        clientSocket.connect({ path: options.socket }, () => {
          throw new Error('This socket is already used');
        });
      }
    });

    server.listen(options.socket, options.host, (err) => {
      if (err) {
        throw err;
      }

      // chmod 666 (rw rw rw)
      const READ_WRITE = 438;

      fs.chmod(options.socket, READ_WRITE, (err) => {
        if (err) {
          throw err;
        }
      });
    });
  } else {
    server.listen(options.port, options.host, (err) => {
      if (err) {
        throw err;
      }
    });
  }
}

// config 样例：
// {
//   "mode": "development",
//   "context": "/Users/solar/Desktop/project/webpack-dev-server/test/fixtures/cli",
//   "entry": "./foo.js",
//   "plugins": [
//       {}
//   ]
// }
//
// argv 样例：
// {
//   "_": [],
//   "cache": null,
//   "bail": null,
//   "profile": null,
//   "color": false,
//   "colors": false,
//   "liveReload": true,
//   "live-reload": true,
//   "serveIndex": true,
//   "serve-index": true,
//   "inline": true,
//   "info": true,
//   "config": "/Users/solar/Desktop/project/webpack-dev-server/test/fixtures/cli/webpack.config.js",
//   "info-verbosity": "info",
//   "infoVerbosity": "info",
//   "client-log-level": "info",
//   "clientLogLevel": "info",
//   "host": "localhost",
//   "$0": "bin/webpack-dev-server.js"
// }
processOptions(config, argv, (config, options) => {
  // 处理完 config 和 argv 后的 config, options
  // 如果之前的 config 是上述 config 样例，那么处理后的 config 也不会变，所以此处不举例了
  // argv 则会进行整合、过滤处理，上例 argv 最终产生的 options 如下：
  // {
  //     "host": "localhost",
  //     "publicPath": "/",
  //     "clientLogLevel": "info",
  //     "stats": {
  //         "cached": false,
  //         "cachedAssets": false
  //     },
  //     "port": 8080
  // }
  startDevServer(config, options);
});
