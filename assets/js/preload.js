const ipcRenderer = require('electron').ipcRenderer;
document.addEventListener('DOMContentLoaded', function () {
  ipcRenderer.sendToHost('html-content', document.title);
  //ipcRenderer.sendToHost('html-content', document.body.innerHTML);
});

document.addEventListener('keyup', function (e) {
  console.log(e.altKey, e.ctrlKey, e.shiftKey, e.keyCode)
  if (e.ctrlKey && e.shiftKey && e.altKey && e.keyCode == 46) { // Ctrl + Shift + Alt + Delete
    ipcRenderer.sendToHost('pop-setting');
  } else if (e.keyCode == 116) { // F5
    ipcRenderer.sendToHost('page-refresh');
  }
});