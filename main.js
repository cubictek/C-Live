const {app, BrowserWindow, ipcMain} = require('electron');
const { autoUpdater } = require('electron-updater');
const AutoLaunch = require('auto-launch');
let path = require('path');

console.log(autoUpdater);
const Store = require('./store.js');

// setting
const store = new Store({
  configName: 'user-preferences',
  defaults: {
    windowBounds: { width: 1280, height: 1024 },
    maximized: false,
    protocol: 'https://',
    url: '',
    autoLaunch: false,
    fullScreen: false,
    multiTab: false
  }
});

// auto launch
let appPath = app.getPath('exe');
const autoLaunch = new AutoLaunch({
  name: 'C-Live',
  path: appPath,
});

let win;
function createWindow () {
  let windowBounds = store.get('windowBounds');
  win = new BrowserWindow({
    icon: path.join(__dirname, 'build/icons/64x64.png'),
    ...windowBounds
  });

  if (store.get('maximized')) {
    win.maximize();
  }
  
  let contents = win.webContents;

  win.$ = win.jQuery = require('jquery');
  win.loadFile('index.html');

  if (store.get('fullScreen')) {
    win.setFullScreen(true);
  }

  // 로딩 완료 시 renderer에 setting값 전달
  contents.on('did-finish-load', () => {
    contents.send('setting', {
      protocol: store.get('protocol'),
      url: store.get('url'),
      autoLaunch: store.get('autoLaunch'),
      fullScreen: store.get('fullScreen'),
      multiTab: store.get('multiTab')
    });
  });

  // contents.openDevTools();
  // contents.session.clearCache(function() {});

  // 창 이동 시 위치 저장
  win.on('move', () => {
    let maximized = win.isMaximized();
    if (!maximized) {
      let bounds = win.getBounds();
      store.set('windowBounds', bounds);
    }
  });

  // 최대화 취소 시 기존 사이즈 가져와 적용
  win.on('unmaximize', () => {
    win.setBounds(store.get('windowBounds'));
  });

  // 사이즈 변경 적용
  win.on('resize', () => {
    let maximized = win.isMaximized();
    if (!maximized) {
      // resize 가 unmaximize보다 먼저 발동하여 unmaximize 먼저 실행 위해 setTimeout 처리
      setTimeout(() => {
        let bounds = win.getBounds();
        store.set('windowBounds', bounds);
      });
    }
    store.set('maximized', win.isMaximized());
  });

  win.on('closed', () => {
    win = null
  });
}

app.on('ready', function () {
  createWindow();
  autoUpdater.checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

autoUpdater.on('update-downloaded', (info) => {
  win.webContents.send('updateReady');
});

// when receiving a quitAndInstall signal, quit and install the new version ;)
ipcMain.on("quitAndInstall", (event, arg) => {
  autoUpdater.quitAndInstall();
})

// index.html(ipcRenderer)과 통신
ipcMain.on('setting', function (e, setting) {
  for (let key in setting) {
    store.set(key, setting[key]);

    if (key == 'fullScreen') {
      // 기존 값과 다르면 적용
      if (setting[key] !== win.isFullScreen()) {
        win.setFullScreen(setting[key]);
      }
    }
    if (key == 'autoLaunch') {
      // 빌드 전엔 electron.exe가 실행 됨
      if (appPath.lastIndexOf('electron.exe') > -1) {
        console.log('Works normally after build.');
      }

      autoLaunch.isEnabled().then(function (isEnabled) {
        // 기존 값과 다르면 적용
        if (isEnabled != store.get('autoLaunch')) {
          (store.get('autoLaunch') ? autoLaunch.enable : autoLaunch.disable)().catch(err => {console.log('test', err);});
        }
      }).catch(err => {console.log(err);});
    }
  }
});