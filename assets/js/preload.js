const ipcRenderer = require('electron').ipcRenderer;
document.addEventListener('DOMContentLoaded', function () {
  ipcRenderer.sendToHost('html-content' , document.title);
  //ipcRenderer.sendToHost('html-content' , document.body.innerHTML);
});

document.addEventListener('keyup', function (e) {
  // console.log(e.altKey, e.ctrlKey, e.shiftKey, e.keyCode)
  if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 46) {
    ipcRenderer.sendToHost('pop-setting' , e);
  }
});