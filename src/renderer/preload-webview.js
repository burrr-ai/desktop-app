// No require - runs without nodeintegration
(function() {
  const OriginalNotification = window.Notification;

  window.Notification = function(title, options = {}) {
    console.log('__ELECTRON_NOTIFICATION__' + JSON.stringify({
      title: title,
      body: options.body || ''
    }));
    return new OriginalNotification(title, options);
  };

  window.Notification.permission = 'granted';
  window.Notification.requestPermission = function() {
    return Promise.resolve('granted');
  };
})();
