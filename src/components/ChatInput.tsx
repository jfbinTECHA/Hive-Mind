'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Loader2,
  Image,
  Link,
  FileText,
  MessageSquare,
  Upload,
  X,
} from 'lucide-react';
import { voiceSystem } from '@/lib/voiceSystem';
import { voiceService } from '@/lib/elevenlabs';

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

type InputMode = 'text' | 'image' | 'url' | 'document';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    attachments?: { type: string; data: any; metadata?: any }[]
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  companionId?: string;
  personality?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
  companionId: _companionId,
  personality: _personality,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [browserVoiceEnabled, setBrowserVoiceEnabled] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [urlInput, setUrlInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingAttachments, setProcessingAttachments] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize voice settings
  useEffect(() => {
    const settings = voiceSystem.getVoiceSettings();
    setElevenLabsEnabled(!!settings.elevenLabsApiKey);
    setBrowserVoiceEnabled(!!settings.whisperApiKey);
  }, []);

  // Browser Speech Recognition
  const startBrowserVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (_event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error');
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  // Whisper-based voice input
  const startWhisperVoiceInput = async () => {
    if (!voiceSystem.getVoiceSettings().whisperApiKey) {
      alert('Whisper API key not configured. Please set it in voice settings.');
      return;
    }

    try {
      setIsRecording(true);
      await voiceSystem.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };

  const stopWhisperVoiceInput = async () => {
    if (!isRecording) return;

    try {
      const recording = await voiceSystem.stopRecording();
      setIsRecording(false);

      // Transcribe with Whisper
      setVoiceLoading(true);
      const transcription = await voiceSystem.transcribeAudio(recording.blob);
      setMessage(transcription);
    } catch (error) {
      console.error('Voice transcription failed:', error);
      alert('Voice transcription failed. Please try again.');
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (browserVoiceEnabled && !isRecording) {
      // Use Whisper if available
      startWhisperVoiceInput();
    } else if (!isRecording) {
      // Fallback to browser speech recognition
      startBrowserVoiceInput();
    } else {
      // Stop recording
      stopWhisperVoiceInput();
    }
  };

  const toggleTTS = () => {
    setTtsEnabled(!ttsEnabled);
  };

  const toggleElevenLabs = async () => {
    const newState = !elevenLabsEnabled;
    setElevenLabsEnabled(newState);

    if (newState && !voiceService.isAvailable()) {
      alert(
        'ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in your environment.'
      );
      setElevenLabsEnabled(false);
    }
  };

  // File handling functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isValidFile(file)) {
        validFiles.push(file);
      }
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setInputMode('text'); // Switch back to text mode after upload
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert(`File type ${file.type} is not supported. Please upload images, PDFs, or documents.`);
      return false;
    }

    if (file.size > maxSize) {
      alert(`File ${file.name} is too large. Maximum size is 10MB.`);
      return false;
    }

    return true;
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const processAttachments = async (attachments: { type: string; data: any; metadata?: any }[]) => {
    const processedAttachments = [];

    for (const attachment of attachments) {
      try {
        if (attachment.type === 'url') {
          // Process URL
          const response = await fetch('/api/multimodal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'url',
              sourceUrl: attachment.data,
              companionId: _companionId,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            processedAttachments.push({
              type: 'url',
              data: result.processedContent,
              metadata: { originalUrl: attachment.data, ...result.metadata },
            });
          }
        } else if (attachment.type === 'file') {
          // Process file
          const formData = new FormData();
          formData.append('file', attachment.data);
          formData.append('type', attachment.metadata.type);
          formData.append('companionId', _companionId || '');

          const response = await fetch('/api/multimodal', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            processedAttachments.push({
              type: 'file',
              data: result.processedContent,
              metadata: { originalFile: attachment.data.name, ...result.metadata },
            });
          }
        }
      } catch (error) {
        console.error('Failed to process attachment:', error);
      }
    }

    return processedAttachments;
  };

  const handleSendMessage = async () => {
    if (disabled || processingAttachments) return;

    let messageToSend = message;
    const attachments: { type: string; data: any; metadata?: any }[] = [];

    // Handle different input modes
    if (inputMode === 'url' && urlInput.trim()) {
      attachments.push({ type: 'url', data: urlInput.trim() });
      messageToSend = `Please analyze this URL: ${urlInput.trim()}`;
      setUrlInput('');
    } else if (inputMode === 'image' || inputMode === 'document') {
      // Add uploaded files as attachments
      uploadedFiles.forEach(file => {
        attachments.push({
          type: 'file',
          data: file,
          metadata: { type: inputMode },
        });
      });
      if (!messageToSend.trim() && uploadedFiles.length > 0) {
        messageToSend = `Please analyze this ${inputMode === 'image' ? 'image' : 'document'}.`;
      }
      setUploadedFiles([]);
    }

    if (!messageToSend.trim() && attachments.length === 0) return;

    try {
      setProcessingAttachments(true);

      // Process attachments if any
      let processedAttachments: { type: string; data: any; metadata?: any }[] = [];
      if (attachments.length > 0) {
        processedAttachments = await processAttachments(attachments);
      }

      onSendMessage(messageToSend, processedAttachments);
      setMessage('');
      setInputMode('text');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setProcessingAttachments(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 border-t border-white/10 backdrop-blur-xl bg-white/5">
      {/* Input Mode Selector */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="flex bg-white/10 rounded-lg p-1">
          <Button
            onClick={() => setInputMode('text')}
            variant={inputMode === 'text' ? 'default' : 'ghost'}
            size="sm"
            className={`px-3 py-1 text-xs ${inputMode === 'text' ? 'bg-purple-500' : 'text-gray-400 hover:text-white'}`}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Text
          </Button>
          <Button
            onClick={() => setInputMode('image')}
            variant={inputMode === 'image' ? 'default' : 'ghost'}
            size="sm"
            className={`px-3 py-1 text-xs ${inputMode === 'image' ? 'bg-purple-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Image className="w-3 h-3 mr-1" />
            Image
          </Button>
          <Button
            onClick={() => setInputMode('url')}
            variant={inputMode === 'url' ? 'default' : 'ghost'}
            size="sm"
            className={`px-3 py-1 text-xs ${inputMode === 'url' ? 'bg-purple-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Link className="w-3 h-3 mr-1" />
            URL
          </Button>
          <Button
            onClick={() => setInputMode('document')}
            variant={inputMode === 'document' ? 'default' : 'ghost'}
            size="sm"
            className={`px-3 py-1 text-xs ${inputMode === 'document' ? 'bg-purple-500' : 'text-gray-400 hover:text-white'}`}
          >
            <FileText className="w-3 h-3 mr-1" />
            Document
          </Button>
        </div>
      </div>

      {/* Input Area Based on Mode */}
      {inputMode === 'text' && (
        <div className="flex space-x-2">
          {/* Voice Input Button */}
          <Button
            onClick={handleVoiceInput}
            variant="outline"
            className={`border-white/20 text-white hover:bg-white/10 ${
              isListening || isRecording ? 'bg-red-500/20 border-red-500/50 animate-pulse' : ''
            } ${!browserVoiceEnabled && !('webkitSpeechRecognition' in window) ? 'opacity-50' : ''}`}
            title={
              isRecording
                ? 'Stop Whisper recording'
                : browserVoiceEnabled
                  ? 'Start Whisper voice input'
                  : 'Start browser voice input'
            }
            disabled={voiceLoading}
          >
            {voiceLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording || isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
            disabled={disabled || voiceLoading}
          />

          <Button
            onClick={handleSendMessage}
            disabled={
              (!message.trim() && uploadedFiles.length === 0) ||
              disabled ||
              voiceLoading ||
              processingAttachments
            }
            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
          >
            {processingAttachments ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {inputMode === 'image' && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-purple-400 bg-purple-500/10'
              : 'border-white/20 hover:border-white/40'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-white mb-2">Drop images here or click to browse</p>
          <p className="text-sm text-gray-400 mb-4">Supports JPG, PNG, GIF, WebP (max 10MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose Images
          </Button>
        </div>
      )}

      {inputMode === 'url' && (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Enter URL to analyze (website, article, video)..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
              disabled={disabled}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!urlInput.trim() || disabled || processingAttachments}
              className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
            >
              {processingAttachments ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Supports web pages, articles, YouTube videos, and other online content
          </p>
        </div>
      )}

      {inputMode === 'document' && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-purple-400 bg-purple-500/10'
              : 'border-white/20 hover:border-white/40'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-white mb-2">Drop documents here or click to browse</p>
          <p className="text-sm text-gray-400 mb-4">Supports PDF, DOC, DOCX, TXT (max 10MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            multiple
            onChange={e => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose Documents
          </Button>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2"
            >
              {file.type.startsWith('image/') ? (
                <Image className="w-4 h-4 text-blue-400" />
              ) : (
                <FileText className="w-4 h-4 text-green-400" />
              )}
              <span className="text-sm text-white truncate max-w-32">{file.name}</span>
              <Button
                onClick={() => removeFile(index)}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:bg-red-500/20 p-1"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Controls (always visible) */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2">
          {/* ElevenLabs Voice Generation Toggle */}
          <Button
            onClick={toggleElevenLabs}
            variant="outline"
            size="sm"
            className={`border-white/20 text-white hover:bg-white/10 ${
              !elevenLabsEnabled ? 'opacity-50' : voiceLoading ? 'animate-pulse' : ''
            }`}
            title={
              elevenLabsEnabled
                ? 'Disable ElevenLabs voice generation'
                : 'Enable ElevenLabs voice generation'
            }
          >
            {voiceLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : elevenLabsEnabled ? (
              '🎤'
            ) : (
              '🔇'
            )}
          </Button>

          {/* TTS Toggle */}
          <Button
            onClick={toggleTTS}
            variant="outline"
            size="sm"
            className={`border-white/20 text-white hover:bg-white/10 ${!ttsEnabled ? 'opacity-50' : ''}`}
            title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
          >
            {ttsEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </Button>
        </div>

        {/* Settings */}
        <Button
          onClick={() => {
            // Open voice settings modal or panel
            alert('Voice settings panel would open here');
          }}
          variant="outline"
          size="sm"
          className="border-white/20 text-white hover:bg-white/10"
          title="Voice settings"
        >
          <Settings className="w-3 h-3" />
        </Button>
      </div>

      {/* Status Indicators */}
      {(isListening || isRecording || voiceLoading || processingAttachments) && (
        <div className="mt-2 flex items-center space-x-2">
          {isRecording && (
            <span className="text-sm text-orange-400 flex items-center">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse mr-2"></div>
              Recording with Whisper...
            </span>
          )}
          {isListening && (
            <span className="text-sm text-blue-400 flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
              Listening...
            </span>
          )}
          {(voiceLoading || processingAttachments) && (
            <span className="text-sm text-purple-400 flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2"></div>
              Processing...
            </span>
          )}
        </div>
      )}

      {/* Capability Indicators */}
      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
        {browserVoiceEnabled && (
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
            Whisper STT
          </span>
        )}
        {elevenLabsEnabled && (
          <span className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
            ElevenLabs TTS
          </span>
        )}
        {ttsEnabled && (
          <span className="flex items-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
            Browser TTS
          </span>
        )}
      </div>
    </div>
  );
}
