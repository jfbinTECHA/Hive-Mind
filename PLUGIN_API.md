# 🔌 AI Hive Mind Plugin API

## Overview

The AI Hive Mind Plugin API allows external applications and services to interact with the AI companion system through a secure, extensible plugin architecture. Plugins can extend functionality, integrate with external services, and provide custom behaviors for AI companions.

## Architecture

### Plugin System Components

1. **Plugin Manifest**: JSON configuration defining plugin capabilities and requirements
2. **Plugin Code**: JavaScript functions implementing plugin logic
3. **Event Hooks**: Integration points for responding to system events
4. **API Endpoints**: Custom REST endpoints exposed by plugins
5. **Permission System**: Granular access control for plugin capabilities

### Security Model

- **Sandboxed Execution**: Plugins run in isolated environments
- **Permission-Based Access**: Explicit permissions required for system resources
- **API Key Authentication**: Secure external access via generated API keys
- **Audit Logging**: All plugin actions are logged for security monitoring

## Plugin Manifest

Every plugin must include a valid manifest file defining its capabilities:

```json
{
  "id": "unique-plugin-id",
  "name": "Plugin Display Name",
  "version": "1.0.0",
  "description": "Brief description of plugin functionality",
  "author": "Plugin Author",
  "permissions": [
    {
      "type": "read|write|admin",
      "resource": "chat|memory|companions|analytics|system",
      "scope": "optional-scope-limitation"
    }
  ],
  "hooks": [
    {
      "event": "message_received|message_sent|companion_created|...",
      "handler": "functionName",
      "priority": 0
    }
  ],
  "apiEndpoints": [
    {
      "path": "/custom-endpoint",
      "method": "GET|POST|PUT|DELETE",
      "handler": "handlerFunction",
      "authRequired": true
    }
  ],
  "settings": [
    {
      "key": "settingKey",
      "type": "string|number|boolean|select",
      "label": "Human-readable label",
      "defaultValue": "default value",
      "options": ["for select type"],
      "required": false
    }
  ]
}
```

## Plugin Development

### Basic Plugin Structure

```javascript
// plugin.js
const pluginManifest = { /* manifest object */ };

// Plugin state
let pluginState = {};

// Plugin functions
function myEventHandler(context, data) {
  // Handle event
  return { success: true, data: result };
}

function myAPIHandler(context, data) {
  // Handle API request
  return { success: true, data: responseData };
}

// Export plugin interface
module.exports = {
  manifest: pluginManifest,
  myEventHandler,
  myAPIHandler
};
```

### Available Permissions

| Resource | Read | Write | Admin | Description |
|----------|------|-------|-------|-------------|
| `chat` | View messages | Send messages | Full chat control | Access to conversation system |
| `memory` | View memories | Create/edit memories | Full memory control | Access to companion memories |
| `companions` | View companions | Modify companions | Full companion control | Access to AI companion management |
| `analytics` | View analytics | N/A | Full analytics control | Access to usage statistics |
| `system` | System status | System configuration | Full system control | Access to system settings |

### Event Hooks

Plugins can hook into system events to extend functionality:

#### Message Events
- `message_received`: When a user sends a message
- `message_sent`: When AI sends a response
- `message_deleted`: When a message is removed

#### Companion Events
- `companion_created`: When a new companion is created
- `companion_updated`: When companion settings change
- `companion_deleted`: When a companion is removed

#### Memory Events
- `memory_created`: When a new memory is stored
- `memory_accessed`: When a memory is retrieved
- `memory_updated`: When memory content changes

#### System Events
- `analytics_viewed`: When analytics are accessed
- `plugin_installed`: When a plugin is installed
- `plugin_uninstalled`: When a plugin is removed

### Context Object

Event handlers receive a context object:

```javascript
{
  userId: "user-identifier",
  companionId: "companion-identifier",
  sessionId: "session-identifier",
  metadata: {
    // Additional context data
  }
}
```

## API Integration

### External API Access

External applications can interact with plugins via REST API:

```javascript
// Make authenticated request to plugin endpoint
const response = await fetch('https://your-domain.com/api/plugins', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-plugin-api-key'
  },
  body: JSON.stringify({
    pluginId: 'your-plugin-id',
    endpoint: '/custom-endpoint',
    method: 'GET',
    body: { param: 'value' },
    query: { filter: 'active' }
  })
});

const result = await response.json();
```

### API Key Management

1. **Generate API Key**: Use the Plugin Manager UI or API
2. **Set Permissions**: Define what the key can access
3. **Monitor Usage**: Track API key usage and revoke if needed
4. **Rotate Keys**: Regularly rotate keys for security

## Example Plugins

### Notification Plugin

```javascript
const pluginManifest = {
  id: 'notification-manager',
  name: 'Notification Manager',
  version: '1.0.0',
  description: 'Manages notifications for AI interactions',
  author: 'AI Hive Mind',
  permissions: [
    { type: 'read', resource: 'chat' },
    { type: 'read', resource: 'memory' }
  ],
  hooks: [
    { event: 'message_received', handler: 'onMessageReceived' }
  ],
  apiEndpoints: [
    {
      path: '/notifications',
      method: 'GET',
      handler: 'getNotifications',
      authRequired: true
    }
  ]
};

function onMessageReceived(context, data) {
  // Create notification for new message
  console.log('New message received:', data.message);
  return { success: true };
}

function getNotifications(context, data) {
  // Return list of notifications
  return { success: true, data: { notifications: [] } };
}

module.exports = {
  manifest: pluginManifest,
  onMessageReceived,
  getNotifications
};
```

### Analytics Plugin

```javascript
const pluginManifest = {
  id: 'advanced-analytics',
  name: 'Advanced Analytics',
  version: '1.0.0',
  description: 'Provides advanced analytics and reporting',
  author: 'Analytics Corp',
  permissions: [
    { type: 'read', resource: 'analytics' },
    { type: 'read', resource: 'companions' }
  ],
  hooks: [
    { event: 'analytics_viewed', handler: 'onAnalyticsViewed' }
  ],
  apiEndpoints: [
    {
      path: '/reports',
      method: 'GET',
      handler: 'generateReport',
      authRequired: true
    }
  ]
};

function onAnalyticsViewed(context, data) {
  // Track analytics access
  console.log('Analytics viewed by:', context.userId);
  return { success: true };
}

function generateReport(context, data) {
  // Generate custom report
  return {
    success: true,
    data: {
      reportType: data.type || 'summary',
      generatedAt: new Date(),
      data: {}
    }
  };
}

module.exports = {
  manifest: pluginManifest,
  onAnalyticsViewed,
  generateReport
};
```

## Installation & Management

### Installing Plugins

1. **Via Plugin Manager UI**:
   - Open Plugin Manager from sidebar
   - Click "Install Plugin"
   - Paste manifest JSON and plugin code
   - Configure settings and permissions

2. **Programmatic Installation**:
   ```javascript
   const result = await pluginSystem.installPlugin(manifest, code);
   ```

### Managing Plugins

- **Enable/Disable**: Toggle plugin active status
- **Update Settings**: Modify plugin configuration
- **Generate API Keys**: Create access keys for external use
- **Monitor Usage**: View plugin activity and performance
- **Uninstall**: Remove plugins and clean up resources

## Best Practices

### Security
- **Minimal Permissions**: Request only necessary permissions
- **Input Validation**: Validate all external inputs
- **Error Handling**: Don't expose internal system details in errors
- **API Key Rotation**: Regularly rotate API keys

### Performance
- **Efficient Code**: Optimize plugin execution time
- **Resource Limits**: Be mindful of memory and CPU usage
- **Caching**: Cache expensive operations when appropriate
- **Async Operations**: Use async/await for I/O operations

### User Experience
- **Clear Documentation**: Document plugin capabilities and usage
- **Error Messages**: Provide helpful error messages
- **Configuration**: Make plugins configurable for different use cases
- **Compatibility**: Test with different companion configurations

## API Reference

### Plugin System Methods

```typescript
// Install plugin
installPlugin(manifest: PluginManifest, code: string): Promise<PluginResult>

// Uninstall plugin
uninstallPlugin(pluginId: string): Promise<PluginResult>

// Execute hook
executeHook(event: PluginEvent, context: PluginContext, data?: any): Promise<PluginResult[]>

// Handle external API request
handleExternalAPI(request: ExternalAPIRequest): Promise<ExternalAPIResponse>

// Generate API key
generateAPIKey(pluginId: string, name: string, permissions: string[]): string

// Get installed plugins
getInstalledPlugins(): PluginInstance[]

// Update plugin settings
updatePluginSettings(pluginId: string, settings: Record<string, any>): Promise<PluginResult>
```

### REST API Endpoints

```
GET  /api/plugins?action=list                    # List installed plugins
GET  /api/plugins?action=keys&pluginId=ID        # Get plugin API keys
POST /api/plugins                                 # Execute plugin API endpoint
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check plugin permissions in manifest
2. **Hook Not Firing**: Verify event name and handler function
3. **API Key Invalid**: Regenerate API key or check permissions
4. **Plugin Not Loading**: Check manifest JSON syntax and code errors

### Debugging

- **Console Logs**: Check browser/server console for plugin errors
- **Plugin Manager**: View plugin status and error messages
- **API Logs**: Monitor external API request/response logs
- **Event Logs**: Track which events are firing and when

## Support

For plugin development support:

- **Documentation**: This API reference
- **Examples**: Check `example-plugin.js` for reference implementations
- **Community**: GitHub Discussions for plugin development questions
- **Issues**: Report bugs and request features on GitHub

---

The Plugin API provides a powerful way to extend and integrate with the AI Hive Mind system, enabling custom functionality and external service integrations while maintaining security and performance.