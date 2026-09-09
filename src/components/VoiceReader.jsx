import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';

export function VoiceReader({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
    } else {
      // Preload voices
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
    
    return () => {
      if (isPlaying) {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  const handlePlayStop = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Clean text for TTS
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/_/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Check for Devanagari characters
    const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
    
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      let bestVoice = null;
      
      if (hasDevanagari) {
        utterance.lang = 'hi-IN';
        bestVoice = voices.find(v => v.name.includes('Google हिन्दी') || v.name.includes('Google Hindi') || v.name.includes('Premium') && (v.lang === 'hi-IN' || v.lang === 'hi_IN')) || 
                    voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN') ||
                    voices.find(v => v.lang.includes('hi'));
      } else {
        // Hinglish / English - use Indian English to sound natural
        utterance.lang = 'en-IN';
        bestVoice = voices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && v.name.includes('Google')) ||
                    voices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN') ||
                    voices.find(v => v.lang.includes('en'));
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    } else {
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';
    }

    utterance.rate = 0.95;
    utterance.pitch = 0.95;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.warn("Speech error", e);
      setIsPlaying(false);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  if (!isSupported) return null;

  return (
    <button 
      onClick={handlePlayStop}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: isPlaying ? '#ef4444' : '#fef3c7',
        color: isPlaying ? '#ffffff' : '#b45309',
        border: 'none',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 'bold',
        marginTop: '4px'
      }}
      title={isPlaying ? "Stop" : "Listen / सुनें"}
    >
      {isPlaying ? (
        <>
          <Square size={10} fill="currentColor" />
          Stop
        </>
      ) : (
        <>
          <Volume2 size={12} />
          सुनें
        </>
      )}
    </button>
  );
}
