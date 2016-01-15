(function() {
  'use strict';

  var cachedNotifications = [];
  var foundNotificationsToHide = false;
  var foundNotificationsToShow = false;
  var showIgnoredNotificationsAnyway = false;

  var accessToken = '';
  function getNotifications(success, error) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET',
             'https://api.github.com/notifications?access_token=' + accessToken +
             '&cache_buster=' + (Math.random() * 1e16));
    xhr.onload = function() {
      if (xhr.status === 200) {
        success && success(JSON.parse(xhr.responseText));
      }
      else {
        error && error(xhr.status);
      }
    };
    xhr.send();
  }

  var ignoreRegexes = [];

  function getSettings(theMessageEvent) {
    if (theMessageEvent.name === "getSettings") {
      var settings = theMessageEvent.message;
      accessToken = settings.oauthToken;
      ignoreRegexes = settings.ignoreRegexes.split(',').map(function(ignoreRegex) {
        return new RegExp(ignoreRegex);
      });
      updateLoop();
      setInterval(updateLoop, 60 * 1000);
    }
  }
  safari.self.addEventListener("message", getSettings, false);
  safari.self.tab.dispatchMessage("requestSettings");
  

  /* hackily disable websocket notfication updates */
  [].forEach.call(document.querySelectorAll('[data-channel^=\'notification-changed:\']'),
      function(el) {
    el.classList.remove('js-socket-channel');
  });

  function updateLoop() {
    getNotifications(function(notifications) {
      cachedNotifications = notifications;
      parseNotifications(cachedNotifications);
      updateNotificationIcon();
      updateNotificationLists();
    });
  }

  function parseNotifications(notifications) {
    foundNotificationsToHide = false;
    foundNotificationsToShow = false;
    for(var i = 0; i < notifications.length; i++) {
      var notification = notifications[i];
      var shouldHideNotification = false;
      for(var j = 0; j < ignoreRegexes.length; j++) {
        var ignoreRegex = ignoreRegexes[j];
        if(!showIgnoredNotificationsAnyway &&
           ignoreRegex.test(notification.repository.full_name)) {
          shouldHideNotification = true;
      	  break;
      	}
      }
      if (shouldHideNotification) {
        foundNotificationsToHide = true;
      } else {
        foundNotificationsToShow = true;
      }
    }
  }

  function updateNotificationIcon() {
    var indicator = document.querySelector('.notification-indicator');
    var mailStatus = indicator.querySelector('.mail-status');
    mailStatus.classList.remove('gns-unread-ignored');
    if(!showIgnoredNotificationsAnyway &&
       foundNotificationsToHide &&
       !foundNotificationsToShow) {
      mailStatus.classList.add('gns-unread-ignored');
    }
    mailStatus.style.opacity = 1;
  }

  function updateNotificationLists() {
    var ignoreClass = 'github-notification-snoozer-ignored';
    var selector = '.notifications-list .boxed-group';
    [].forEach.call(document.querySelectorAll(selector), function(el) {
      var titleDOMElement = el.querySelector('h3');
      var notificationsListName = titleDOMElement.innerText.trim();
      el.classList.remove(ignoreClass);
      for(var i = 0; i < ignoreRegexes.length; i++) {
        var ignoreRegex = ignoreRegexes[i];
        if(!showIgnoredNotificationsAnyway &&
           ignoreRegex.test(notificationsListName)) {
          el.classList.add(ignoreClass);
        }
      }

      notificationsDiv.classList.add('gms-hidden');
      if(foundNotificationsToHide) {
        notificationsDiv.classList.remove('gms-hidden');
      }
      document.querySelector('.notifications-list').style.display = 'block';
    });
  }

  var notificationsDiv = document.createElement('div');
  notificationsDiv.classList.add('notifications');
  notificationsDiv.classList.add('gms-ignored');
  var notificationsMoreDiv = document.createElement('div');
  notificationsMoreDiv.classList.add('notifications-more');
  var a = document.createElement('a');
  a.innerText = '(Some notifications were hidden.)';
  a.addEventListener('click', function() {
    showIgnoredNotificationsAnyway = true;
    updateNotificationIcon();
    updateNotificationLists();
    notificationsDiv.classList.add('gms-hidden');
  });
  notificationsDiv.classList.add('gms-hidden');
  notificationsMoreDiv.appendChild(a);
  notificationsDiv.appendChild(notificationsMoreDiv);
  setTimeout(function() {
  	document.querySelector('.notifications-list').appendChild(notificationsDiv);
  }, 100);
  
})();
