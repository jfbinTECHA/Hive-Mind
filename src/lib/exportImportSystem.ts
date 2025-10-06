import { sharedMemorySystem, SharedMemory, CompanionMemoryNetwork, MemoryCluster } from './sharedMemorySystem';
import { evolutionSystem, CompanionEvolution } from './evolutionSystem';

export interface MindMapNode {
  id: string;
  label: string;
  content?: string;
  position?: { x: number; y: number };
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    fontSize?: number;
    fontWeight?: string;
  };
  children?: MindMapNode[];
  metadata?: any;
}

export interface MindMapData {
  version: string;
  title: string;
  root: MindMapNode;
  settings?: {
    theme?: string;
    layout?: 'radial' | 'tree' | 'fishbone';
    direction?: 'left' | 'right' | 'both';
  };
  metadata: {
    exportedAt: Date;
    companionId?: string;
    exportType: 'memory_network' | 'companion_ecosystem' | 'evolution_history';
    version: string;
  };
}

export interface ExportOptions {
  format: 'json' | 'xmind';
  includePrivateMemories: boolean;
  includeEvolutionData: boolean;
  includeNetworkInsights: boolean;
  maxDepth: number;
  theme?: string;
}

export interface ImportResult {
  success: boolean;
  importedNodes: number;
  importedConnections: number;
  warnings: string[];
  errors: string[];
}

export class ExportImportSystem {
  /**
   * Export companion memory network as mind map
   */
  async exportMemoryNetwork(
    companionId: string,
    options: ExportOptions = { format: 'json', includePrivateMemories: true, includeEvolutionData: true, includeNetworkInsights: true, maxDepth: 3 }
  ): Promise<string> {
    const network = await sharedMemorySystem.getCompanionNetwork(companionId);
    const memories = await sharedMemorySystem.getAccessibleMemories(companionId);
    const clusters = await sharedMemorySystem.getMemoryClusters(companionId);

    let evolution: CompanionEvolution | null = null;
    if (options.includeEvolutionData) {
      evolution = await evolutionSystem.getCompanionEvolution(companionId);
    }

    const mindMapData = this.buildMemoryNetworkMindMap(
      companionId,
      network,
      memories,
      clusters,
      evolution,
      options
    );

    if (options.format === 'xmind') {
      return this.convertToXMind(mindMapData);
    } else {
      return JSON.stringify(mindMapData, null, 2);
    }
  }

  /**
   * Export entire companion ecosystem
   */
  async exportCompanionEcosystem(
    userId: string,
    options: ExportOptions = { format: 'json', includePrivateMemories: false, includeEvolutionData: true, includeNetworkInsights: true, maxDepth: 5 }
  ): Promise<string> {
    // Get all companions for the user
    const companions = await this.getUserCompanions(userId);

    const ecosystemMap: MindMapData = {
      version: '1.0',
      title: 'AI Companion Ecosystem',
      root: {
        id: 'ecosystem_root',
        label: 'AI Companion Ecosystem',
        content: `Complete ecosystem with ${companions.length} companions`,
        children: [],
        style: {
          backgroundColor: '#4F46E5',
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      settings: {
        layout: 'radial',
        theme: options.theme || 'dark'
      },
      metadata: {
        exportedAt: new Date(),
        exportType: 'companion_ecosystem',
        version: '1.0'
      }
    };

    // Add each companion as a major branch
    for (const companion of companions) {
      const companionNode = await this.buildCompanionNode(companion.id, options);
      ecosystemMap.root.children!.push(companionNode);
    }

    // Add ecosystem-level connections
    const connectionsNode: MindMapNode = {
      id: 'ecosystem_connections',
      label: 'Cross-Companion Connections',
      content: 'Shared memories and relationships between companions',
      children: [],
      style: {
        backgroundColor: '#7C3AED'
      }
    };

    // Analyze and add cross-companion relationships
    const crossConnections = await this.analyzeCrossCompanionConnections(companions.map(c => c.id));
    connectionsNode.children = crossConnections;

    ecosystemMap.root.children!.push(connectionsNode);

    if (options.format === 'xmind') {
      return this.convertToXMind(ecosystemMap);
    } else {
      return JSON.stringify(ecosystemMap, null, 2);
    }
  }

  /**
   * Export evolution history as timeline mind map
   */
  async exportEvolutionHistory(
    companionId: string,
    options: ExportOptions = { format: 'json', includePrivateMemories: false, includeEvolutionData: true, includeNetworkInsights: false, maxDepth: 2 }
  ): Promise<string> {
    const evolution = await evolutionSystem.getCompanionEvolution(companionId);

    const timelineMap: MindMapData = {
      version: '1.0',
      title: `${evolution.currentStage.name} Evolution Timeline`,
      root: {
        id: 'evolution_root',
        label: 'Evolution Journey',
        content: `From ${evolution.evolutionHistory[0]?.fromStage.name || 'Beginning'} to ${evolution.currentStage.name}`,
        children: [],
        style: {
          backgroundColor: '#F59E0B',
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      settings: {
        layout: 'tree',
        direction: 'right',
        theme: options.theme || 'evolution'
      },
      metadata: {
        exportedAt: new Date(),
        companionId,
        exportType: 'evolution_history',
        version: '1.0'
      }
    };

    // Add evolution stages as timeline
    let currentNode = timelineMap.root;
    for (const event of evolution.evolutionHistory) {
      const stageNode: MindMapNode = {
        id: `stage_${event.toStage.id}`,
        label: event.toStage.name,
        content: `${event.triggerReason}\nUnlocked: ${event.toStage.newCapabilities.join(', ')}`,
        children: [],
        style: {
          backgroundColor: this.getEvolutionStageColor(event.toStage.level)
        },
        metadata: {
          evolutionEvent: event,
          stage: event.toStage
        }
      };

      // Add trait changes
      if (Object.keys(event.toStage.traitChanges).length > 0) {
        stageNode.children!.push({
          id: `traits_${event.toStage.id}`,
          label: 'Trait Enhancements',
          children: Object.entries(event.toStage.traitChanges).map(([trait, change]) => ({
            id: `trait_${trait}_${event.toStage.id}`,
            label: `${trait}: +${change}`,
            style: { backgroundColor: '#10B981' }
          }))
        });
      }

      currentNode.children!.push(stageNode);
      currentNode = stageNode;
    }

    // Add current stage
    const currentStageNode: MindMapNode = {
      id: `current_${evolution.currentStage.id}`,
      label: `${evolution.currentStage.name} (Current)`,
      content: `Level ${evolution.currentStage.level}\n${evolution.currentStage.description}`,
      children: [
        {
          id: 'current_stats',
          label: 'Current Stats',
          children: [
            {
              id: 'interactions',
              label: `Interactions: ${evolution.totalInteractions}`,
              style: { backgroundColor: '#3B82F6' }
            },
            {
              id: 'intimacy',
              label: `Intimacy: ${Math.round(evolution.intimacyLevel * 100)}%`,
              style: { backgroundColor: '#8B5CF6' }
            },
            {
              id: 'trust',
              label: `Trust: ${Math.round(evolution.trustLevel * 100)}%`,
              style: { backgroundColor: '#06B6D4' }
            }
          ]
        }
      ],
      style: {
        backgroundColor: '#EF4444',
        fontWeight: 'bold'
      }
    };

    if (evolution.nextEvolution) {
      currentStageNode.children!.push({
        id: 'next_evolution',
        label: `Next: ${evolution.nextEvolution.name}`,
        content: `Progress: ${Math.round(evolution.progressToNext * 100)}%`,
        style: { backgroundColor: '#F59E0B' }
      });
    }

    timelineMap.root.children!.push(currentStageNode);

    if (options.format === 'xmind') {
      return this.convertToXMind(timelineMap);
    } else {
      return JSON.stringify(timelineMap, null, 2);
    }
  }

  /**
   * Import mind map data
   */
  async importMindMap(mindMapJson: string, targetCompanionId?: string): Promise<ImportResult> {
    try {
      const mindMapData: MindMapData = JSON.parse(mindMapJson);

      const result: ImportResult = {
        success: true,
        importedNodes: 0,
        importedConnections: 0,
        warnings: [],
        errors: []
      };

      // Process based on export type
      switch (mindMapData.metadata.exportType) {
        case 'memory_network':
          await this.importMemoryNetwork(mindMapData, targetCompanionId, result);
          break;
        case 'companion_ecosystem':
          await this.importCompanionEcosystem(mindMapData, result);
          break;
        case 'evolution_history':
          await this.importEvolutionHistory(mindMapData, targetCompanionId, result);
          break;
        default:
          result.errors.push('Unknown export type');
          result.success = false;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        importedNodes: 0,
        importedConnections: 0,
        warnings: [],
        errors: [`Failed to parse mind map: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Download exported data as file
   */
  downloadExport(data: string, filename: string, format: 'json' | 'xmind'): void {
    const blob = new Blob([data], {
      type: format === 'xmind' ? 'application/xmind' : 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Private helper methods

  private buildMemoryNetworkMindMap(
    companionId: string,
    network: CompanionMemoryNetwork,
    memories: SharedMemory[],
    clusters: MemoryCluster[],
    evolution: CompanionEvolution | null,
    options: ExportOptions
  ): MindMapData {
    const companionName = `Companion ${companionId}`; // Would get actual name

    const mindMap: MindMapData = {
      version: '1.0',
      title: `${companionName} Memory Network`,
      root: {
        id: 'memory_root',
        label: 'Memory Network',
        content: `${companionName}'s interconnected memories and relationships`,
        children: [],
        style: {
          backgroundColor: '#3B82F6',
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      settings: {
        layout: 'radial',
        theme: options.theme || 'network'
      },
      metadata: {
        exportedAt: new Date(),
        companionId,
        exportType: 'memory_network',
        version: '1.0'
      }
    };

    // Add memory clusters
    if (clusters.length > 0) {
      const clustersNode: MindMapNode = {
        id: 'clusters',
        label: 'Memory Clusters',
        children: clusters.map(cluster => ({
          id: `cluster_${cluster.id}`,
          label: cluster.theme,
          content: `${cluster.memories.length} memories, ${cluster.participants.length} participants`,
          children: cluster.memories.slice(0, options.maxDepth).map(memoryId => {
            const memory = memories.find(m => m.id === memoryId);
            return {
              id: `memory_${memoryId}`,
              label: memory?.content.substring(0, 50) + '...' || 'Unknown Memory',
              content: memory?.content,
              style: { backgroundColor: this.getMemoryTypeColor(memory?.memoryType) }
            };
          }),
          style: { backgroundColor: '#8B5CF6' }
        }))
      };
      mindMap.root.children!.push(clustersNode);
    }

    // Add network insights
    if (options.includeNetworkInsights && network.networkInsights.length > 0) {
      const insightsNode: MindMapNode = {
        id: 'insights',
        label: 'Network Insights',
        children: network.networkInsights.map(insight => ({
          id: `insight_${insight.type}_${Date.now()}`,
          label: insight.type.replace('_', ' '),
          content: insight.description,
          children: [
            {
              id: `confidence_${insight.type}`,
              label: `Confidence: ${Math.round(insight.confidence * 100)}%`,
              style: { backgroundColor: '#10B981' }
            },
            ...insight.relatedCompanions.map(companionId => ({
              id: `companion_${companionId}`,
              label: `Companion ${companionId}`,
              style: { backgroundColor: '#F59E0B' }
            }))
          ],
          style: { backgroundColor: '#06B6D4' }
        }))
      };
      mindMap.root.children!.push(insightsNode);
    }

    // Add evolution data
    if (options.includeEvolutionData && evolution) {
      const evolutionNode: MindMapNode = {
        id: 'evolution',
        label: `Evolution: ${evolution.currentStage.name}`,
        content: `Level ${evolution.currentLevel}, ${evolution.totalInteractions} interactions`,
        style: { backgroundColor: '#EF4444' }
      };
      mindMap.root.children!.push(evolutionNode);
    }

    return mindMap;
  }

  private async buildCompanionNode(companionId: string, options: ExportOptions): Promise<MindMapNode> {
    const evolution = await evolutionSystem.getCompanionEvolution(companionId);
    const memories = await sharedMemorySystem.getAccessibleMemories(companionId);

    return {
      id: `companion_${companionId}`,
      label: `Companion ${companionId}`,
      content: `${evolution.currentStage.name} (Level ${evolution.currentLevel})`,
      children: [
        {
          id: `stats_${companionId}`,
          label: 'Stats',
          children: [
            { id: `level_${companionId}`, label: `Level: ${evolution.currentLevel}` },
            { id: `interactions_${companionId}`, label: `Interactions: ${evolution.totalInteractions}` },
            { id: `memories_${companionId}`, label: `Memories: ${memories.length}` }
          ]
        },
        {
          id: `memories_${companionId}`,
          label: 'Key Memories',
          children: memories.slice(0, 5).map(memory => ({
            id: `memory_${memory.id}`,
            label: memory.content.substring(0, 30) + '...',
            content: memory.content
          }))
        }
      ],
      style: { backgroundColor: this.getEvolutionStageColor(evolution.currentLevel) }
    };
  }

  private async analyzeCrossCompanionConnections(companionIds: string[]): Promise<MindMapNode[]> {
    const connections: MindMapNode[] = [];

    // Analyze shared memories between companions
    for (let i = 0; i < companionIds.length; i++) {
      for (let j = i + 1; j < companionIds.length; j++) {
        const companion1 = companionIds[i];
        const companion2 = companionIds[j];

        const sharedMemories = await this.getSharedMemoriesBetweenCompanions(companion1, companion2);

        if (sharedMemories.length > 0) {
          connections.push({
            id: `connection_${companion1}_${companion2}`,
            label: `${companion1} ↔ ${companion2}`,
            content: `${sharedMemories.length} shared memories`,
            children: sharedMemories.slice(0, 3).map(memory => ({
              id: `shared_${memory.id}`,
              label: memory.content.substring(0, 40) + '...',
              style: { backgroundColor: '#EC4899' }
            })),
            style: { backgroundColor: '#8B5CF6' }
          });
        }
      }
    }

    return connections;
  }

  private convertToXMind(mindMapData: MindMapData): string {
    // Convert to XMind format (simplified - would need full XMind specification)
    const xmindData = {
      version: '1.0',
      title: mindMapData.title,
      rootTopic: this.convertNodeToXMind(mindMapData.root),
      settings: mindMapData.settings,
      metadata: mindMapData.metadata
    };

    return JSON.stringify(xmindData, null, 2);
  }

  private convertNodeToXMind(node: MindMapNode): any {
    return {
      id: node.id,
      title: node.label,
      content: node.content,
      style: node.style,
      children: node.children?.map(child => ({
        type: 'attached',
        ...this.convertNodeToXMind(child)
      })),
      metadata: node.metadata
    };
  }

  private async importMemoryNetwork(
    mindMapData: MindMapData,
    targetCompanionId: string | undefined,
    result: ImportResult
  ): Promise<void> {
    // Implementation for importing memory networks
    result.warnings.push('Memory network import not fully implemented yet');
  }

  private async importCompanionEcosystem(
    mindMapData: MindMapData,
    result: ImportResult
  ): Promise<void> {
    // Implementation for importing companion ecosystems
    result.warnings.push('Companion ecosystem import not fully implemented yet');
  }

  private async importEvolutionHistory(
    mindMapData: MindMapData,
    targetCompanionId: string | undefined,
    result: ImportResult
  ): Promise<void> {
    // Implementation for importing evolution history
    result.warnings.push('Evolution history import not fully implemented yet');
  }

  private async getUserCompanions(userId: string): Promise<any[]> {
    // Mock implementation - would query database
    return [];
  }

  private async getSharedMemoriesBetweenCompanions(companion1: string, companion2: string): Promise<SharedMemory[]> {
    // Mock implementation - would query database
    return [];
  }

  private getMemoryTypeColor(type?: string): string {
    switch (type) {
      case 'personal': return '#3B82F6';
      case 'experience': return '#10B981';
      case 'relationship': return '#F59E0B';
      case 'knowledge': return '#8B5CF6';
      case 'shared_experience': return '#EC4899';
      default: return '#6B7280';
    }
  }

  private getEvolutionStageColor(level: number): string {
    const colors = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[level - 1] || colors[colors.length - 1];
  }
}

// Global export/import system instance
export const exportImportSystem = new ExportImportSystem();