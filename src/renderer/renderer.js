const { ipcRenderer } = require("electron");
const path = require("path");

const addressDisplay = document.getElementById("addressDisplay");
const refreshButton = document.getElementById("refreshButton");
const webview = document.getElementById("webview");
const toolbar = document.getElementById("toolbar");

const START_URL = "https://mvpstar.ai/vibe-coding/";
const STORAGE_KEY = "lastUrl";

const getStoredUrl = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.startsWith(START_URL)) {
      return stored;
    }
    return START_URL;
  } catch (error) {
    return START_URL;
  }
};

const storeUrl = (url) => {
  if (!url.startsWith(START_URL)) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch (error) {
    return;
  }
};

const normalizeUrl = (url) => {
  if (!url) {
    return START_URL;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
};

const updateAddress = (url) => {
  if (!url || !url.startsWith(START_URL)) return;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search + parsed.hash;
    if (path && path !== "/") {
      addressDisplay.textContent = path;
      storeUrl(url);
    }
  } catch {
    // ignore invalid URLs
  }
};

const readThemeColor = () => {
  const script = `(() => {
  const getBackgroundColor = (el) => {
    if (!el || el === document.documentElement) return null;
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    return getBackgroundColor(el.parentElement);
  };

  // 상단 중앙 지점의 요소 배경색 감지
  const topElement = document.elementFromPoint(window.innerWidth / 2, 10);
  if (topElement) {
    const color = getBackgroundColor(topElement);
    if (color) return color;
  }

  // fallback: meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && meta.content) {
    return meta.content;
  }

  return getComputedStyle(document.body).backgroundColor || '';
})()`;

  return webview.executeJavaScript(script);
};

const getLuminance = (color) => {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const [, r, g, b] = match;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return 0.5;
};

const isLightColor = (color) => {
  return getLuminance(color) > 0.4;
};

const applyThemeColor = (color) => {
  toolbar.style.backgroundColor = color;
  document.body.style.backgroundColor = color;

  const isLight = isLightColor(color);
  const textColor = isLight ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)";
  const mutedColor = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

  refreshButton.style.color = mutedColor;
  addressDisplay.style.color = mutedColor;

  refreshButton.onmouseenter = () => { refreshButton.style.color = textColor; };
  refreshButton.onmouseleave = () => { refreshButton.style.color = mutedColor; };
};

const isValidColor = (color) => {
  if (!color) return false;
  if (color === "rgba(0, 0, 0, 0)" || color === "transparent") return false;
  // 너무 어두운 색은 무시하고 흰색 사용 (luminance < 0.15)
  if (!isLightColor(color)) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const [, r, g, b] = match;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance < 0.15) return false;
    } else if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance < 0.15) return false;
    }
  }
  return true;
};

const DEFAULT_COLOR = "#ffffff";

const syncToolbarTheme = async () => {
  try {
    const color = await readThemeColor();
    applyThemeColor(isValidColor(color) ? color : DEFAULT_COLOR);
  } catch {
    applyThemeColor(DEFAULT_COLOR);
  }
};

const handleThemeColorChange = (event) => {
  const color = event.themeColor;
  applyThemeColor(isValidColor(color) ? color : DEFAULT_COLOR);
};

const loadUrl = (url) => {
  const normalized = normalizeUrl(url);
  webview.src = normalized;
};

refreshButton.addEventListener("click", () => {
  webview.reload();
});

webview.addEventListener("did-finish-load", () => {
  const url = webview.getURL();
  updateAddress(url);
  syncToolbarTheme();
});

webview.addEventListener("did-navigate", (event) => {
  updateAddress(event.url);
  syncToolbarTheme();
});

webview.addEventListener("did-navigate-in-page", (event) => {
  updateAddress(event.url);
  syncToolbarTheme();
});

webview.addEventListener("dom-ready", () => {
  syncToolbarTheme();
  setTimeout(syncToolbarTheme, 300);
});

webview.addEventListener("did-change-theme-color", handleThemeColorChange);

// Forward notifications from webview to main process
webview.addEventListener("console-message", (event) => {
  if (event.message.startsWith("__ELECTRON_NOTIFICATION__")) {
    try {
      const data = JSON.parse(event.message.replace("__ELECTRON_NOTIFICATION__", ""));
      ipcRenderer.send("show-notification", data);
    } catch (e) {
      // ignore parse errors
    }
  }
});

// Set webview preload with absolute path (must be before src)
const preloadPath = path.join(__dirname, "preload-webview.js");
webview.setAttribute("preload", `file://${preloadPath}`);
webview.setAttribute("webpreferences", "contextIsolation=no");

// Now load the URL
const lastUrl = getStoredUrl();
webview.src = lastUrl;
