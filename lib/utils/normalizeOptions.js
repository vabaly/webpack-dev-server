'use strict';

/* eslint-disable
  no-undefined
*/

/**
 * 规格化参数
 * @param {object} compiler webpack 函数创建的 compiler 实例，目前没有用到这个参数
 * @param {object} options webpack dev server 参数
 */
function normalizeOptions(compiler, options) {
  // Setup default value
  options.contentBase =
    options.contentBase !== undefined ? options.contentBase : process.cwd();

  // Setup default value
  options.contentBasePublicPath = options.contentBasePublicPath || '/';

  // normalize transportMode option
  if (options.transportMode === undefined) {
    options.transportMode = {
      server: 'sockjs',
      client: 'sockjs',
    };
  } else {
    switch (typeof options.transportMode) {
      case 'string':
        options.transportMode = {
          server: options.transportMode,
          client: options.transportMode,
        };
        break;
      // if not a string, it is an object
      default:
        options.transportMode.server = options.transportMode.server || 'sockjs';
        options.transportMode.client = options.transportMode.client || 'sockjs';
    }
  }

  if (!options.watchOptions) {
    options.watchOptions = {};
  }
}

module.exports = normalizeOptions;
