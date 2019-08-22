const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const { autoUpdater } = require('electron-updater');
const isDev = require('electron-is-dev');
const AutoLaunch = require('auto-launch');
let path = require('path');

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
    multiTab: false,
    checkUpdate: true
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
    ...windowBounds,
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true,
    },
    backgroundColor: '#003F7F',
    show: false,
  });
  win.setMenu(null);

  if (store.get('maximized')) {
    win.maximize();
  }

  win.$ = win.jQuery = require('jquery');
  win.loadFile('index.html');

  if (store.get('fullScreen')) {
    win.setFullScreen(true);
  }

  // 로딩 완료 시 renderer에 setting값 전달
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('setting', {
      protocol: store.get('protocol'),
      url: store.get('url'),
      autoLaunch: store.get('autoLaunch'),
      fullScreen: store.get('fullScreen'),
      multiTab: store.get('multiTab'),
      checkUpdate: store.get('checkUpdate')
    });

    // 업데이트 확인, 1시간마다 업데이트 체크
    checkUpdate();
  });
  setInterval(checkUpdate, 60 * 60 * 1000);

  // win.webContents.openDevTools();
  // win.webContents.session.clearCache(function() {});

  // 보여줄 준비가 되면 윈도우를 표시
  win.once('ready-to-show', () => {
    win.show();
  });

  // 창 이동 시 위치 저장
  win.on('move', () => {
    let maximized = win.isMaximized();
    let fullScreen = win.isFullScreen();
    if (!maximized && !fullScreen) {
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
    let fullScreen = win.isFullScreen();
    if (!maximized && !fullScreen) {
      // resize 가 unmaximize보다 먼저 발동하여 unmaximize 먼저 실행 위해 setTimeout 처리
      setTimeout(() => {
        let bounds = win.getBounds();
        store.set('windowBounds', bounds);
      });
    }
    store.set('maximized', maximized);
    store.set('fullScreen', fullScreen);
  });

  win.on('closed', () => {
    win = null
  });
}

app.on('ready', function () {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

function checkUpdate () {
  if (!isDev) {
    win.webContents.send('checkUpdate');
    autoUpdater.checkForUpdates();
  }
}

autoUpdater.on('update-not-available', e => {
  win.webContents.send('updateNotExist', e);
});


autoUpdater.on('update-downloaded', e => {
  win.webContents.send('updateReady', e);
});

ipcMain.on('quitAndInstall', e => {
  autoUpdater.quitAndInstall();
});

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
    else if (key == 'autoLaunch') {
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