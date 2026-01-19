import { app, BrowserWindow, session, ipcMain, Notification } from "electron";
import path from "node:path";

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
