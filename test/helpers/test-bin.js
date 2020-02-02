'use strict';

const path = require('path');
const execa = require('execa');

const webpackDevServerPath = path.resolve(
  __dirname,
  '../../bin/webpack-dev-server.js'
);
const basicConfigPath = path.resolve(
  __dirname,
  '../fixtures/cli/webpack.config.js'
);

// 统一的运行 webpack dev server cli 的方法
// 仅仅是运行参数和配置地址通过函数参数来改变
function testBin(testArgs, configPath) {
  // /Users/solar/Desktop/project/webpack-dev-server
  const cwd = process.cwd();
  // test
  const env = process.env.NODE_ENV;

  // configPath 没有传则为 undefined，这时候使用默认的配置
  if (!configPath) {
    // /Users/solar/Desktop/project/webpack-dev-server/test/fixtures/cli/webpack.config.js
    configPath = basicConfigPath;
  }

  // 没有传任何命令行参数，则使用空数组
  if (!testArgs) {
    testArgs = [];

    // 命令行参数也可以传一个字符串进来，用空格隔开每个参数
  } else if (typeof testArgs === 'string') {
    testArgs = testArgs.split(' ');
  }

  // 没有其他命令行参数，则最终命令行参数数组如下：
  // [
  //   "/Users/solar/Desktop/project/webpack-dev-server/bin/webpack-dev-server.js",
  //   "--config",
  //   "/Users/solar/Desktop/project/webpack-dev-server/test/fixtures/cli/webpack.config.js"
  // ]
  const args = [webpackDevServerPath, '--config', configPath].concat(testArgs);

  // 相当于执行 node /path/webpack-dev-server.js --config /path/webpack.config.js
  return execa('node', args, { cwd, env, timeout: 10000 });
}

module.exports = testBin;
