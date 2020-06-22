const ipcRenderer = require('electron').ipcRenderer;

// browserWinidow(ipcMain)와 통신
let msgUpdate;
let setting = {};
ipcRenderer.on('setting', (e, initialSetting) => {
  setting = initialSetting;

  document.getElementById('div_bar').style.display = setting.multiTab ? 'flex' : 'none';
  if (setting.url) {
    document.querySelector('.webview').setAttribute('src', setting.protocol + setting.url);
    fetch(setting.protocol + setting.url).then(res => {
      if (res.status === 200) return;

      document.querySelector('.webview').setAttribute('src', 'error.html');
    }).catch(err => {
      let el_alert = document.createElement('div');
      el_alert.setAttribute('class', 'alert alert-danger alert-dismissible fade show fixed-bottom')
      el_alert.setAttribute('role', 'alert');
      el_alert.setAttribute('id', 'alert_update');
      el_alert.style.zIndex = 1051;
      el_alert.innerHTML = `서버 주소가 올바르지 않습니다.
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>`;
      document.body.appendChild(el_alert);
      setTimeout(() => {
        $(el_alert).alert('close');
      }, 3000);
      // alert('서버 주소가 올바르지 않습니다.');
      document.querySelector('.webview').setAttribute('src', 'initial.html');
      popSetting();
    });
  } else {
    popSetting();
  }
});

ipcRenderer.on('checkUpdate', (e, data) => {
  $('#bt_update').prop('disabled', true).html(`<img class="icon_refresh" src="assets/img/refresh.png" /> 업데이트 확인 중`);
});

ipcRenderer.on('updateNotExist', (e, data) => {
  let version = `v${data.version}`;
  $('#bt_update').prop('disabled', true).html(`최신버전(${version})`);
});

ipcRenderer.on('updateReady', (e, data) => {
  let version = `v${data.version}`;
  msgUpdate = `최신버전(${version})으로 업데이트 하시겠습니까?`;
  $('#bt_update').prop('disabled', false).html(`업데이트(${version})`);
  if (setting.checkUpdate && !document.getElementById('alert_update')) {
    let el_alert = document.createElement('div');
    el_alert.setAttribute('class', 'alert alert-info alert-dismissible fade show fixed-bottom')
    el_alert.setAttribute('role', 'alert');
    el_alert.setAttribute('id', 'alert_update');
    el_alert.innerHTML = `C-Live 최신버전(${version})이 확인되었습니다.
    <button type="button" class="btn btn-info btn-sm" id="bt_alert_update">Update</button>
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>`;
    document.body.appendChild(el_alert);
    el_alert.querySelector('#bt_alert_update').addEventListener('click', confirmUpdate);
  }
});

document.getElementById('bt_update').addEventListener('click', confirmUpdate);

function confirmUpdate() {
  // if (confirm(msgUpdate)) {
  ipcRenderer.send('quitAndInstall');
  // }
}

// pop setting
function popSetting() {
  $('#protocol').val(setting.protocol);
  $('#url').val(setting.url);
  $('#autoLaunch').prop('checked', setting.autoLaunch);
  $('#fullScreen').prop('checked', setting.fullScreen);
  $('#multiTab').prop('checked', setting.multiTab);
  $('#checkUpdate').prop('checked', setting.checkUpdate);
  $('#div_pop').modal({backdrop: 'static'})
}

// save setting
function saveSetting() {
  // if (confirm('설정값을 [저장]하시겠습니까?')) {
  let protocol = $('#protocol').val();
  let url = $('#url').val();
  let autoLaunch = $('#autoLaunch').prop('checked');
  let fullScreen = $('#fullScreen').prop('checked');
  let multiTab = $('#multiTab').prop('checked');
  let checkUpdate = $('#checkUpdate').prop('checked');
  setting = {
    protocol,
    url,
    autoLaunch,
    fullScreen,
    multiTab,
    checkUpdate
  };
  ipcRenderer.send('setting', setting);
  $('#div_pop').modal('hide');
  location.reload();
  // }
}

// call popup
document.addEventListener('keyup', e => {
  // console.log(e.altKey, e.ctrlKey, e.shiftKey, e.keyCode)
  if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 46) {
    popSetting();
  }
});

// save url
document.getElementById('bt_save').addEventListener('click', saveSetting);
document.getElementById('url').addEventListener('keyup', e => {
  if (e.keyCode == 13) {
    saveSetting();
  }
});

let nLoading;
let intervalProgress;
let progress = document.getElementById('progress');
let stripe = document.getElementById('progress-stripe');

let webviews = document.querySelectorAll('.webview');
webviews.forEach(webview => {
  initialWebview(webview);
});

function initialWebview(webview) {
  webviews = Array.prototype.slice.call(document.querySelectorAll('.webview'));
  let nIdx = webviews.indexOf(webview);
  let tab = document.querySelectorAll('.tab')[nIdx];

  tab.addEventListener('click', function (e) {
    if (Array.prototype.slice.call(e.target.classList).indexOf('close') > -1) return false;

    document.querySelector('.tab.active').classList.remove('active');
    document.querySelector('.webview.active').classList.remove('active');
    tab.classList.add('active');
    webview.classList.add('active');
  });
  tab.querySelector('.close').addEventListener('click', function () {
    let bActive = Array.prototype.slice.call(tab.classList).indexOf('active') > -1;
    if (bActive) {
      let webview_target = webview.nextElementSibling ? webview.nextElementSibling : webview.previousElementSibling;
      let tab_target = tab.nextElementSibling ? tab.nextElementSibling : tab.previousElementSibling;
      webview_target.classList.add('active');
      tab_target.classList.add('active');
    }
    webview.remove();
    tab.remove();
    webviews = Array.prototype.slice.call(document.querySelectorAll('.webview'));
  });

  webview.addEventListener('console-message', function (e) {
    console.log('Webview Console:', e.message);
  });
  
  webview.addEventListener('ipc-message', function (e) {
    console.log(e)
    if (e.channel === 'html-content') {
      var html_contents = e.args[0];
      tab.querySelector('.title').innerHTML = html_contents;
    } else if (e.channel === 'pop-setting') {
      popSetting();
    } else if (e.channel === 'page-refresh') {
      webview.reload();
    }
  });

  webview.addEventListener('new-window', function (e) {
    // console.log(e);
    let tab_clone = tab.cloneNode(true);
    tab.classList.remove('active');
    tab.parentNode.insertBefore(tab_clone, tab.nextSibling);

    webview.classList.remove('active');
    let webview_new = document.createElement('webview');
    webview_new.setAttribute('class', 'webview active');
    webview_new.setAttribute('src', e.url);
    webview_new.setAttribute('preload', 'assets/js/preload.js');
    webview_new.setAttribute('allow_popup', '');
    webview.parentNode.insertBefore(webview_new, webview.nextSibling);
    initialWebview(webview_new);

    /*
    if (e.disposition === 'foreground-tab') {
      console.log(e.url)
      let el_popup = document.getElementById('webview_popup')
      el_popup.setAttribute('src', e.url)
      el_popup.loadURL(e.url)
      el_popup.style.display = 'flex'

      console.log('WB open:', e)
      const protocol = require('url').parse(e.url)
      console.log(e.url, protocol)
      shell.openExternal(e.url)
    }
    */
  });

  webview.addEventListener('did-start-loading', function (e) {
    // console.log('start', e);
    $(progress).stop().show().css({opacity: 1});
    nLoading = 0;
    intervalProgress = setInterval(() => {
      stripe.style.width = nLoading + '%';
      let colorR = nLoading < 50 ? 255 : 255 - parseInt(255 * (nLoading - 50) / 50);
      let colorG = nLoading < 50 ? parseInt(255 * nLoading / 50) : 255;
      progress.style.background = `linear-gradient(90deg, rgba(${colorR}, ${colorG}, 0, 0.75) calc(${nLoading}% - 4px), rgba(0,0,0,0) calc(${nLoading}% - 4px))`;
      nLoading += (100 - nLoading) / 25;
    }, 25);
  });

  webview.addEventListener('did-stop-loading', function (e) {
    // console.log('stop', e);
    clearInterval(intervalProgress);
    stripe.style.width = '100%';
    progress.style.background = `linear-gradient(90deg, rgba(0, 255, 0, 0.75) 100%, rgba(0,0,0,0) 100%)`;
    $(progress).animate({opacity: 0}, 1000, function () {
      $(progress).hide();
    });
  });

  // setTimeout(() => {
  //   webview.printToPDF({
  //     printBackground: true, landscape: true
  //   }).then(data => {
  //     console.log(data);
  //   }).catch(error => {
  //     console.log(error);
  //   })
  // }, 2000)
}

document.getElementById('tab_list').addEventListener('mousewheel', function (e) {
  if (e.deltaY != 0) {
    this.scrollLeft += e.deltaY;
  }
});

document.getElementById('add_tab').addEventListener('click', function (e) {
  let tabs = document.querySelectorAll('.tab');
  let tab_clone = tabs[0].cloneNode(true);
  document.querySelector('.tab.active').classList.remove('active');
  tabs[0].parentNode.insertBefore(tab_clone, tabs[tabs.length - 1].nextSibling);
  tab_clone.classList.add('active');

  document.querySelector('.webview.active').classList.remove('active');
  let webview_new = document.createElement('webview');
  webview_new.setAttribute('class', 'webview active');
  webview_new.setAttribute('src', setting.url ? setting.protocol + setting.url : 'initial.html');
  webview_new.setAttribute('preload', 'assets/js/preload.js');
  webview_new.setAttribute('allow_popup', '');
  webviews[0].parentNode.insertBefore(webview_new, webviews[webviews.length - 1].nextSibling);
  initialWebview(webview_new);
  document.getElementById('tab_list').scrollLeft = document.getElementById('tab_list').scrollWidth;
});