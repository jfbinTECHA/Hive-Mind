'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CustomTheme } from '@/types';
import { Palette, Download, Upload, RotateCcw, Eye, Code } from 'lucide-react';

interface ThemeCustomizerProps {
  onClose: () => void;
}

const defaultCustomTheme: CustomTheme = {
  name: 'Custom Theme',
  background: {
    gradient: {
      colors: ['#0f0f23', '#1a1a2e', '#16213e'],
      direction: 'to bottom right',
      opacity: 0.9
    },
    overlay: {
      color: '#ffffff',
      opacity: 0.05
    }
  },
  glow: {
    intensity: 0.6,
    color: '#8b5cf6',
    blur: 20
  },
  accent: {
    primary: '#8b5cf6',
    secondary: '#06b6d4',
    hover: '#a855f7'
  },
  text: {
    primary: '#ffffff',
    secondary: '#e2e8f0',
    muted: '#94a3b8'
  },
  border: {
    color: '#ffffff',
    opacity: 0.1
  }
};

const presetThemes: Record<string, CustomTheme> = {
  neon: {
    name: 'Neon Cyberpunk',
    background: {
      gradient: {
        colors: ['#0c0c0c', '#1a0a1e', '#0a0a2e'],
        direction: 'to bottom right',
        opacity: 0.95
      },
      overlay: {
        color: '#ff00ff',
        opacity: 0.03
      }
    },
    glow: {
      intensity: 0.8,
      color: '#ff00ff',
      blur: 25
    },
    accent: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      hover: '#ff0080'
    },
    text: {
      primary: '#ffffff',
      secondary: '#e2e8f0',
      muted: '#94a3b8'
    },
    border: {
      color: '#ff00ff',
      opacity: 0.2
    }
  },
  ocean: {
    name: 'Deep Ocean',
    background: {
      gradient: {
        colors: ['#0f1419', '#1e3a5f', '#2d5f6f'],
        direction: 'to bottom',
        opacity: 0.9
      },
      overlay: {
        color: '#4facfe',
        opacity: 0.05
      }
    },
    glow: {
      intensity: 0.5,
      color: '#4facfe',
      blur: 15
    },
    accent: {
      primary: '#4facfe',
      secondary: '#00f2fe',
      hover: '#5fb3f7'
    },
    text: {
      primary: '#ffffff',
      secondary: '#e2e8f0',
      muted: '#94a3b8'
    },
    border: {
      color: '#4facfe',
      opacity: 0.15
    }
  },
  sunset: {
    name: 'Sunset Glow',
    background: {
      gradient: {
        colors: ['#1a0b2e', '#2d1b3d', '#4a2c5a'],
        direction: 'to bottom right',
        opacity: 0.9
      },
      overlay: {
        color: '#ff6b6b',
        opacity: 0.04
      }
    },
    glow: {
      intensity: 0.7,
      color: '#ff6b6b',
      blur: 20
    },
    accent: {
      primary: '#ff6b6b',
      secondary: '#ffd93d',
      hover: '#ff8e53'
    },
    text: {
      primary: '#ffffff',
      secondary: '#e2e8f0',
      muted: '#94a3b8'
    },
    border: {
      color: '#ff6b6b',
      opacity: 0.18
    }
  }
};

export function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const { state, dispatch } = useApp();
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(defaultCustomTheme);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (typeof state.theme === 'object') {
      setCurrentTheme(state.theme);
    }
    updateJsonText(typeof state.theme === 'object' ? state.theme : defaultCustomTheme);
  }, [state.theme]);

  const updateJsonText = (theme: CustomTheme) => {
    setJsonText(JSON.stringify(theme, null, 2));
  };

  const applyTheme = (theme: CustomTheme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    localStorage.setItem('customTheme', JSON.stringify(theme));
  };

  const loadFromJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setCurrentTheme(parsed);
      applyTheme(parsed);
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const resetToDefault = () => {
    setCurrentTheme(defaultCustomTheme);
    applyTheme(defaultCustomTheme);
  };

  const exportTheme = () => {
    const dataStr = JSON.stringify(currentTheme, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `ai-theme-${currentTheme.name.toLowerCase().replace(/\s+/g, '-')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          setCurrentTheme(parsed);
          setJsonText(JSON.stringify(parsed, null, 2));
          applyTheme(parsed);
        } catch (error) {
          alert('Invalid theme file');
        }
      };
      reader.readAsText(file);
    }
  };

  const updateTheme = (path: string, value: any) => {
    const newTheme = { ...currentTheme };
    const keys = path.split('.');
    let current: any = newTheme;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setCurrentTheme(newTheme);
    updateJsonText(newTheme);
  };

  const getGradientStyle = (theme: CustomTheme) => {
    const { gradient } = theme.background;
    const colors = gradient.colors.join(', ');
    const direction = gradient.direction === 'radial' ? 'radial-gradient(circle, ' : `linear-gradient(${gradient.direction}, `;
    return `${direction}${colors})`;
  };

  const getGlowStyle = (theme: CustomTheme) => {
    const { intensity, color, blur } = theme.glow;
    return `0 0 ${blur}px ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
  };

  if (previewMode) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: getGradientStyle(currentTheme),
          boxShadow: `inset ${getGlowStyle(currentTheme)}`
        }}
      >
        <div className="max-w-2xl w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
              Theme Preview: {currentTheme.name}
            </h2>
            <Button
              onClick={() => setPreviewMode(false)}
              variant="outline"
              style={{
                borderColor: currentTheme.border.color,
                color: currentTheme.text.primary,
                backgroundColor: `${currentTheme.accent.primary}20`
              }}
            >
              Exit Preview
            </Button>
          </div>

          <div className="space-y-4">
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: `${currentTheme.accent.primary}20`,
                borderColor: currentTheme.border.color,
                color: currentTheme.text.primary
              }}
            >
              <h3 className="font-semibold mb-2">Sample Card</h3>
              <p style={{ color: currentTheme.text.secondary }}>
                This is how UI elements will look with your custom theme.
              </p>
            </div>

            <div className="flex space-x-4">
              <Button
                style={{
                  backgroundColor: currentTheme.accent.primary,
                  color: currentTheme.text.primary
                }}
              >
                Primary Button
              </Button>
              <Button
                variant="outline"
                style={{
                  borderColor: currentTheme.border.color,
                  color: currentTheme.text.primary
                }}
              >
                Secondary Button
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 backdrop-blur-xl bg-black/80 border-l border-white/20 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Theme Customizer
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          ✕
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Preset Themes */}
        <div>
          <h4 className="text-white font-medium mb-3">Preset Themes</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(presetThemes).map(([key, theme]) => (
              <Button
                key={key}
                onClick={() => {
                  setCurrentTheme(theme);
                  applyTheme(theme);
                }}
                variant="outline"
                className="justify-start text-left h-auto p-3"
                style={{
                  borderColor: theme.border.color,
                  color: theme.text.primary,
                  backgroundColor: `${theme.accent.primary}20`
                }}
              >
                <div>
                  <div className="font-medium">{theme.name}</div>
                  <div className="text-xs opacity-70">
                    Glow: {Math.round(theme.glow.intensity * 100)}% • {theme.glow.color}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Current Theme Controls */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">Custom Theme</h4>
            <div className="flex space-x-2">
              <Button
                onClick={() => setPreviewMode(true)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button
                onClick={() => setJsonMode(!jsonMode)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Code className="w-4 h-4 mr-1" />
                {jsonMode ? 'Visual' : 'JSON'}
              </Button>
            </div>
          </div>

          {jsonMode ? (
            <div className="space-y-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full h-64 bg-white/10 border border-white/20 rounded-md text-white font-mono text-sm p-3"
                placeholder="Paste theme JSON here..."
              />
              <div className="flex space-x-2">
                <Button
                  onClick={loadFromJson}
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                >
                  Load from JSON
                </Button>
                <Button
                  onClick={exportTheme}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Theme Name */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Theme Name</label>
                <Input
                  value={currentTheme.name}
                  onChange={(e) => updateTheme('name', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {/* Gradient Settings */}
              <div>
                <h5 className="text-white font-medium mb-2">Background Gradient</h5>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Colors (comma-separated)</label>
                    <Input
                      value={currentTheme.background.gradient.colors.join(', ')}
                      onChange={(e) => updateTheme('background.gradient.colors', e.target.value.split(',').map(s => s.trim()))}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Direction</label>
                      <select
                        value={currentTheme.background.gradient.direction}
                        onChange={(e) => updateTheme('background.gradient.direction', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-md text-white text-sm p-2"
                      >
                        <option value="to right">To Right</option>
                        <option value="to bottom">To Bottom</option>
                        <option value="to bottom right">To Bottom Right</option>
                        <option value="radial">Radial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Opacity</label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={currentTheme.background.gradient.opacity}
                        onChange={(e) => updateTheme('background.gradient.opacity', parseFloat(e.target.value))}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow Settings */}
              <div>
                <h5 className="text-white font-medium mb-2">Glow Effects</h5>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Glow Color</label>
                    <Input
                      type="color"
                      value={currentTheme.glow.color}
                      onChange={(e) => updateTheme('glow.color', e.target.value)}
                      className="bg-white/10 border-white/20 text-white h-10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Intensity (0-1)</label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={currentTheme.glow.intensity}
                        onChange={(e) => updateTheme('glow.intensity', parseFloat(e.target.value))}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Blur (px)</label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={currentTheme.glow.blur}
                        onChange={(e) => updateTheme('glow.blur', parseInt(e.target.value))}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accent Colors */}
              <div>
                <h5 className="text-white font-medium mb-2">Accent Colors</h5>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Primary</label>
                    <Input
                      type="color"
                      value={currentTheme.accent.primary}
                      onChange={(e) => updateTheme('accent.primary', e.target.value)}
                      className="bg-white/10 border-white/20 text-white h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Secondary</label>
                    <Input
                      type="color"
                      value={currentTheme.accent.secondary}
                      onChange={(e) => updateTheme('accent.secondary', e.target.value)}
                      className="bg-white/10 border-white/20 text-white h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button
              onClick={() => applyTheme(currentTheme)}
              className="flex-1 bg-purple-500 hover:bg-purple-600"
            >
              Apply Theme
            </Button>
            <Button
              onClick={resetToDefault}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Theme JSON
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}