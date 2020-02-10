'use strict';

/**
 * 打包进浏览器的 JS 源码，客户端代码
 */

/* global __resourceQuery WorkerGlobalScope self */
/* eslint prefer-destructuring: off */
const stripAnsi = require('strip-ansi');
const socket = require('./socket');
const overlay = require('./overlay');
const { log, setLogLevel } = require('./utils/log');
const sendMessage = require('./utils/sendMessage');
const reloadApp = require('./utils/reloadApp');
const createSocketUrl = require('./utils/createSocketUrl');

const status = {
  isUnloading: false,
  currentHash: '',
};
const options = {
  hot: false,
  hotReload: true,
  liveReload: false,
  initial: true,
  useWarningOverlay: false,
  useErrorOverlay: false,
  useProgress: false,
};
const socketUrl = createSocketUrl(__resourceQuery);

// 页面关闭或刷新时触发
self.addEventListener('beforeunload', () => {
  status.isUnloading = true;
});

if (typeof window !== 'undefined') {
  const qs = window.location.search.toLowerCase();
  options.hotReload = qs.indexOf('hotreload=false') === -1;
}

const onSocketMessage = {
  hot() {
    options.hot = true;
    log.info('[WDS] Hot Module Replacement enabled.');
  },
  liveReload() {
    options.liveReload = true;
    log.info('[WDS] Live Reloading enabled.');
  },
  invalid() {
    log.info('[WDS] App updated. Recompiling...');
    // fixes #1042. overlay doesn't clear if errors are fixed but warnings remain.
    if (options.useWarningOverlay || options.useErrorOverlay) {
      overlay.clear();
    }
    sendMessage('Invalid');
  },
  // 【重要的事件函数】服务器发送 hash 来更新浏览器中的 hash
  hash(hash) {
    status.currentHash = hash;
  },
  'still-ok': function stillOk() {
    log.info('[WDS] Nothing changed.');
    if (options.useWarningOverlay || options.useErrorOverlay) {
      overlay.clear();
    }
    sendMessage('StillOk');
  },
  'log-level': function logLevel(level) {
    const hotCtx = require.context('webpack/hot', false, /^\.\/log$/);
    if (hotCtx.keys().indexOf('./log') !== -1) {
      hotCtx('./log').setLogLevel(level);
    }
    setLogLevel(level);
  },
  overlay(value) {
    if (typeof document !== 'undefined') {
      if (typeof value === 'boolean') {
        options.useWarningOverlay = false;
        options.useErrorOverlay = value;
      } else if (value) {
        options.useWarningOverlay = value.warnings;
        options.useErrorOverlay = value.errors;
      }
    }
  },
  progress(progress) {
    if (typeof document !== 'undefined') {
      options.useProgress = progress;
    }
  },
  'progress-update': function progressUpdate(data) {
    if (options.useProgress) {
      log.info(`[WDS] ${data.percent}% - ${data.msg}.`);
    }
    sendMessage('Progress', data);
  },
  // 【重要的事件函数】热更新检查
  ok() {
    sendMessage('Ok');
    if (options.useWarningOverlay || options.useErrorOverlay) {
      overlay.clear();
    }
    if (options.initial) {
      return (options.initial = false);
    } // eslint-disable-line no-return-assign
    // 开始热更新检查
    reloadApp(options, status);
  },
  'content-changed': function contentChanged() {
    log.info('[WDS] Content base changed. Reloading...');
    self.location.reload();
  },
  warnings(warnings) {
    log.warn('[WDS] Warnings while compiling.');
    const strippedWarnings = warnings.map((warning) => stripAnsi(warning));
    sendMessage('Warnings', strippedWarnings);
    for (let i = 0; i < strippedWarnings.length; i++) {
      log.warn(strippedWarnings[i]);
    }
    if (options.useWarningOverlay) {
      overlay.showMessage(warnings);
    }

    if (options.initial) {
      return (options.initial = false);
    } // eslint-disable-line no-return-assign
    reloadApp(options, status);
  },
  errors(errors) {
    log.error('[WDS] Errors while compiling. Reload prevented.');
    const strippedErrors = errors.map((error) => stripAnsi(error));
    sendMessage('Errors', strippedErrors);
    for (let i = 0; i < strippedErrors.length; i++) {
      log.error(strippedErrors[i]);
    }
    if (options.useErrorOverlay) {
      overlay.showMessage(errors);
    }
    options.initial = false;
  },
  error(error) {
    log.error(error);
  },
  close() {
    log.error('[WDS] Disconnected!');
    sendMessage('Close');
  },
};

// 【Todo】暂时还没看 socket 代码，只知道它有以下的功能：
// 把 onSocketMessage 中的事件函数绑定到 Websocket.onMessage 事件中
// 通过服务器传递的消息对象 data 中的 type 属性来区分调用什么事件函数
socket(socketUrl, onSocketMessage);
