'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Brain, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { OllamaModel } from '@/lib/ollama';

interface ModelManagerProps {
  onClose: () => void;
}

export function ModelManager({ onClose }: ModelManagerProps) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    checkOllamaStatus();
    fetchModels();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch('/api/ollama/status');
      if (response.ok) {
        setOllamaStatus('connected');
      } else {
        setOllamaStatus('disconnected');
      }
    } catch (error) {
      setOllamaStatus('disconnected');
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/ollama/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.installed || []);
        setAvailableModels(data.available || []);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const pullModel = async (modelName: string) => {
    setPullingModel(modelName);
    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      });

      if (response.ok) {
        await fetchModels(); // Refresh the model list
      }
    } catch (error) {
      console.error('Failed to pull model:', error);
    } finally {
      setPullingModel(null);
    }
  };

  const setActiveModel = async (modelName: string) => {
    try {
      await fetch('/api/ollama/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      });
    } catch (error) {
      console.error('Failed to set active model:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-2 text-white">Loading models...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            AI Model Manager
          </h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {/* Ollama Status */}
        <div className="mb-6 p-4 rounded-lg bg-gray-800">
          <div className="flex items-center">
            {ollamaStatus === 'checking' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-2"></div>
            )}
            {ollamaStatus === 'connected' && (
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            )}
            {ollamaStatus === 'disconnected' && (
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            )}
            <span className="text-white">
              Ollama Status: {ollamaStatus === 'connected' ? 'Connected' :
                              ollamaStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
          {ollamaStatus === 'disconnected' && (
            <p className="text-gray-400 text-sm mt-2">
              Make sure Ollama is running locally. Visit{' '}
              <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer"
                 className="text-purple-400 hover:text-purple-300">
                ollama.ai
              </a>{' '}
              for installation instructions.
            </p>
          )}
        </div>

        {/* Installed Models */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Installed Models</h3>
          <div className="space-y-2">
            {models.map((model) => (
              <div key={model.name} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <div className="text-white font-medium">{model.name}</div>
                  <div className="text-gray-400 text-sm">
                    Size: {model.size} • Modified: {new Date(model.modified_at).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  onClick={() => setActiveModel(model.name)}
                  variant="outline"
                  size="sm"
                  className="text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
                >
                  Set Active
                </Button>
              </div>
            ))}
            {models.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No models installed. Pull a model below to get started.
              </div>
            )}
          </div>
        </div>

        {/* Available Models */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Available Models</h3>
          <div className="space-y-2">
            {availableModels.map((modelName) => (
              <div key={modelName} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="text-white font-medium">{modelName}</div>
                <Button
                  onClick={() => pullModel(modelName)}
                  disabled={pullingModel === modelName}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
                >
                  {pullingModel === modelName ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  {pullingModel === modelName ? 'Pulling...' : 'Pull'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
          <h4 className="text-blue-400 font-medium mb-2">Getting Started</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">ollama.ai</a></li>
            <li>• Start Ollama server with <code className="bg-gray-800 px-1 rounded">ollama serve</code></li>
            <li>• Pull a model like <code className="bg-gray-800 px-1 rounded">llama3:8b</code> for best results</li>
            <li>• Set the model as active to start chatting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}