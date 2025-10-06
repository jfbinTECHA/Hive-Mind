'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Search, Trash2, Download, RefreshCw, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  confidence: number;
  lastUsed: string;
  createdAt: string;
  companionId?: string;
  companionName?: string;
  metadata: {
    source: string;
    tags: string[];
    embedding?: number[];
  };
}

interface MemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  byCompanion: Record<string, number>;
  averageConfidence: number;
  oldestMemory: string;
  newestMemory: string;
}

export default function MemoryPage() {
  const { state, dispatch } = useApp();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCompanion, setSelectedCompanion] = useState<string>('all');
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [showVisualization, setShowVisualization] = useState(false);

  useEffect(() => {
    fetchAllMemories();
  }, []);

  useEffect(() => {
    filterMemories();
  }, [memories, searchTerm, selectedType, selectedCompanion]);

  const fetchAllMemories = async () => {
    setLoading(true);
    try {
      const allMemories: MemoryItem[] = [];

      // Fetch memories for each companion
      for (const companion of state.companions) {
        try {
          const response = await fetch(`/api/memory/${companion.id}`);
          if (response.ok) {
            const data = await response.json();
            const companionMemories = (data.memories || []).map((memory: MemoryItem) => ({
              ...memory,
              companionId: companion.id,
              companionName: companion.name
            }));
            allMemories.push(...companionMemories);
          }
        } catch (error) {
          console.error(`Failed to fetch memories for ${companion.name}:`, error);
        }
      }

      setMemories(allMemories);
      calculateStats(allMemories);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (memoryList: MemoryItem[]) => {
    const stats: MemoryStats = {
      totalMemories: memoryList.length,
      byType: {},
      byCompanion: {},
      averageConfidence: 0,
      oldestMemory: '',
      newestMemory: ''
    };

    if (memoryList.length === 0) {
      setStats(stats);
      return;
    }

    let totalConfidence = 0;
    let oldestDate = new Date();
    let newestDate = new Date(0);

    memoryList.forEach(memory => {
      // Count by type
      stats.byType[memory.type] = (stats.byType[memory.type] || 0) + 1;

      // Count by companion
      const companionName = memory.companionName || 'Unknown';
      stats.byCompanion[companionName] = (stats.byCompanion[companionName] || 0) + 1;

      // Calculate confidence
      totalConfidence += memory.confidence;

      // Track dates
      const createdDate = new Date(memory.createdAt);
      if (createdDate < oldestDate) oldestDate = createdDate;
      if (createdDate > newestDate) newestDate = createdDate;
    });

    stats.averageConfidence = totalConfidence / memoryList.length;
    stats.oldestMemory = oldestDate.toISOString();
    stats.newestMemory = newestDate.toISOString();

    setStats(stats);
  };

  const filterMemories = () => {
    let filtered = memories;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(memory =>
        memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(memory => memory.type === selectedType);
    }

    // Filter by companion
    if (selectedCompanion !== 'all') {
      filtered = filtered.filter(memory => memory.companionName === selectedCompanion);
    }

    setFilteredMemories(filtered);
  };

  const deleteMemory = async (memoryId: string, companionId: string) => {
    try {
      await fetch(`/api/memory/${companionId}/${memoryId}`, {
        method: 'DELETE'
      });

      setMemories(memories.filter(m => m.id !== memoryId));
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const startEditing = (memory: MemoryItem) => {
    setEditingMemory(memory.id);
    setEditContent(memory.content);
    setEditType(memory.type);
    setEditTags([...memory.metadata.tags]);
  };

  const cancelEditing = () => {
    setEditingMemory(null);
    setEditContent('');
    setEditType('');
    setEditTags([]);
  };

  const saveMemory = async (memoryId: string, companionId: string) => {
    try {
      const response = await fetch(`/api/memory/${companionId}/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editContent,
          type: editType,
          tags: editTags
        })
      });

      if (response.ok) {
        // Update local state
        setMemories(memories.map(m =>
          m.id === memoryId
            ? {
                ...m,
                content: editContent,
                type: editType,
                metadata: { ...m.metadata, tags: editTags }
              }
            : m
        ));
        cancelEditing();
      } else {
        console.error('Failed to update memory');
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
    }
  };

  const addTag = () => {
    setEditTags([...editTags, '']);
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...editTags];
    newTags[index] = value;
    setEditTags(newTags);
  };

  const removeTag = (index: number) => {
    setEditTags(editTags.filter((_, i) => i !== index));
  };

  const exportMemories = () => {
    const dataStr = JSON.stringify(filteredMemories, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `ai-memories-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getTypeColor = (type: string) => {
    const colors = {
      personal: 'bg-blue-500/20 text-blue-300',
      preference: 'bg-green-500/20 text-green-300',
      experience: 'bg-purple-500/20 text-purple-300',
      relationship: 'bg-pink-500/20 text-pink-300',
      knowledge: 'bg-yellow-500/20 text-yellow-300'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/20 text-gray-300';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-500/20';
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-500/20';
    if (confidence >= 0.4) return 'text-orange-400 bg-orange-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading memory data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Chat
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">Memory Inspector</h1>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={fetchAllMemories}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>

              <Button
                onClick={exportMemories}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.totalMemories}</div>
              <div className="text-sm text-gray-400">Total Memories</div>
            </div>

            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {Math.round(stats.averageConfidence * 100)}%
              </div>
              <div className="text-sm text-gray-400">Avg Confidence</div>
            </div>

            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{Object.keys(stats.byType).length}</div>
              <div className="text-sm text-gray-400">Memory Types</div>
            </div>

            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{Object.keys(stats.byCompanion).length}</div>
              <div className="text-sm text-gray-400">Active Companions</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search memories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
            >
              <option value="all">All Types</option>
              <option value="personal">Personal</option>
              <option value="preference">Preference</option>
              <option value="experience">Experience</option>
              <option value="relationship">Relationship</option>
              <option value="knowledge">Knowledge</option>
            </select>

            <select
              value={selectedCompanion}
              onChange={(e) => setSelectedCompanion(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
            >
              <option value="all">All Companions</option>
              {state.companions.map(companion => (
                <option key={companion.id} value={companion.name}>
                  {companion.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Memory List */}
        <div className="space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No memories found</div>
              <div className="text-gray-500 text-sm mt-2">
                {searchTerm || selectedType !== 'all' || selectedCompanion !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start chatting to create memories'
                }
              </div>
            </div>
          ) : (
            filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header with type, companion, and confidence */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${getTypeColor(memory.type)}`}>
                          {memory.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {memory.companionName}
                        </span>
                      </div>

                      {/* Enhanced Confidence Display */}
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded ${getConfidenceColor(memory.confidence)}`}>
                            {getConfidenceLabel(memory.confidence)} ({Math.round(memory.confidence * 100)}%)
                          </div>
                          <div className="w-20 bg-gray-700 rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full transition-all duration-300 ${
                                memory.confidence >= 0.8 ? 'bg-green-500' :
                                memory.confidence >= 0.6 ? 'bg-yellow-500' :
                                memory.confidence >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${memory.confidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content - Editable */}
                    {editingMemory === memory.id ? (
                      <div className="space-y-3 mb-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 resize-none"
                          rows={3}
                          placeholder="Memory content..."
                        />

                        <div className="flex items-center space-x-2">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                          >
                            <option value="personal">Personal</option>
                            <option value="preference">Preference</option>
                            <option value="experience">Experience</option>
                            <option value="relationship">Relationship</option>
                            <option value="knowledge">Knowledge</option>
                          </select>
                        </div>

                        {/* Tags Editor */}
                        <div>
                          <div className="text-sm text-gray-400 mb-2">Tags:</div>
                          <div className="flex flex-wrap gap-2">
                            {editTags.map((tag, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                <Input
                                  value={tag}
                                  onChange={(e) => updateTag(index, e.target.value)}
                                  className="w-20 px-2 py-1 bg-white/10 border border-white/20 text-white text-xs"
                                  placeholder="tag"
                                />
                                <Button
                                  onClick={() => removeTag(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:bg-red-500/20 p-1"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              onClick={addTag}
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10 text-xs px-2 py-1"
                            >
                              + Tag
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-white mb-2">{memory.content}</p>
                    )}

                    {/* Tags Display */}
                    {memory.metadata.tags.length > 0 && editingMemory !== memory.id && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {memory.metadata.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(memory.createdAt)} |
                      Last Used: {formatDate(memory.lastUsed)} |
                      Source: {memory.metadata.source}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    {editingMemory === memory.id ? (
                      <>
                        <Button
                          onClick={() => saveMemory(memory.id, memory.companionId || '')}
                          variant="ghost"
                          size="sm"
                          className="text-green-400 hover:bg-green-500/20"
                          title="Save changes"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:bg-gray-500/20"
                          title="Cancel editing"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => startEditing(memory)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:bg-blue-500/20"
                          title="Edit memory"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteMemory(memory.id, memory.companionId || '')}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-500/20"
                          title="Delete memory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}