'use strict';

/* eslint-disable
  no-shadow,
  no-undefined
*/
const webpack = require('webpack');
const addEntries = require('./addEntries');
const getSocketClientPath = require('./getSocketClientPath');

/**
 * 看看更新了啥
 * @param {object} compiler
 * @param {object} options
 * 最简单的 CLI 测试的 options 样例如下：
    {
        "host": "localhost",
        "publicPath": "/",
        "clientLogLevel": "info",
        "stats": {
            "cached": false,
            "cachedAssets": false
        },
        "port": 8080,
        "contentBase": "/Users/solar/Desktop/project/webpack-dev-server",
        "contentBasePublicPath": "/",
        "transportMode": {
            "server": "sockjs",
            "client": "sockjs"
        },
        "watchOptions": {}
    }
 */
function updateCompiler(compiler, options) {
  // 一般 inline 是 undefined
  if (options.inline !== false) {
    /**
     * 如果 webpack 配置中 plugins 里面有 HotModuleReplacementPlugin 就会返回这个 Plugin
     * @param {object} config webpack 配置
     * @return HMR Plugin，函数
     */
    const findHMRPlugin = (config) => {
      if (!config.plugins) {
        return undefined;
      }

      return config.plugins.find(
        (plugin) => plugin.constructor === webpack.HotModuleReplacementPlugin
      );
    };

    const compilers = [];
    const compilersWithoutHMR = [];
    let webpackConfig;

    // compiler.compilers 一般是 undefined
    if (compiler.compilers) {
      webpackConfig = [];
      compiler.compilers.forEach((compiler) => {
        webpackConfig.push(compiler.options);
        compilers.push(compiler);
        if (!findHMRPlugin(compiler.options)) {
          compilersWithoutHMR.push(compiler);
        }
      });
    } else {
      // compiler.options 是 webpack 配置，此处赋值给 webpackConfig 这个变量
      webpackConfig = compiler.options;
      // compiler 放入到 compilers 数组中
      compilers.push(compiler);
      // 如果配置中没有配置插件，则加入到 compilersWithoutHMR 数组中
      if (!findHMRPlugin(compiler.options)) {
        compilersWithoutHMR.push(compiler);
      }
    }

    // it's possible that we should clone the config before doing
    // this, but it seems safe not to since it actually reflects
    // the changes we are making to the compiler
    // important: this relies on the fact that addEntries now
    // prevents duplicate new entries.
    addEntries(webpackConfig, options);
    compilers.forEach((compiler) => {
      const config = compiler.options;
      compiler.hooks.entryOption.call(config.context, config.entry);

      const providePlugin = new webpack.ProvidePlugin({
        __webpack_dev_server_client__: getSocketClientPath(options),
      });
      providePlugin.apply(compiler);
    });

    // do not apply the plugin unless it didn't exist before.
    if (options.hot || options.hotOnly) {
      compilersWithoutHMR.forEach((compiler) => {
        // addDevServerEntrypoints above should have added the plugin
        // to the compiler options
        const plugin = findHMRPlugin(compiler.options);
        if (plugin) {
          plugin.apply(compiler);
        }
      });
    }
  }
}

module.exports = updateCompiler;
