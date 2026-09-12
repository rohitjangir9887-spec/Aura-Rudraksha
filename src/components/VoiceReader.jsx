import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Loader2, Sparkles } from 'lucide-react';

export function VoiceReader({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const chunksRef = useRef([]);
  const currentChunkIndexRef = useRef(0);
  const keepAliveTimerRef = useRef(null);

  // Preload and cache voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch (err) {
        console.warn('Could not load speech voices:', err);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;
    setIsPlaying(false);
    setIsLoading(false);
  };

  // Clean and prepare text specifically for a natural, respectful Pandit Ji delivery
  const cleanTextForPanditJi = (rawText) => {
    if (!rawText) return '';

    let cleaned = rawText
      // Strip URLs and links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, '')
      // Strip markdown formatting symbols
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      // Currency & common Vedic commerce replacements for natural Hindi pronunciation
      .replace(/₹\s*([0-9,]+)/g, '$1 रुपये')
      .replace(/Rs\.?\s*([0-9,]+)/gi, '$1 रुपये')
      .replace(/(\b)COD(\b)/gi, 'कैश ऑन डिलीवरी')
      .replace(/%/g, ' प्रतिशत ')
      .replace(/&/g, ' और ')
      .replace(/\+/g, ' और ')
      // Strip all emojis & decorative symbols
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Strip zero-width chars and repetitive spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  };

  // Find the best natural Indian / Hindi Male Pandit Ji voice
  const findPanditJiVoice = (voices, isHindiText) => {
    if (!voices || voices.length === 0) return { voice: null, isExplicitMale: false };

    const lowerName = (v) => (v.name || '').toLowerCase();
    const lowerLang = (v) => (v.lang || '').toLowerCase();

    // Comprehensive list of female voice keywords across Windows, Edge, Android, iOS, Chrome, macOS
    const femaleKeywords = [
      'heera', 'kalpana', 'swara', 'lekha', 'veena', 'zira', 'priya', 'anjali', 
      'aditi', 'kavya', 'geeta', 'sita', 'shreya', 'neerja', 'jaya', 'ananya', 
      'shruti', 'female', 'woman', 'girl', 'catherine', 'susan', 'samantha', 
      'karen', 'victoria', 'moira', 'tessa', 'fiona', 'serena', 'hazel', 'salli', 
      'joanna', 'ivy', 'kendra', 'kimberly', 'amy', 'emma', 'stephanie', 'sonia', 
      'priti', 'neha', 'pooja', 'sneha', 'alva', 'kanya'
    ];

    const isFemale = (v) => femaleKeywords.some(fk => lowerName(v).includes(fk));

    // Male Hindi / Indian preferred voice signatures
    const maleHindiPreferredKeywords = [
      'madhur', // Microsoft Madhur Online (Natural) - Hindi (India) [Premium Male]
      'hemant', // Microsoft Hemant Online - Hindi (India) [Male]
      'prabhat', // eSpeak / Android / Linux Hindi Male
      'rishi', // Apple Rishi / Indian English Male
      'mohan', // Android / SVOX Hindi Male
      'ravi', // Indian Male
      'aarav', // Indian Male
      'neil', // Indian Male
      'male' // Generic explicit Male
    ];

    // Other high quality natural English male voices (for Hinglish)
    const maleEnglishKeywords = [
      'david', // Microsoft David - English Male
      'george', // Microsoft George - English Male
      'mark', // Microsoft Mark - English Male
      'guy', // Microsoft Guy Online Natural
      'ryan', // Microsoft Ryan Online Natural
      'oliver', // Apple Oliver Male
      'daniel', // Apple Daniel Male
      'male'
    ];

    // 1. Try finding explicit Male Hindi voice
    for (const kw of maleHindiPreferredKeywords) {
      const match = voices.find(v => 
        (lowerLang(v).includes('hi') || lowerLang(v).includes('in')) && 
        lowerName(v).includes(kw) && 
        !isFemale(v)
      );
      if (match) return { voice: match, isExplicitMale: true };
    }

    // 2. Try any Hindi voice that is not marked female
    const nonFemaleHindi = voices.find(v => 
      (lowerLang(v).startsWith('hi') || lowerLang(v).includes('hi-in') || lowerLang(v).includes('hi_in')) && 
      !isFemale(v)
    );
    if (nonFemaleHindi) return { voice: nonFemaleHindi, isExplicitMale: false };

    // 3. Try Indian English Male voice
    for (const kw of maleHindiPreferredKeywords) {
      const match = voices.find(v => 
        (lowerLang(v).includes('en-in') || lowerLang(v).includes('en_in') || lowerName(v).includes('india')) && 
        lowerName(v).includes(kw) && 
        !isFemale(v)
      );
      if (match) return { voice: match, isExplicitMale: true };
    }

    // 4. Try any Indian English voice not female
    const nonFemaleIndEng = voices.find(v => 
      (lowerLang(v).includes('en-in') || lowerLang(v).includes('en_in') || lowerName(v).includes('india')) && 
      !isFemale(v)
    );
    if (nonFemaleIndEng) return { voice: nonFemaleIndEng, isExplicitMale: false };

    // 5. Try standard English Male voice (Microsoft David, etc.)
    for (const kw of maleEnglishKeywords) {
      const match = voices.find(v => 
        lowerLang(v).startsWith('en') && 
        lowerName(v).includes(kw) && 
        !isFemale(v)
      );
      if (match) return { voice: match, isExplicitMale: true };
    }

    // 6. Any voice that is strictly not female
    const anyNonFemale = voices.find(v => !isFemale(v));
    if (anyNonFemale) return { voice: anyNonFemale, isExplicitMale: false };

    // 7. Fallback to first available
    return { voice: voices[0] || null, isExplicitMale: false };
  };

  const handlePlayStop = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying || isLoading) {
      stopSpeaking();
      return;
    }

    const cleanText = cleanTextForPanditJi(text);
    if (!cleanText) return;

    setIsLoading(true);

    // Split text into coherent sentences/phrases for reliable browser streaming (avoids Chrome 15s cutoff)
    const rawSentences = cleanText.split(/([।!?\n]+|\.\s+)/).filter(Boolean);
    const combinedChunks = [];
    let currentChunk = '';

    for (let i = 0; i < rawSentences.length; i++) {
      const part = rawSentences[i].trim();
      if (!part) continue;

      if ((currentChunk + ' ' + part).length < 160) {
        currentChunk = currentChunk ? `${currentChunk} ${part}` : part;
      } else {
        if (currentChunk) combinedChunks.push(currentChunk);
        currentChunk = part;
      }
    }
    if (currentChunk) combinedChunks.push(currentChunk);

    if (combinedChunks.length === 0) {
      setIsLoading(false);
      return;
    }

    chunksRef.current = combinedChunks;
    currentChunkIndexRef.current = 0;

    // Detect Devanagari Hindi or Hinglish
    const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const { voice: selectedVoice, isExplicitMale } = findPanditJiVoice(voices, hasDevanagari);

    // Chrome keep-alive hack
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    keepAliveTimerRef.current = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 9000);

    const speakChunk = (index) => {
      if (index >= chunksRef.current.length) {
        stopSpeaking();
        return;
      }

      const chunkText = chunksRef.current[index];
      const utterance = new SpeechSynthesisUtterance(chunkText);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || (hasDevanagari ? 'hi-IN' : 'en-IN');
      } else {
        utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';
      }

      // Calm, authoritative, formal male Vedic Pandit Ji baritone resonance
      utterance.rate = 0.88; // Dignified, calm Vedic chanting pace
      // If voice is explicit male, pitch 0.90; if neutral/unknown voice, lower pitch to 0.82 to enforce deep male baritone
      utterance.pitch = isExplicitMale ? 0.90 : 0.82;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      utterance.onend = () => {
        currentChunkIndexRef.current = index + 1;
        speakChunk(index + 1);
      };

      utterance.onerror = (e) => {
        console.warn('Speech chunk error:', e);
        if (index + 1 < chunksRef.current.length) {
          speakChunk(index + 1);
        } else {
          stopSpeaking();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    window.speechSynthesis.cancel();
    speakChunk(0);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handlePlayStop}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '16px',
        background: isPlaying
          ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
          : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        color: isPlaying ? '#ffffff' : '#92400e',
        border: isPlaying ? '1px solid #ef4444' : '1px solid #fde68a',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 600,
        marginTop: '6px',
        boxShadow: isPlaying
          ? '0 2px 8px rgba(220, 38, 38, 0.35)'
          : '0 1px 3px rgba(217, 119, 6, 0.15)',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
      title={isPlaying ? 'वाणी रोकें / Stop Voice' : 'पंडित जी की वाणी सुनें / Listen to Vedic Pandit Ji'}
      aria-label={isPlaying ? 'Stop speech' : 'Listen with Pandit Ji voice'}
    >
      {isLoading ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          <span>तैयार हो रहा है...</span>
        </>
      ) : isPlaying ? (
        <>
          <Square size={10} fill="currentColor" />
          <span>रोकें</span>
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              animation: 'pulse 1s infinite'
            }}
          />
        </>
      ) : (
        <>
          <Volume2 size={12} color="#b45309" />
          <span>पंडित जी से सुनें</span>
        </>
      )}
    </button>
  );
}
