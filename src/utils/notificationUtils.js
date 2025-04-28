import { supabase } from '../lib/supabase'

let notificationSupported = false;
let swRegistration = null;

export async function initializeNotifications() {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('Notifications not supported in this browser');
      return false;
    }

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');

        // Get VAPID public key from server
        const response = await fetch('https://chat-app-gsjg.onrender.com/api/push/vapid-public-key');
        const { key } = await response.json();

        // Request permission
        const permission = await Notification.requestPermission();
        notificationSupported = permission === 'granted';

        if (notificationSupported && key) {
          // Subscribe to push notifications
          const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key
          });

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Send subscription to server
            await fetch('https://chat-app-gsjg.onrender.com/api/push/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscription,
                userId: user.id
              }),
            });
          }
        }
      } catch (error) {
        console.error('Service Worker/Push registration failed:', error);
      }
    }

    return notificationSupported;
  } catch (error) {
    console.log('Notification initialization failed:', error.message);
    return false;
  }
}

export function showNotification(title, message, userId) {
  if (!notificationSupported || document.visibilityState === 'visible') {
    return;
  }

  try {
    const options = {
      body: message,
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: 'message-notification',
      renotify: true,
      data: {
        userId,
        url: `${window.location.origin}?chat=${userId}`
      },
      vibrate: [200, 100, 200]
    };

    if (swRegistration) {
      // Use service worker to show notification
      swRegistration.showNotification(title, options);
    } else {
      // Fallback to regular notification
      const notification = new Notification(title, options);
      
      notification.onclick = function() {
        window.focus();
        if (this.data.url) {
          window.location.href = this.data.url;
        }
        notification.close();
      };
    }
  } catch (error) {
    console.log('Failed to show notification:', error.message);
  }
}
