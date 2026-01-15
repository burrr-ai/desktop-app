import { app, BrowserWindow, session } from "electron";

const START_URL = "https://mvpstar.ai/vibe-coding/";
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
    webPreferences: {
      partition: SESSION_PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadURL(START_URL);
};

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("ai.mvpstar.desktop");
  }

  configurePermissions();
  createWindow();

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
