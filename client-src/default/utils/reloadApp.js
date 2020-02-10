'use strict';

/* global WorkerGlobalScope self */

const { log } = require('./log');

function reloadApp(
  { hotReload, hot, liveReload },
  { isUnloading, currentHash }
) {
  if (isUnloading || !hotReload) {
    return;
  }
  if (hot) {
    log.info('[WDS] App hot update...');
    // 设计理念：
    // 为了更好的维护代码，以及职责划分的更明确，
    // 即 websocket 仅仅用于客户端（浏览器）和服务端进行通信，而真正做事情的活还是交回给了 webpack。
    const hotEmitter = require('webpack/hot/emitter');
    // hotEmitter.on 可以看 webpack/hot/dev-server.js
    hotEmitter.emit('webpackHotUpdate', currentHash);
    if (typeof self !== 'undefined' && self.window) {
      // broadcast update to window
      self.postMessage(`webpackHotUpdate${currentHash}`, '*');
    }
  }
  // allow refreshing the page only if liveReload isn't disabled
  else if (liveReload) {
    let rootWindow = self;
    // use parent window for reload (in case we're in an iframe with no valid src)
    const intervalId = self.setInterval(() => {
      if (rootWindow.location.protocol !== 'about:') {
        // reload immediately if protocol is valid
        applyReload(rootWindow, intervalId);
      } else {
        rootWindow = rootWindow.parent;
        if (rootWindow.parent === rootWindow) {
          // if parent equals current window we've reached the root which would continue forever, so trigger a reload anyways
          applyReload(rootWindow, intervalId);
        }
      }
    });
  }

  function applyReload(rootWindow, intervalId) {
    clearInterval(intervalId);
    log.info('[WDS] App updated. Reloading...');
    rootWindow.location.reload();
  }
}

module.exports = reloadApp;
