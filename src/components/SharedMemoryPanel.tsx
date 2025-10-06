'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { sharedMemorySystem, SharedMemory, CompanionMemoryNetwork, MemoryCluster } from '@/lib/sharedMemorySystem';
import { exportImportSystem, ExportOptions } from '@/lib/exportImportSystem';
import { Share2, Link, Network, Users, Brain, Eye, MessageSquare, Heart, Download, Upload, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SharedMemoryPanelProps {
  companionId?: string;
  onClose?: () => void;
}

export function SharedMemoryPanel({ companionId, onClose }: SharedMemoryPanelProps) {
  const { state } = useApp();
  const [memories, setMemories] = useState<SharedMemory[]>([]);
  const [network, setNetwork] = useState<CompanionMemoryNetwork | null>(null);
  const [clusters, setClusters] = useState<MemoryCluster[]>([]);
  const [activeTab, setActiveTab] = useState<'memories' | 'network' | 'clusters' | 'export'>('memories');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companionId) {
      loadSharedMemories();
      loadNetwork();
      loadClusters();
    }
  }, [companionId]);

  const loadSharedMemories = async () => {
    if (!companionId) return;

    setLoading(true);
    try {
      const data = await sharedMemorySystem.getAccessibleMemories(companionId);
      setMemories(data);
    } catch (error) {
      console.error('Failed to load shared memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNetwork = async () => {
    if (!companionId) return;

    try {
      const data = await sharedMemorySystem.getCompanionNetwork(companionId);
      setNetwork(data);
    } catch (error) {
      console.error('Failed to load network:', error);
    }
  };

  const loadClusters = async () => {
    if (!companionId) return;

    try {
      const data = await sharedMemorySystem.getMemoryClusters(companionId);
      setClusters(data);
    } catch (error) {
      console.error('Failed to load clusters:', error);
    }
  };

  const handleShareMemory = async (memoryId: string, targetCompanions: string[]) => {
    if (!companionId) return;

    setSharing(memoryId);
    try {
      await sharedMemorySystem.shareMemory(memoryId, companionId, targetCompanions);
      await loadSharedMemories(); // Refresh the list
    } catch (error) {
      console.error('Failed to share memory:', error);
    } finally {
      setSharing(null);
    }
  };

  const handleCreateConnection = async (memoryId1: string, memoryId2: string, type: string, description: string) => {
    if (!companionId) return;

    try {
      await sharedMemorySystem.createMemoryConnection(companionId, memoryId1, memoryId2, type as any, description);
      await loadNetwork(); // Refresh network connections
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  };

  const handleExport = async (format: 'json' | 'xmind', type: 'network' | 'ecosystem' | 'evolution') => {
    if (!companionId) return;

    setExporting(true);
    try {
      let data: string;
      let filename: string;

      const options: ExportOptions = {
        format,
        includePrivateMemories: true,
        includeEvolutionData: true,
        includeNetworkInsights: true,
        maxDepth: 3
      };

      switch (type) {
        case 'network':
          data = await exportImportSystem.exportMemoryNetwork(companionId, options);
          filename = `companion-${companionId}-memory-network.${format}`;
          break;
        case 'ecosystem':
          data = await exportImportSystem.exportCompanionEcosystem('current-user', options);
          filename = `ai-companion-ecosystem.${format}`;
          break;
        case 'evolution':
          data = await exportImportSystem.exportEvolutionHistory(companionId, options);
          filename = `companion-${companionId}-evolution-timeline.${format}`;
          break;
        default:
          return;
      }

      exportImportSystem.downloadExport(data, filename, format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = await exportImportSystem.importMindMap(text, companionId || undefined);

      if (result.success) {
        // Refresh data
        await loadSharedMemories();
        await loadNetwork();
        await loadClusters();

        alert(`Import successful! Imported ${result.importedNodes} nodes and ${result.importedConnections} connections.`);
      } else {
        alert(`Import failed: ${result.errors.join(', ')}`);
      }

      if (result.warnings.length > 0) {
        console.warn('Import warnings:', result.warnings);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file format.');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'personal': return '👤';
      case 'experience': return '🎯';
      case 'relationship': return '💝';
      case 'knowledge': return '📚';
      case 'shared_experience': return '🤝';
      default: return '💭';
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'similar': return '🔗';
      case 'related': return '📎';
      case 'contrasting': return '⚡';
      case 'sequential': return '➡️';
      case 'causal': return '🎯';
      default: return '🔗';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCompanionName = (id: string) => {
    const companion = state.companions.find(c => c.id === id);
    return companion?.name || id;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading shared memories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <Share2 className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Shared Memories</h2>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            ✕
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'memories'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Brain className="w-4 h-4 inline mr-2" />
          Memories
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'network'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Network className="w-4 h-4 inline mr-2" />
          Network
        </button>
        <button
          onClick={() => setActiveTab('clusters')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'clusters'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Clusters
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export/Import
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'memories' ? (
          <div className="space-y-4">
            {/* Auto-share button */}
            <Button
              onClick={() => companionId && sharedMemorySystem.autoShareMemories(companionId)}
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Auto-Share Important Memories
            </Button>

            {/* Memories List */}
            <div className="space-y-3">
              {memories.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No shared memories yet</p>
                  <p className="text-sm mt-2">Memories will appear as companions share experiences</p>
                </div>
              ) : (
                memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getMemoryIcon(memory.memoryType)}</span>
                        <div>
                          <h3 className="font-medium text-white capitalize">
                            {memory.memoryType.replace('_', ' ')} Memory
                          </h3>
                          <p className="text-xs text-gray-400">
                            From {getCompanionName(memory.originalCompanionId)} • {formatDate(memory.context.timestamp)}
                          </p>
                        </div>
                      </div>

                      {/* Share button */}
                      {memory.originalCompanionId === companionId && (
                        <Button
                          onClick={() => {
                            const otherCompanions = state.companions
                              .filter(c => c.id !== companionId && !memory.sharedWithCompanions.includes(c.id))
                              .map(c => c.id);
                            if (otherCompanions.length > 0) {
                              handleShareMemory(memory.id, otherCompanions);
                            }
                          }}
                          disabled={sharing === memory.id}
                          size="sm"
                          className="bg-blue-500/20 hover:bg-blue-500/30"
                        >
                          {sharing === memory.id ? 'Sharing...' : 'Share'}
                        </Button>
                      )}
                    </div>

                    {/* Memory content */}
                    <div className="mb-3">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 text-gray-300">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                        }}
                      >
                        {memory.content}
                      </ReactMarkdown>
                    </div>

                    {/* Participants */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-white mb-2">Participants:</h4>
                      <div className="flex flex-wrap gap-2">
                        {memory.context.participants.map((participantId) => (
                          <div key={participantId} className="flex items-center space-x-1 bg-purple-500/20 text-purple-300 rounded px-2 py-1">
                            <span className="text-xs">{getCompanionName(participantId)}</span>
                            {participantId === memory.originalCompanionId && (
                              <span className="text-xs">(original)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center space-x-4">
                        <span>Importance: {Math.round(memory.metadata.importance * 100)}%</span>
                        <span>Emotional: {memory.metadata.emotionalImpact > 0 ? '+' : ''}{Math.round(memory.metadata.emotionalImpact * 100)}%</span>
                        <span>Recurrence: {memory.metadata.recurrence}</span>
                      </div>
                      <div className="flex space-x-1">
                        {memory.metadata.tags.map((tag, index) => (
                          <span key={index} className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Connections */}
                    {memory.metadata.connections.length > 0 && (
                      <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2">Connections:</h4>
                        <div className="space-y-2">
                          {memory.metadata.connections.map((connection, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <span>{getConnectionIcon(connection.type)}</span>
                              <span className="text-gray-300">{connection.description}</span>
                              <span className="text-xs text-gray-400">
                                (strength: {Math.round(connection.strength * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'network' ? (
          <div className="space-y-4">
            {/* Network visualization placeholder */}
            <div className="p-8 text-center text-gray-400">
              <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Companion Memory Network</p>
              <p className="text-sm mt-2">Interactive network visualization coming soon</p>
            </div>

            {/* Network insights */}
            {network?.networkInsights && network.networkInsights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Network Insights</h3>
                {network.networkInsights.map((insight, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded border border-white/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium capitalize">
                        {insight.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2">{insight.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {insight.relatedCompanions.map((companionId) => (
                        <span key={companionId} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          {getCompanionName(companionId)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Memory clusters */}
            <div className="space-y-3">
              {clusters.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No memory clusters yet</p>
                  <p className="text-sm mt-2">Clusters will form as shared memories accumulate</p>
                </div>
              ) : (
                clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-green-400" />
                        <h3 className="font-semibold text-white capitalize">
                          {cluster.theme} Cluster
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {cluster.memories.length} memories
                        </div>
                        <div className="text-xs text-gray-400">
                          Significance: {Math.round(cluster.significance * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-white mb-2">Participants:</h4>
                      <div className="flex flex-wrap gap-2">
                        {cluster.participants.map((participantId) => (
                          <div key={participantId} className="flex items-center space-x-1 bg-green-500/20 text-green-300 rounded px-2 py-1">
                            <Heart className="w-3 h-3" />
                            <span className="text-xs">{getCompanionName(participantId)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400">
                      Created {formatDate(cluster.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'export' ? (
          <div className="space-y-6">
            {/* Export Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Export Mind Maps</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Memory Network Export */}
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <h4 className="font-medium text-white mb-2">Memory Network</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Export companion's memory network as a mind map
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleExport('json', 'network')}
                      disabled={exporting}
                      size="sm"
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/30"
                    >
                      {exporting ? '...' : 'JSON'}
                    </Button>
                    <Button
                      onClick={() => handleExport('xmind', 'network')}
                      disabled={exporting}
                      size="sm"
                      className="flex-1 bg-purple-500/20 hover:bg-purple-500/30"
                    >
                      {exporting ? '...' : 'XMind'}
                    </Button>
                  </div>
                </div>

                {/* Ecosystem Export */}
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <h4 className="font-medium text-white mb-2">Full Ecosystem</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Export entire companion ecosystem
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleExport('json', 'ecosystem')}
                      disabled={exporting}
                      size="sm"
                      className="flex-1 bg-green-500/20 hover:bg-green-500/30"
                    >
                      {exporting ? '...' : 'JSON'}
                    </Button>
                    <Button
                      onClick={() => handleExport('xmind', 'ecosystem')}
                      disabled={exporting}
                      size="sm"
                      className="flex-1 bg-green-500/20 hover:bg-green-500/30"
                    >
                      {exporting ? '...' : 'XMind'}
                    </Button>
                  </div>
                </div>

                {/* Evolution Export */}
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <h4 className="font-medium text-white mb-2">Evolution Timeline</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Export companion's evolution history
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleExport('json', 'evolution')}
                      disabled={exporting}
                      size="sm"
                      className="flex-1 bg-orange-500/20 hover:bg-orange-500/30"
                    >
                      {exporting ? '...' : 'JSON'}
                    </Button>
                    <Button
                      onClick={() => handleExport('xmind', 'evolution')}
                      disabled={exporting}
                      size="sm"
                      className="flex-1 bg-orange-500/20 hover:bg-orange-500/30"
                    >
                      {exporting ? '...' : 'XMind'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Import Mind Maps</h3>

              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white">Import from File</h4>
                    <p className="text-sm text-gray-400">
                      Import JSON or XMind files to restore mind maps
                    </p>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={importing}
                    className="bg-purple-500/20 hover:bg-purple-500/30"
                  >
                    {importing ? (
                      'Importing...'
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-gray-400">
                  <p>• Supported formats: JSON, XMind</p>
                  <p>• Files will be validated before import</p>
                  <p>• Existing data will not be overwritten</p>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xmind"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Export Tips */}
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <h4 className="font-medium text-blue-300 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Export Tips
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• JSON files can be imported into most mind mapping tools</li>
                <li>• XMind files are compatible with XMind mind mapping software</li>
                <li>• Exports include memory content, relationships, and metadata</li>
                <li>• Use exports to backup your companion ecosystems</li>
                <li>• Share exports to collaborate on companion development</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}