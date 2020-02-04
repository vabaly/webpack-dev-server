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
    // 此处的 webpackconfig 在调试样例下是：
    //   {
    //     "mode": "development",
    //     "context": "/Users/solar/Desktop/project/webpack-dev-server/test/fixtures/cli",
    //     "entry": "./foo.js",
    //     "plugins": [
    //         {}
    //     ],
    //     "devtool": "eval",
    //     "cache": true,
    //     "target": "web",
    //     "module": {
    //         "unknownContextRequest": ".",
    //         "unknownContextRegExp": false,
    //         "unknownContextRecursive": true,
    //         "unknownContextCritical": true,
    //         "exprContextRequest": ".",
    //         "exprContextRegExp": false,
    //         "exprContextRecursive": true,
    //         "exprContextCritical": true,
    //         "wrappedContextRegExp": {},
    //         "wrappedContextRecursive": true,
    //         "wrappedContextCritical": false,
    //         "strictExportPresence": false,
    //         "strictThisContextOnImports": false,
    //         "unsafeCache": true,
    //         "rules": [],
    //         "defaultRules": [
    //             {
    //                 "type": "javascript/auto",
    //                 "resolve": {}
    //             },
    //             {
    //                 "test": {},
    //                 "type": "javascript/esm",
    //                 "resolve": {
    //                     "mainFields": [
    //                         "browser",
    //                         "main"
    //                     ]
    //                 }
    //             },
    //             {
    //                 "test": {},
    //                 "type": "json"
    //             },
    //             {
    //                 "test": {},
    //                 "type": "webassembly/experimental"
    //             }
    //         ]
    //     },
    //     "output": {
    //         "filename": "[name].js",
    //         "chunkFilename": "[name].js",
    //         "webassemblyModuleFilename": "[modulehash].module.wasm",
    //         "library": "",
    //         "hotUpdateFunction": "webpackHotUpdate",
    //         "jsonpFunction": "webpackJsonp",
    //         "chunkCallbackName": "webpackChunk",
    //         "globalObject": "window",
    //         "devtoolNamespace": "",
    //         "libraryTarget": "var",
    //         "path": "/Users/solar/Desktop/project/webpack-dev-server/dist",
    //         "pathinfo": true,
    //         "sourceMapFilename": "[file].map[query]",
    //         "hotUpdateChunkFilename": "[id].[hash].hot-update.js",
    //         "hotUpdateMainFilename": "[hash].hot-update.json",
    //         "crossOriginLoading": false,
    //         "jsonpScriptType": false,
    //         "chunkLoadTimeout": 120000,
    //         "hashFunction": "md4",
    //         "hashDigest": "hex",
    //         "hashDigestLength": 20,
    //         "devtoolLineToLine": false,
    //         "strictModuleExceptionHandling": false
    //     },
    //     "node": {
    //         "console": false,
    //         "process": true,
    //         "global": true,
    //         "Buffer": true,
    //         "setImmediate": true,
    //         "__filename": "mock",
    //         "__dirname": "mock"
    //     },
    //     "performance": false,
    //     "optimization": {
    //         "removeAvailableModules": false,
    //         "removeEmptyChunks": true,
    //         "mergeDuplicateChunks": true,
    //         "flagIncludedChunks": false,
    //         "occurrenceOrder": false,
    //         "sideEffects": false,
    //         "providedExports": true,
    //         "usedExports": false,
    //         "concatenateModules": false,
    //         "splitChunks": {
    //             "hidePathInfo": false,
    //             "chunks": "async",
    //             "minSize": 10000,
    //             "minChunks": 1,
    //             "maxAsyncRequests": null,
    //             "automaticNameDelimiter": "~",
    //             "automaticNameMaxLength": 109,
    //             "maxInitialRequests": null,
    //             "name": true,
    //             "cacheGroups": {
    //                 "default": {
    //                     "automaticNamePrefix": "",
    //                     "reuseExistingChunk": true,
    //                     "minChunks": 2,
    //                     "priority": -20
    //                 },
    //                 "vendors": {
    //                     "automaticNamePrefix": "vendors",
    //                     "test": {},
    //                     "priority": -10
    //                 }
    //             }
    //         },
    //         "noEmitOnErrors": false,
    //         "checkWasmTypes": false,
    //         "mangleWasmImports": false,
    //         "namedModules": true,
    //         "hashedModuleIds": false,
    //         "namedChunks": true,
    //         "portableRecords": false,
    //         "minimize": false,
    //         "minimizer": [
    //             {}
    //         ],
    //         "nodeEnv": "development"
    //     },
    //     "resolve": {
    //         "unsafeCache": true,
    //         "modules": [
    //             "node_modules"
    //         ],
    //         "extensions": [
    //             ".wasm",
    //             ".mjs",
    //             ".js",
    //             ".json"
    //         ],
    //         "mainFiles": [
    //             "index"
    //         ],
    //         "aliasFields": [
    //             "browser"
    //         ],
    //         "mainFields": [
    //             "browser",
    //             "module",
    //             "main"
    //         ],
    //         "cacheWithContext": false
    //     },
    //     "resolveLoader": {
    //         "unsafeCache": true,
    //         "mainFields": [
    //             "loader",
    //             "main"
    //         ],
    //         "extensions": [
    //             ".js",
    //             ".json"
    //         ],
    //         "mainFiles": [
    //             "index"
    //         ],
    //         "cacheWithContext": false
    //     },
    //     "infrastructureLogging": {
    //         "level": "info",
    //         "debug": false
    //     }
    // }
    // options 是：
    //   {
    //     "host": "localhost",
    //     "publicPath": "/",
    //     "clientLogLevel": "info",
    //     "stats": {
    //         "cached": false,
    //         "cachedAssets": false
    //     },
    //     "port": 8080,
    //     "contentBase": "/Users/solar/Desktop/project/webpack-dev-server",
    //     "contentBasePublicPath": "/",
    //     "transportMode": {
    //         "server": "sockjs",
    //         "client": "sockjs"
    //     },
    //     "watchOptions": {}
    // }
    // 给 webpackConfig 中的 entry 配置加入更多 entry，
    // 并且在 options.hot 或 options.hotOnly 为真时，新增一个 entry，
    // 同时确保 plugins 配置中有 HotModuleReplacementPlugin，
    // 上述例子中之前的 webpackConfig 这方面的配置是：
    // {
    //     // ...其他配置
    //     "entry": "./foo.js",
    //     "plugins": [
    //         {}
    //     ]
    // }
    // 经过 addEntries 处理之后，配置变为：
    // {
    //     // ...其他配置
    //     "entry": [
    //         "/Users/solar/Desktop/project/webpack-dev-server/client/index.js?http://localhost:8080",
    //         "./foo.js"
    //     ],
    //     "plugins": [
    //         {}
    //     ]
    // }
    addEntries(webpackConfig, options);

    compilers.forEach((compiler) => {
      const config = compiler.options;

      // hooks entryOption 函数是什么作用？
      compiler.hooks.entryOption.call(config.context, config.entry);

      // 使用 ProvidePlugin 方法可以将 getSocketClientPath(options) 的返回值给 __webpack_dev_server_client__ 全局变量
      // 【Todo】getSocketClientPath(options) 返回值是什么
      const providePlugin = new webpack.ProvidePlugin({
        __webpack_dev_server_client__: getSocketClientPath(options),
      });

      // providePlugin 是个 Tapable 类型的对象，该对象上有 `.apply` 方法，这个方法和函数的 `.apply` 方法不一样
      // 这个方法是用于将新加的 plugin 真正注册到 compiler 中，一般 webpack 函数内部会做这样的处理
      // 但是这里是动态的新增 plugin，所以要自行注册一遍
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
