import { Database } from './database';
import { evolutionSystem } from './evolutionSystem';
import { sharedMemorySystem } from './sharedMemorySystem';
import { analyticsSystem } from './analyticsSystem';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  hooks: PluginHook[];
  apiEndpoints?: PluginEndpoint[];
  settings?: PluginSetting[];
}

export interface PluginPermission {
  type: 'read' | 'write' | 'admin';
  resource: 'chat' | 'memory' | 'companions' | 'analytics' | 'system';
  scope?: string; // e.g., specific companion ID, memory type
}

export interface PluginHook {
  event: PluginEvent;
  handler: string; // Function name in plugin
  priority?: number;
}

export interface PluginEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: string;
  authRequired: boolean;
}

export interface PluginSetting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  defaultValue: any;
  options?: string[]; // For select type
  required: boolean;
}

export type PluginEvent =
  | 'message_received'
  | 'message_sent'
  | 'companion_created'
  | 'companion_updated'
  | 'memory_created'
  | 'memory_accessed'
  | 'evolution_triggered'
  | 'analytics_viewed'
  | 'plugin_installed'
  | 'plugin_uninstalled';

export interface PluginContext {
  userId?: string;
  companionId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface PluginResult {
  success: boolean;
  data?: any;
  error?: string;
  modified?: boolean;
}

export interface ExternalAPIRequest {
  pluginId: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface ExternalAPIResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export class PluginSystem {
  private plugins: Map<string, PluginInstance> = new Map();
  private apiKeys: Map<string, PluginAPIKey> = new Map();
  private eventListeners: Map<PluginEvent, PluginHookInstance[]> = new Map();

  /**
   * Install a plugin
   */
  async installPlugin(manifest: PluginManifest, code: string): Promise<PluginResult> {
    try {
      // Validate manifest
      const validation = this.validateManifest(manifest);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Create plugin instance
      const plugin: PluginInstance = {
        manifest,
        code,
        enabled: true,
        settings: this.initializeSettings(manifest.settings || []),
        installedAt: new Date(),
        lastUsed: new Date(),
      };

      // Register hooks
      this.registerHooks(manifest.hooks || [], manifest.id);

      // Store plugin
      this.plugins.set(manifest.id, plugin);

      // Persist to database
      await this.savePluginToDatabase(plugin);

      // Emit installation event
      await this.emitEvent('plugin_installed', { pluginId: manifest.id });

      return { success: true, data: { pluginId: manifest.id } };
    } catch (error) {
      return {
        success: false,
        error: `Failed to install plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<PluginResult> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return { success: false, error: 'Plugin not found' };
      }

      // Unregister hooks
      this.unregisterHooks(plugin.manifest.hooks || []);

      // Remove API keys
      for (const [key, apiKey] of this.apiKeys.entries()) {
        if (apiKey.pluginId === pluginId) {
          this.apiKeys.delete(key);
        }
      }

      // Remove from storage
      this.plugins.delete(pluginId);
      await this.removePluginFromDatabase(pluginId);

      // Emit uninstallation event
      await this.emitEvent('plugin_uninstalled', { pluginId });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to uninstall plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute plugin hook
   */
  async executeHook(
    event: PluginEvent,
    context: PluginContext,
    data?: any
  ): Promise<PluginResult[]> {
    const hooks = this.eventListeners.get(event) || [];
    const results: PluginResult[] = [];

    for (const hook of hooks.sort((a, b) => (a.priority || 0) - (b.priority || 0))) {
      const plugin = this.plugins.get(hook.pluginId);
      if (!plugin || !plugin.enabled) continue;

      try {
        const result = await this.executePluginFunction(plugin, hook.handler, {
          context,
          data,
          event,
        });
        results.push(result);
      } catch (error) {
        console.error(`Plugin ${hook.pluginId} hook ${hook.handler} failed:`, error);
        results.push({
          success: false,
          error: `Hook execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return results;
  }

  /**
   * Handle external API request
   */
  async handleExternalAPI(request: ExternalAPIRequest): Promise<ExternalAPIResponse> {
    try {
      // Validate API key
      const apiKey = this.apiKeys.get(request.headers['x-api-key'] || '');
      if (!apiKey || !apiKey.enabled) {
        return {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Invalid or disabled API key' },
        };
      }

      const plugin = this.plugins.get(apiKey.pluginId);
      if (!plugin || !plugin.enabled) {
        return {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Plugin not available' },
        };
      }

      // Find matching endpoint
      const endpoint = plugin.manifest.apiEndpoints?.find(
        ep => ep.path === request.endpoint && ep.method === request.method
      );

      if (!endpoint) {
        return {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Endpoint not found' },
        };
      }

      // Check authentication if required
      if (endpoint.authRequired && !request.headers.authorization) {
        return {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Authentication required' },
        };
      }

      // Execute plugin function
      const result = await this.executePluginFunction(plugin, endpoint.handler, {
        request,
        context: { pluginId: apiKey.pluginId },
      });

      if (!result.success) {
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: { error: result.error || 'Plugin execution failed' },
        };
      }

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: result.data,
      };
    } catch (error) {
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Generate API key for plugin
   */
  generateAPIKey(pluginId: string, name: string, permissions: string[]): string {
    const apiKey = `hive_${pluginId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.apiKeys.set(apiKey, {
      key: apiKey,
      pluginId,
      name,
      permissions,
      enabled: true,
      createdAt: new Date(),
      lastUsed: new Date(),
    });

    return apiKey;
  }

  /**
   * Get installed plugins
   */
  getInstalledPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin API keys
   */
  getPluginAPIKeys(pluginId: string): PluginAPIKey[] {
    return Array.from(this.apiKeys.values()).filter(key => key.pluginId === pluginId);
  }

  /**
   * Update plugin settings
   */
  async updatePluginSettings(
    pluginId: string,
    settings: Record<string, any>
  ): Promise<PluginResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, error: 'Plugin not found' };
    }

    plugin.settings = { ...plugin.settings, ...settings };
    await this.savePluginToDatabase(plugin);

    return { success: true };
  }

  // Private methods

  private validateManifest(manifest: PluginManifest): { success: boolean; error?: string } {
    if (!manifest.id || !manifest.name || !manifest.version) {
      return { success: false, error: 'Missing required manifest fields' };
    }

    if (!Array.isArray(manifest.permissions) || !Array.isArray(manifest.hooks)) {
      return { success: false, error: 'Permissions and hooks must be arrays' };
    }

    // Validate permissions
    for (const permission of manifest.permissions) {
      if (!['read', 'write', 'admin'].includes(permission.type)) {
        return { success: false, error: `Invalid permission type: ${permission.type}` };
      }
      if (!['chat', 'memory', 'companions', 'analytics', 'system'].includes(permission.resource)) {
        return { success: false, error: `Invalid permission resource: ${permission.resource}` };
      }
    }

    return { success: true };
  }

  private initializeSettings(settings: PluginSetting[]): Record<string, any> {
    const initialized: Record<string, any> = {};
    for (const setting of settings) {
      initialized[setting.key] = setting.defaultValue;
    }
    return initialized;
  }

  private registerHooks(hooks: PluginHook[], pluginId: string): void {
    for (const hook of hooks) {
      if (!this.eventListeners.has(hook.event)) {
        this.eventListeners.set(hook.event, []);
      }
      this.eventListeners.get(hook.event)!.push({
        ...hook,
        pluginId,
      });
    }
  }

  private unregisterHooks(hooks: PluginHook[]): void {
    for (const hook of hooks) {
      const listeners = this.eventListeners.get(hook.event) || [];
      const index = listeners.findIndex(l => l.handler === hook.handler);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  private async executePluginFunction(
    plugin: PluginInstance,
    functionName: string,
    params: any
  ): Promise<PluginResult> {
    try {
      // Create isolated context for plugin execution
      const context = {
        // Provide access to system APIs based on permissions
        apis: this.createPluginAPIContext(plugin.manifest.permissions),
        settings: plugin.settings,
        ...params,
      };

      // Execute plugin function (in a real implementation, this would be sandboxed)
      // For now, we'll simulate plugin execution
      const result = await this.simulatePluginExecution(plugin, functionName, context);

      plugin.lastUsed = new Date();
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Plugin execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private createPluginAPIContext(permissions: PluginPermission[]) {
    const context: any = {};

    // Grant access based on permissions
    for (const permission of permissions) {
      switch (permission.resource) {
        case 'chat':
          if (permission.type === 'read') {
            context.chat = {
              getRecentMessages: (limit: number) => this.getRecentMessages(limit),
              getConversation: (conversationId: string) => this.getConversation(conversationId),
            };
          }
          break;
        case 'memory':
          if (permission.type === 'read') {
            context.memory = {
              getMemories: (companionId: string) =>
                sharedMemorySystem.getAccessibleMemories(companionId),
            };
          }
          if (permission.type === 'write') {
            context.memory.shareMemory = (
              memoryId: string,
              fromCompanionId: string,
              toCompanions: string[]
            ) => sharedMemorySystem.shareMemory(memoryId, fromCompanionId, toCompanions);
          }
          break;
        case 'companions':
          if (permission.type === 'read') {
            context.companions = {
              getCompanions: () => this.getCompanions(),
              getCompanion: (id: string) => this.getCompanion(id),
            };
          }
          break;
        case 'analytics':
          if (permission.type === 'read') {
            context.analytics = {
              getUsageStats: () => analyticsSystem.getUsageStats(),
              getMemoryStats: () => analyticsSystem.getMemoryStats(),
            };
          }
          break;
      }
    }

    return context;
  }

  private async simulatePluginExecution(
    plugin: PluginInstance,
    functionName: string,
    context: any
  ): Promise<PluginResult> {
    // This is a simulation - in a real implementation, you'd execute the plugin code
    // in a sandboxed environment (e.g., using vm2, or Web Workers)

    // For demonstration, we'll handle some common plugin functions
    switch (functionName) {
      case 'onMessageReceived':
        // Example: Log message or modify it
        console.log(`Plugin ${plugin.manifest.id}: Message received`, context.data);
        return { success: true, data: context.data };

      case 'getCompanionStats':
        const stats = await analyticsSystem.getUsageStats();
        return { success: true, data: stats };

      case 'createMemory':
        if (context.apis.memory?.createMemory) {
          const result = await context.apis.memory.createMemory(context.data);
          return { success: true, data: result };
        }
        return { success: false, error: 'Insufficient permissions' };

      default:
        return {
          success: true,
          data: { message: `Plugin ${plugin.manifest.id} executed ${functionName}` },
        };
    }
  }

  private async emitEvent(event: PluginEvent, data?: any): Promise<void> {
    await this.executeHook(event, {}, data);
  }

  // Database operations (simulated)
  private async savePluginToDatabase(plugin: PluginInstance): Promise<void> {
    // In a real implementation, save to database
    console.log('Saving plugin to database:', plugin.manifest.id);
  }

  private async removePluginFromDatabase(pluginId: string): Promise<void> {
    // In a real implementation, remove from database
    console.log('Removing plugin from database:', pluginId);
  }

  // Mock data access methods
  private async getRecentMessages(limit: number): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getConversation(conversationId: string): Promise<any> {
    // Mock implementation
    return {};
  }

  private async getCompanions(): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getCompanion(id: string): Promise<any> {
    // Mock implementation
    return {};
  }
}

export interface PluginInstance {
  manifest: PluginManifest;
  code: string;
  enabled: boolean;
  settings: Record<string, any>;
  installedAt: Date;
  lastUsed: Date;
}

export interface PluginAPIKey {
  key: string;
  pluginId: string;
  name: string;
  permissions: string[];
  enabled: boolean;
  createdAt: Date;
  lastUsed: Date;
}

export interface PluginHookInstance extends PluginHook {
  pluginId: string;
}

// Global plugin system instance
export const pluginSystem = new PluginSystem();
