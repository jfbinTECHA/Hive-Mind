'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Save } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { state, dispatch } = useApp();
  const [selectedCompanion, setSelectedCompanion] = useState(state.activeCompanion || state.companions[0]?.id);
  const [editedCompanion, setEditedCompanion] = useState(
    state.companions.find(c => c.id === selectedCompanion) || state.companions[0]
  );

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_COMPANION',
      payload: {
        id: selectedCompanion,
        updates: editedCompanion
      }
    });
    onClose();
  };

  const handleCompanionChange = (companionId: string) => {
    setSelectedCompanion(companionId);
    const companion = state.companions.find(c => c.id === companionId);
    if (companion) {
      setEditedCompanion({ ...companion });
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedCompanion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTraits = (index: number, value: string) => {
    const newTraits = [...editedCompanion.traits];
    newTraits[index] = value;
    updateField('traits', newTraits);
  };

  const addTrait = () => {
    updateField('traits', [...editedCompanion.traits, '']);
  };

  const removeTrait = (index: number) => {
    updateField('traits', editedCompanion.traits.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/20 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Edit AI Companion</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Companion Selector */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Select Companion
            </label>
            <select
              value={selectedCompanion}
              onChange={(e) => handleCompanionChange(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
            >
              {state.companions.map((companion) => (
                <option key={companion.id} value={companion.id}>
                  {companion.name}
                </option>
              ))}
            </select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Name
              </label>
              <Input
                value={editedCompanion.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Personality
              </label>
              <select
                value={editedCompanion.personality}
                onChange={(e) => updateField('personality', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="humorous">Humorous</option>
                <option value="serious">Serious</option>
              </select>
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Avatar Emoji
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={editedCompanion.avatar}
                onChange={(e) => updateField('avatar', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                maxLength={2}
              />
              <span className="text-2xl">{editedCompanion.avatar}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={editedCompanion.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white resize-none"
              rows={3}
            />
          </div>

          {/* Traits */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Traits
            </label>
            <div className="space-y-2">
              {editedCompanion.traits.map((trait, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={trait}
                    onChange={(e) => updateTraits(index, e.target.value)}
                    className="bg-white/10 border-white/20 text-white flex-1"
                    placeholder="Enter a trait..."
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrait(index)}
                    className="text-red-400 hover:bg-red-500/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addTrait}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Add Trait
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/20 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}