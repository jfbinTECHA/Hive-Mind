// Example Plugin: Notification Manager
// This plugin demonstrates how to create plugins for the AI Hive Mind system

const pluginManifest = {
  id: 'notification-manager',
  name: 'Notification Manager',
  version: '1.0.0',
  description: 'Manages notifications and alerts for AI companion interactions',
  author: 'AI Hive Mind',
  permissions: [
    {
      type: 'read',
      resource: 'chat'
    },
    {
      type: 'read',
      resource: 'memory'
    }
  ],
  hooks: [
    {
      event: 'message_received',
      handler: 'onMessageReceived'
    },
    {
      event: 'companion_created',
      handler: 'onCompanionCreated'
    }
  ],
  apiEndpoints: [
    {
      path: '/notifications',
      method: 'GET',
      handler: 'getNotifications',
      authRequired: true
    },
    {
      path: '/notifications/settings',
      method: 'POST',
      handler: 'updateSettings',
      authRequired: true
    }
  ],
  settings: [
    {
      key: 'enableDesktopNotifications',
      type: 'boolean',
      label: 'Enable Desktop Notifications',
      defaultValue: true,
      required: false
    },
    {
      key: 'notificationSound',
      type: 'select',
      label: 'Notification Sound',
      defaultValue: 'bell',
      options: ['bell', 'chime', 'ping', 'silent'],
      required: false
    },
    {
      key: 'maxNotifications',
      type: 'number',
      label: 'Maximum Notifications to Keep',
      defaultValue: 100,
      required: false
    }
  ]
};

// Plugin state
let notifications = [];
let settings = {};

// Plugin functions
function onMessageReceived(context, data) {
  try {
    // Check if this is a message that should trigger a notification
    if (data && data.message && data.message.length > 0) {
      const notification = {
        id: Date.now().toString(),
        type: 'message',
        title: 'New Message from AI',
        message: data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
        timestamp: new Date(),
        companionId: context.companionId,
        priority: 'normal'
      };

      notifications.unshift(notification);

      // Keep only the most recent notifications
      if (notifications.length > (settings.maxNotifications || 100)) {
        notifications = notifications.slice(0, settings.maxNotifications || 100);
      }

      // Trigger desktop notification if enabled
      if (settings.enableDesktopNotifications !== false) {
        showDesktopNotification(notification);
      }

      console.log('Notification created:', notification.title);
    }

    return { success: true, data: { notificationCreated: true } };
  } catch (error) {
    console.error('Error in onMessageReceived:', error);
    return { success: false, error: error.message };
  }
}

function onCompanionCreated(context, data) {
  try {
    const notification = {
      id: Date.now().toString(),
      type: 'system',
      title: 'New Companion Created',
      message: `A new AI companion has been created: ${data?.name || 'Unknown'}`,
      timestamp: new Date(),
      priority: 'high'
    };

    notifications.unshift(notification);

    if (settings.enableDesktopNotifications !== false) {
      showDesktopNotification(notification);
    }

    console.log('Companion creation notification:', notification.title);
    return { success: true };
  } catch (error) {
    console.error('Error in onCompanionCreated:', error);
    return { success: false, error: error.message };
  }
}

function getNotifications(context, data) {
  try {
    const limit = data?.limit || 50;
    const offset = data?.offset || 0;

    return {
      success: true,
      data: {
        notifications: notifications.slice(offset, offset + limit),
        total: notifications.length,
        limit,
        offset
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateSettings(context, data) {
  try {
    if (data && typeof data === 'object') {
      settings = { ...settings, ...data };
      console.log('Notification settings updated:', settings);
      return { success: true, data: settings };
    } else {
      return { success: false, error: 'Invalid settings data' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function showDesktopNotification(notification) {
  // In a real browser environment, this would use the Notification API
  // For this example, we'll just log it
  console.log('🔔 Desktop Notification:', {
    title: notification.title,
    body: notification.message,
    icon: '/notification-icon.png'
  });

  // Play sound if enabled
  if (settings.notificationSound && settings.notificationSound !== 'silent') {
    playNotificationSound(settings.notificationSound);
  }
}

function playNotificationSound(soundType) {
  // In a real implementation, this would play audio files
  console.log('🔊 Playing sound:', soundType);
}

// Initialize settings with defaults
settings = {};
pluginManifest.settings.forEach(setting => {
  settings[setting.key] = setting.defaultValue;
});

// Export the plugin
module.exports = {
  manifest: pluginManifest,
  onMessageReceived,
  onCompanionCreated,
  getNotifications,
  updateSettings
};

// Example usage in external application:
//
// const response = await fetch('https://your-domain.com/api/plugins', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'x-api-key': 'your-plugin-api-key'
//   },
//   body: JSON.stringify({
//     pluginId: 'notification-manager',
//     endpoint: '/notifications',
//     method: 'GET',
//     body: { limit: 10 }
//   })
// });
//
// const notifications = await response.json();