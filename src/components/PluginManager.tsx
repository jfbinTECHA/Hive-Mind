'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { pluginSystem, PluginInstance, PluginManifest, PluginAPIKey } from '@/lib/pluginSystem';
import { Button } from '@/components/ui/Button';
import {
  Puzzle,
  Plus,
  Settings,
  Key,
  Trash2,
  Upload,
  Download,
  Play,
  Pause,
  ExternalLink,
  Code,
  Shield,
  Zap,
} from 'lucide-react';

interface PluginManagerProps {
  onClose?: () => void;
}

export function PluginManager({ onClose }: PluginManagerProps) {
  const { state } = useApp();
  const [plugins, setPlugins] = useState<PluginInstance[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInstance | null>(null);
  const [apiKeys, setApiKeys] = useState<PluginAPIKey[]>([]);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [manifestText, setManifestText] = useState('');
  const [codeText, setCodeText] = useState('');

  useEffect(() => {
    loadPlugins();
  }, []);

  useEffect(() => {
    if (selectedPlugin) {
      loadPluginAPIKeys(selectedPlugin.manifest.id);
    }
  }, [selectedPlugin]);

  const loadPlugins = () => {
    const installedPlugins = pluginSystem.getInstalledPlugins();
    setPlugins(installedPlugins);
  };

  const loadPluginAPIKeys = (pluginId: string) => {
    const keys = pluginSystem.getPluginAPIKeys(pluginId);
    setApiKeys(keys);
  };

  const handleInstallPlugin = async () => {
    if (!manifestText.trim() || !codeText.trim()) {
      alert('Please provide both manifest and code');
      return;
    }

    setInstalling(true);
    try {
      const manifest: PluginManifest = JSON.parse(manifestText);
      const result = await pluginSystem.installPlugin(manifest, codeText);

      if (result.success) {
        alert('Plugin installed successfully!');
        setShowInstallDialog(false);
        setManifestText('');
        setCodeText('');
        loadPlugins();
      } else {
        alert(`Installation failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Invalid manifest JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await pluginSystem.uninstallPlugin(pluginId);
      if (result.success) {
        alert('Plugin uninstalled successfully!');
        loadPlugins();
        if (selectedPlugin?.manifest.id === pluginId) {
          setSelectedPlugin(null);
        }
      } else {
        alert(`Uninstallation failed: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to uninstall plugin');
    }
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    // In a real implementation, you'd update the plugin status
    // For now, we'll just reload the plugins
    loadPlugins();
  };

  const handleGenerateAPIKey = (pluginId: string) => {
    const name = prompt('Enter a name for this API key:');
    if (!name) return;

    const permissions = ['read']; // Basic permissions
    const apiKey = pluginSystem.generateAPIKey(pluginId, name, permissions);

    alert(`API Key generated: ${apiKey}\n\nKeep this key secure!`);
    loadPluginAPIKeys(pluginId);
  };

  const handleDeleteAPIKey = (key: string) => {
    // In a real implementation, you'd delete the key from the system
    // For now, we'll just reload
    if (selectedPlugin) {
      loadPluginAPIKeys(selectedPlugin.manifest.id);
    }
  };

  const getPermissionIcon = (type: string) => {
    switch (type) {
      case 'read':
        return '👁️';
      case 'write':
        return '✏️';
      case 'admin':
        return '⚡';
      default:
        return '🔒';
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'chat':
        return '💬';
      case 'memory':
        return '🧠';
      case 'companions':
        return '👥';
      case 'analytics':
        return '📊';
      case 'system':
        return '⚙️';
      default:
        return '🔧';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <Puzzle className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Plugin Manager</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowInstallDialog(true)}
            className="bg-blue-500/20 hover:bg-blue-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Install Plugin
          </Button>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Plugin List */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-medium text-white">Installed Plugins</h3>
            <p className="text-sm text-gray-400">{plugins.length} plugins</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {plugins.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No plugins installed</p>
                <p className="text-sm mt-2">Install your first plugin to get started</p>
              </div>
            ) : (
              plugins.map(plugin => (
                <div
                  key={plugin.manifest.id}
                  onClick={() => setSelectedPlugin(plugin)}
                  className={`p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 ${
                    selectedPlugin?.manifest.id === plugin.manifest.id
                      ? 'bg-blue-500/10 border-l-4 border-l-blue-400'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{plugin.manifest.name}</h4>
                    <div
                      className={`w-2 h-2 rounded-full ${plugin.enabled ? 'bg-green-400' : 'bg-gray-400'}`}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{plugin.manifest.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>v{plugin.manifest.version}</span>
                    <span>•</span>
                    <span>{plugin.manifest.author}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plugin Details */}
        <div className="flex-1 flex flex-col">
          {selectedPlugin ? (
            <>
              {/* Plugin Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${selectedPlugin.enabled ? 'bg-green-400' : 'bg-red-400'}`}
                    />
                    <h3 className="text-xl font-semibold text-white">
                      {selectedPlugin.manifest.name}
                    </h3>
                    <span className="text-sm text-gray-400">
                      v{selectedPlugin.manifest.version}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() =>
                        handleTogglePlugin(selectedPlugin.manifest.id, !selectedPlugin.enabled)
                      }
                      variant="outline"
                      size="sm"
                      className={
                        selectedPlugin.enabled
                          ? 'border-red-500/50 text-red-400'
                          : 'border-green-500/50 text-green-400'
                      }
                    >
                      {selectedPlugin.enabled ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {selectedPlugin.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      onClick={() => handleUninstallPlugin(selectedPlugin.manifest.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-gray-300 mb-4">{selectedPlugin.manifest.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Author:</span>
                    <span className="text-white ml-2">{selectedPlugin.manifest.author}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Installed:</span>
                    <span className="text-white ml-2">
                      {selectedPlugin.installedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Used:</span>
                    <span className="text-white ml-2">
                      {selectedPlugin.lastUsed.toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Permissions:</span>
                    <span className="text-white ml-2">
                      {selectedPlugin.manifest.permissions?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plugin Content Tabs */}
              <div className="flex-1 flex flex-col">
                <div className="flex border-b border-white/10">
                  <button className="flex-1 px-4 py-3 text-sm font-medium text-blue-400 border-b-2 border-blue-400">
                    Permissions
                  </button>
                  <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white">
                    API Keys
                  </button>
                  <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white">
                    Settings
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {/* Permissions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white mb-4">Plugin Permissions</h4>

                    {selectedPlugin.manifest.permissions?.map((permission, index) => (
                      <div key={index} className="p-4 rounded-lg border border-white/10 bg-white/5">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg">{getResourceIcon(permission.resource)}</span>
                          <div>
                            <h5 className="font-medium text-white capitalize">
                              {permission.type} access to {permission.resource}
                            </h5>
                            <p className="text-sm text-gray-400">
                              {permission.scope ? `Scope: ${permission.scope}` : 'Full access'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) || <p className="text-gray-400">No permissions configured</p>}

                    {/* API Keys Section */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-white">API Keys</h4>
                        <Button
                          onClick={() => handleGenerateAPIKey(selectedPlugin.manifest.id)}
                          size="sm"
                          className="bg-green-500/20 hover:bg-green-500/30"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Generate Key
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {apiKeys.length === 0 ? (
                          <p className="text-gray-400">No API keys generated</p>
                        ) : (
                          apiKeys.map(key => (
                            <div
                              key={key.key}
                              className="p-3 rounded border border-white/10 bg-white/5"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-white">{key.name}</p>
                                  <p className="text-sm text-gray-400 font-mono">
                                    {key.key.substring(0, 20)}...
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Created: {key.createdAt.toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${key.enabled ? 'bg-green-400' : 'bg-red-400'}`}
                                  />
                                  <Button
                                    onClick={() => handleDeleteAPIKey(key.key)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {key.permissions.map((perm, index) => (
                                  <span
                                    key={index}
                                    className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded"
                                  >
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Puzzle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium text-white mb-2">Select a Plugin</h3>
                <p>Choose a plugin from the list to view its details and manage its settings</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Install Plugin Dialog */}
      {showInstallDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-4/5 bg-gray-900 border border-white/10 rounded-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">Install Plugin</h3>
              <button
                onClick={() => setShowInstallDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Plugin Manifest (JSON)
                  </label>
                  <textarea
                    value={manifestText}
                    onChange={e => setManifestText(e.target.value)}
                    placeholder={`{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A useful plugin",
  "author": "Your Name",
  "permissions": [
    {
      "type": "read",
      "resource": "chat"
    }
  ],
  "hooks": [
    {
      "event": "message_received",
      "handler": "onMessageReceived"
    }
  ]
}`}
                    className="w-full h-48 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Plugin Code (JavaScript)
                  </label>
                  <textarea
                    value={codeText}
                    onChange={e => setCodeText(e.target.value)}
                    placeholder={`// Plugin code
function onMessageReceived(context, data) {
  console.log('Message received:', data);
  // Your plugin logic here
  return { success: true, data: data };
}

// Export plugin functions
module.exports = {
  onMessageReceived
};`}
                    className="w-full h-48 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="w-80 border-l border-white/10 p-4">
                <h4 className="text-lg font-medium text-white mb-4">Plugin Requirements</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">Security</p>
                      <p>Plugins run in a sandboxed environment with limited permissions</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Code className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">Code Requirements</p>
                      <p>Provide valid JSON manifest and JavaScript code</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">Permissions</p>
                      <p>Clearly define what resources your plugin needs access to</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <ExternalLink className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">API Access</p>
                      <p>Generate API keys for external application integration</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-4 border-t border-white/10">
              <Button onClick={() => setShowInstallDialog(false)} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleInstallPlugin}
                disabled={installing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {installing ? 'Installing...' : 'Install Plugin'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
