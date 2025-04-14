// Service Worker for handling push notifications
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.message,
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: {
      url: data.url
    },
    vibrate: [200, 100, 200],
    tag: 'message-notification', // Add tag to group notifications
    renotify: true // Allow new notifications to override previous ones
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});