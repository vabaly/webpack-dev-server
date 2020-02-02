'use strict';

const signals = ['SIGINT', 'SIGTERM'];

// 此函数的目的是在用户开始终止进程时终止当前进程以及服务器子进程
function setupExitSignals(serverData) {
  signals.forEach((signal) => {
    // 监听两个信号事件，二者都是 结束/终止 进程的信号
    // SIGINT - 通过键盘快捷键（一般是 Ctrl + C）开始终止前台进程的事件
    // SIGTERM - 无论前台后台、是否快捷键方式等，只要是进程开始友好地终止（例如 kill pid），即使因为阻塞并未成功地终止，也触发了该事件
    process.on(signal, () => {
      if (serverData.server) {
        serverData.server.close(() => {
          // eslint-disable-next-line no-process-exit
          process.exit();
        });
      } else {
        // eslint-disable-next-line no-process-exit
        process.exit();
      }
    });
  });
}

module.exports = setupExitSignals;
