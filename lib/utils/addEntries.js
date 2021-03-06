'use strict';

const webpack = require('webpack');
const createDomain = require('./createDomain');

/**
 * A Entry, it can be of type string or string[] or Object<string | string[],string>
 * @typedef {(string[] | string | Object<string | string[],string>)} Entry
 */

/**
 * Add entries Method
 * @param {?Object} config - Webpack config
 * @param {?Object} options - Dev-Server options
 * @param {?Object} server
 * @returns {void}
 */
function addEntries(config, options, server) {
  if (options.inline !== false) {
    // we're stubbing the app in this method as it's static and doesn't require
    // a server to be supplied. createDomain requires an app with the
    // address() signature.

    // 一个至少含有 address 方法的对象
    const app = server || {
      address() {
        return { port: options.port };
      },
    };

    /** @type {string}， eg: http://localhost:8080 */
    const domain = createDomain(options, app);
    /** @type {string}, eg: '' */
    const sockHost = options.sockHost ? `&sockHost=${options.sockHost}` : '';
    /** @type {string}, eg: '' */
    const sockPath = options.sockPath ? `&sockPath=${options.sockPath}` : '';
    /** @type {string}, eg: '' */
    const sockPort = options.sockPort ? `&sockPort=${options.sockPort}` : '';
    /** @type {string}, eg: '/Users/solar/Desktop/project/webpack-dev-server/client/index.js?http://localhost:8080' */
    const clientEntry = `${require.resolve(
      '../../client/'
    )}?${domain}${sockHost}${sockPath}${sockPort}`;

    /** @type {(string[] | string)} */
    let hotEntry;

    // hotEntry 一般不会有
    if (options.hotOnly) {
      hotEntry = require.resolve('webpack/hot/only-dev-server');
    } else if (options.hot) {
      hotEntry = require.resolve('webpack/hot/dev-server');
    }
    /**
     * prependEntry Method
     * @param {Entry} originalEntry
     * @param {Entry} additionalEntries
     * @returns {Entry}
     */
    const prependEntry = (originalEntry, additionalEntries) => {
      if (typeof originalEntry === 'function') {
        return () =>
          Promise.resolve(originalEntry()).then((entry) =>
            prependEntry(entry, additionalEntries)
          );
      }

      if (typeof originalEntry === 'object' && !Array.isArray(originalEntry)) {
        /** @type {Object<string,string>} */
        const clone = {};

        Object.keys(originalEntry).forEach((key) => {
          // entry[key] should be a string here
          clone[key] = prependEntry(originalEntry[key], additionalEntries);
        });

        return clone;
      }

      // in this case, entry is a string or an array.
      // make sure that we do not add duplicates.
      /** @type {Entry} */
      const entriesClone = additionalEntries.slice(0);
      [].concat(originalEntry).forEach((newEntry) => {
        if (!entriesClone.includes(newEntry)) {
          entriesClone.push(newEntry);
        }
      });
      return entriesClone;
    };

    /**
     *
     * Description of the option for checkInject method
     * @typedef {Function} checkInjectOptionsParam
     * @param {Object} _config - compilerConfig
     * @return {Boolean}
     */

    /**
     * 检查 webpack dev server 的 injectClient 或者 injectHot 等配置是不是真值
     * @param {Boolean | checkInjectOptionsParam} option - inject(Hot|Client) it is Boolean | fn => Boolean
     * @param {Object} _config
     * @param {Boolean} defaultValue
     * @return {Boolean}
     */
    // eslint-disable-next-line no-shadow
    const checkInject = (option, _config, defaultValue) => {
      if (typeof option === 'boolean') return option;
      if (typeof option === 'function') return option(_config);
      return defaultValue;
    };

    // config 可能是数组，即多份 webpack 配置，不过在 CLI 单元测试中是对象，即一份配置
    // 不过，这里使用 [].concat(array|object) 都可巧妙的转化为数组进行使用
    // 例如，[].concat({}) => [{}]
    // eslint-disable-next-line no-shadow
    [].concat(config).forEach((config) => {
      /** @type {Boolean}，配置的构建目标是否是以下的目标 */
      const webTarget = [
        'web',
        'webworker',
        'electron-renderer',
        'node-webkit',
        undefined, // eslint-disable-line
        null,
      ].includes(config.target);
      /** @type {Entry}，除了 webpack entry 之外的 entry */
      const additionalEntries = checkInject(
        options.injectClient,
        config,
        webTarget
      )
        ? [clientEntry]
        : [];

      if (hotEntry && checkInject(options.injectHot, config, true)) {
        additionalEntries.push(hotEntry);
      }

      // 将 config.entry 加到 additionalEntries 数组后面，重新给 config.entry 赋值
      config.entry = prependEntry(config.entry || './src', additionalEntries);

      // 如果配置了 hot 或者 hotOnly 为真，那么在 plugins 配置中加入 HotModuleReplacementPlugin
      if (options.hot || options.hotOnly) {
        config.plugins = config.plugins || [];
        if (
          !config.plugins.find(
            // Check for the name rather than the constructor reference in case
            // there are multiple copies of webpack installed
            (plugin) => plugin.constructor.name === 'HotModuleReplacementPlugin'
          )
        ) {
          config.plugins.push(new webpack.HotModuleReplacementPlugin());
        }
      }
    });
  }
}

module.exports = addEntries;
