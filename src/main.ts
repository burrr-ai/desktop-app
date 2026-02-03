import { app, BrowserWindow, session, ipcMain, Notification, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";

const START_URL = "https://mvpstar.ai/";
const SESSION_PARTITION = "persist:mvpstar";

const configurePermissions = () => {
  const appSession = session.fromPartition(SESSION_PARTITION);

  appSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl ?? "";
    const isMvpstar = requestingUrl.startsWith(START_URL);

    callback(isMvpstar && permission === "notifications");
  });

  appSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const isMvpstar = requestingOrigin.startsWith(START_URL);

    return isMvpstar && permission === "notifications";
  });
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 12 },
    backgroundColor: "#1e1e1e",
    webPreferences: {
      partition: SESSION_PARTITION,
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
};

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("ai.mvpstar.desktop");
  }

  // IPC handler for notifications from renderer/webview
  ipcMain.on("show-notification", (_event, { title, body }) => {
    new Notification({ title, body }).show();
  });

  configurePermissions();
  createWindow();

  // Handle external links from webview
  app.on("web-contents-created", (_event, contents) => {
    console.log("[web-contents-created] type:", contents.getType());

    contents.on("will-navigate", (event, url) => {
      console.log("[will-navigate]", url);

      // 내부 도메인 및 OAuth 관련 URL은 앱 내에서 허용
      const allowedDomains = [
        "mvpstar.ai",
        "auth.mvpstar.ai",
        "accounts.google.com",
        "appleid.apple.com",
        "kauth.kakao.com",
        "accounts.kakao.com",
        "nid.naver.com"
      ];

      try {
        const urlObj = new URL(url);
        if (allowedDomains.some((domain) => urlObj.hostname.includes(domain))) {
          return; // 앱 내에서 진행
        }
      } catch {
        // invalid URL
      }

      event.preventDefault();
      shell.openExternal(url);
    });

    contents.setWindowOpenHandler(({ url }) => {
      console.log("[setWindowOpenHandler]", url);

      // OAuth 로그인 관련 URL은 Electron 팝업으로 허용
      const oauthDomains = [
        "accounts.google.com",
        "appleid.apple.com",
        "kauth.kakao.com",
        "accounts.kakao.com",
        "nid.naver.com"
      ];

      try {
        const urlObj = new URL(url);
        if (oauthDomains.some((domain) => urlObj.hostname.includes(domain))) {
          return { action: "allow" };
        }
      } catch {
        // invalid URL, fall through to open externally
      }

      shell.openExternal(url);
      return { action: "deny" };
    });
  });

  // Auto updater setup
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "업데이트 준비 완료",
        message: `새 버전 ${info.version}이 다운로드되었습니다. 지금 재시작하시겠습니까?`,
        buttons: ["지금 재시작", "나중에"]
      })
      .then((result) => {
        if (result.response === 0) {
          setImmediate(() => {
            app.removeAllListeners("window-all-closed");
            autoUpdater.quitAndInstall(false, true);
          });
        }
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto updater error:", err);
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
