import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Loader2, Sparkles, VolumeX } from 'lucide-react';

// Number to Hindi words mapping for sacred Rudraksha and Vedic numbers
const HINDI_NUMBERS = {
  0: 'शून्य', 1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पांच', 6: 'छह',
  7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस', 11: 'ग्यारह', 12: 'बारह', 13: 'तेरह',
  14: 'चौदह', 15: 'पंद्रह', 16: 'सोलह', 17: 'सत्रह', 18: 'अठारह', 19: 'उन्नीस',
  20: 'बीस', 21: 'इक्कीस', 22: 'बाईस', 23: 'तेईस', 24: 'चौबीस', 25: 'पच्चीस',
  26: 'छब्बीस', 27: 'सत्ताईस', 28: 'अट्ठाईस', 29: 'उनतीस', 30: 'तीस',
  31: 'इकतीस', 32: 'बत्तीस', 33: 'तैंतीस', 34: 'चौंतीस', 35: 'पैंतीस',
  36: 'छत्तीस', 37: 'सैंतीस', 38: 'अड़तीस', 39: 'उनतालीस', 40: 'चालीस',
  41: 'इकतालीस', 42: 'बयालीस', 43: 'तैंतालीस', 44: 'चवालीस', 45: 'पैंतालीस',
  46: 'छियालीस', 47: 'सैंतालीस', 48: 'अड़तालीस', 49: 'उनचास', 50: 'पचास',
  51: 'इक्यावन', 52: 'बावन', 53: 'तिरपन', 54: 'चौवन', 55: 'पचपन',
  56: 'छप्पन', 57: 'सत्तावन', 58: 'अट्ठावन', 59: 'उनसठ', 60: 'साठ',
  61: 'इकसठ', 62: 'बासठ', 63: 'तिरसठ', 64: 'चौंसठ', 65: 'पैंसठ',
  66: 'छियासठ', 67: 'सरसठ', 68: 'अड़सठ', 69: 'उनहत्तर', 70: 'सत्तर',
  71: 'इकहत्तर', 72: 'बहत्तर', 73: 'तिहत्तर', 74: 'चौहत्तर', 75: 'पचहत्तर',
  76: 'छिहत्तर', 77: 'सतहत्तर', 78: 'अठहत्तर', 79: 'उनासी', 80: 'अस्सी',
  81: 'इक्यासी', 82: 'बयासी', 83: 'तिरासी', 84: 'चौरासी', 85: 'पचासी',
  86: 'छियासी', 87: 'सत्तासी', 88: 'अट्ठासी', 89: 'नवासी', 90: 'नब्बे',
  91: 'इक्यानवे', 92: 'बानवे', 93: 'तिरानवे', 94: 'चौरानवे', 95: 'पंचानवे',
  96: 'छियानवे', 97: 'सत्तानवे', 98: 'अट्ठानवे', 99: 'निन्यानवे', 100: 'सौ',
  108: 'एक सौ आठ'
};

/**
 * Converts a positive integer into spoken Hindi words
 */
function numberToHindiWords(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 0) return String(num);
  if (HINDI_NUMBERS[n]) return HINDI_NUMBERS[n];

  if (n < 100) return String(n);

  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const hundredsWord = (hundreds === 1 ? 'एक सौ' : `${HINDI_NUMBERS[hundreds] || hundreds} सौ`);
    if (remainder === 0) return hundredsWord;
    return `${hundredsWord} ${HINDI_NUMBERS[remainder] || remainder}`;
  }

  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    const thousandsWord = `${numberToHindiWords(thousands)} हज़ार`;
    if (remainder === 0) return thousandsWord;
    return `${thousandsWord} ${numberToHindiWords(remainder)}`;
  }

  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const remainder = n % 100000;
    const lakhsWord = `${numberToHindiWords(lakhs)} लाख`;
    if (remainder === 0) return lakhsWord;
    return `${lakhsWord} ${numberToHindiWords(remainder)}`;
  }

  const crores = Math.floor(n / 10000000);
  const remainder = n % 10000000;
  const croresWord = `${numberToHindiWords(crores)} करोड़`;
  if (remainder === 0) return croresWord;
  return `${croresWord} ${numberToHindiWords(remainder)}`;
}

/**
 * Normalizes numbers, Vedic spiritual terminology, currency, and symbols for natural Indian Hindi speech synthesis
 */
export function cleanAndNormalizeTextForTTS(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, '')
    // Remove markdown formatting
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[•\-*+]\s+/gm, '')
    .replace(/\|/g, ' ')
    // Normalize Vedic / Rudraksha terminology
    .replace(/(\b)Rudraksha(\b)/gi, 'रुद्राक्ष')
    .replace(/(\b)Rudraksh(\b)/gi, 'रुद्राक्ष')
    .replace(/(\b)Mukhi(\b)/gi, 'मुखी')
    .replace(/(\b)Mala(\b)/gi, 'माला')
    .replace(/(\b)Malas(\b)/gi, 'मालाएं')
    .replace(/(\b)Japa(\b)/gi, 'जाप')
    .replace(/(\b)Jaap(\b)/gi, 'जाप')
    .replace(/(\b)Siddha(\b)/gi, 'सिद्ध')
    .replace(/(\b)Gauri Shankar(\b)/gi, 'गौरी शंकर')
    .replace(/(\b)Garbh Gauri(\b)/gi, 'गर्भ गौरी')
    .replace(/(\b)Ganesh(\b)/gi, 'गणेश')
    .replace(/(\b)Nepal(\b)/gi, 'नेपाली')
    .replace(/(\b)Nepali(\b)/gi, 'नेपाली')
    .replace(/(\b)Indonesian(\b)/gi, 'इंडोनेशियाई')
    .replace(/(\b)Indonesia(\b)/gi, 'इंडोनेशिया')
    .replace(/(\b)Pran Pratishtha(\b)/gi, 'प्राण प्रतिष्ठा')
    .replace(/(\b)Beej Mantra(\b)/gi, 'बीज मंत्र')
    .replace(/(\b)Ganga Jal(\b)/gi, 'गंगाजल')
    .replace(/(\b)Om(\b)/gi, 'ॐ')
    .replace(/(\b)Aum(\b)/gi, 'ॐ')
    .replace(/(\b)Shiva(\b)/gi, 'भगवान शिव')
    .replace(/(\b)Shiv(\b)/gi, 'शिव')
    .replace(/(\b)Devotee(\b)/gi, 'भक्त')
    .replace(/(\b)Kundali(\b)/gi, 'कुंडली')
    .replace(/(\b)Kundli(\b)/gi, 'कुंडली')
    .replace(/(\b)Rashi(\b)/gi, 'राशि')
    .replace(/(\b)Graha(\b)/gi, 'ग्रह')
    .replace(/(\b)Vedic(\b)/gi, 'वैदिक')
    .replace(/(\b)Lab Certificate(\b)/gi, 'लैब सर्टिफिकेट')
    .replace(/(\b)Lab Certified(\b)/gi, 'लैब प्रमाणित')
    .replace(/(\b)Certificate(\b)/gi, 'सर्टिफिकेट')
    .replace(/(\b)Free Delivery(\b)/gi, 'मुफ्त डिलीवरी')
    .replace(/(\b)Free Shipping(\b)/gi, 'मुफ्त शिपिंग')
    .replace(/(\b)COD(\b)/gi, 'कैश ऑन डिलीवरी')
    .replace(/(\b)Cash on Delivery(\b)/gi, 'कैश ऑन डिलीवरी')
    .replace(/(\b)Order(\b)/gi, 'ऑर्डर')
    .replace(/(\b)Stock(\b)/gi, 'स्टॉक')
    .replace(/(\b)WhatsApp(\b)/gi, 'व्हाट्सएप');

  // Convert "1 to 21 Mukhi" or "1-21 Mukhi" or "1 से 21 मुखी"
  text = text.replace(/(\d+)\s*(?:to|-|से)\s*(\d+)\s*(?:Mukhi|मुखी)/gi, (match, p1, p2) => {
    const w1 = HINDI_NUMBERS[parseInt(p1, 10)] || p1;
    const w2 = HINDI_NUMBERS[parseInt(p2, 10)] || p2;
    return `${w1} से ${w2} मुखी`;
  });

  // Convert "N Mukhi" (e.g. 5 Mukhi, 7 मुखी, 1 मुखी) to Hindi words
  text = text.replace(/(\b)(\d{1,2})\s*(?:Mukhi|मुखी)(\b)/gi, (match, b1, num, b2) => {
    const word = HINDI_NUMBERS[parseInt(num, 10)] || num;
    return `${word} मुखी`;
  });

  // Convert Currency (₹ 2499, Rs. 2499, INR 2499)
  text = text.replace(/(?:₹|Rs\.?|INR)\s*([\d,]+)/gi, (match, rawDigits) => {
    const cleanNum = parseInt(rawDigits.replace(/,/g, ''), 10);
    if (!isNaN(cleanNum)) {
      const words = numberToHindiWords(cleanNum);
      return `${words} रुपये`;
    }
    return `${rawDigits} रुपये`;
  });

  // Convert percentages: 50% -> पचास प्रतिशत
  text = text.replace(/(\d+)\s*%/g, (match, num) => {
    const word = HINDI_NUMBERS[parseInt(num, 10)] || num;
    return `${word} प्रतिशत`;
  });

  // Convert 108 मनके / beads
  text = text.replace(/108\s*(?:मनके|मनका|beads|दाने)/gi, 'एक सौ आठ मनके');

  // Convert Standalone small numbers (1 to 21) into spoken Hindi words
  text = text.replace(/(^|\s)(\d{1,2})(\s|$|[।,!?])/g, (match, prefix, num, suffix) => {
    const val = parseInt(num, 10);
    if (val >= 1 && val <= 21 && HINDI_NUMBERS[val]) {
      return `${prefix}${HINDI_NUMBERS[val]}${suffix}`;
    }
    return match;
  });

  // Convert English connector words for smooth Hindi flow
  text = text
    .replace(/(\b)and(\b)/gi, 'और')
    .replace(/(\b)with(\b)/gi, 'के साथ')
    .replace(/(\b)for(\b)/gi, 'के लिए')
    .replace(/(\b)is(\b)/gi, 'है')
    .replace(/(\b)are(\b)/gi, 'हैं')
    .replace(/&/g, ' और ')
    .replace(/\+/g, ' और ');

  // Strip emojis & decorative symbols
  text = text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize punctuation
    .replace(/[:;]/g, '। ')
    .replace(/[!?]/g, '। ')
    .replace(/\.{2,}/g, '। ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Intelligent sentence splitter designed specifically to keep chunks between 30 and 120 chars
 * This prevents the Web Speech API 15-second cutoff bug in Chrome, Android, and Safari.
 */
function splitIntoSpokenChunks(text) {
  if (!text) return [];

  // Split on Hindi danda (।), period (.), exclamation, question mark, newline, or commas
  const rawParts = text.split(/([।\n\r]+|[.!?]+\s*)/).filter(Boolean);
  const chunks = [];
  let current = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i].trim();
    if (!part || part === '।' || part === '.' || part === '!' || part === '?') {
      if (current && !current.endsWith('।') && !current.endsWith('.')) {
        current += '।';
      }
      continue;
    }

    // If adding this part exceeds ~100 characters, push current and start new chunk
    if ((current + ' ' + part).length > 110) {
      if (current) {
        chunks.push(current.trim());
      }
      current = part;
    } else {
      current = current ? `${current} ${part}` : part;
    }
  }

  if (current && current.trim().length > 0) {
    chunks.push(current.trim());
  }

  // Secondary pass: if any chunk is still > 140 chars (e.g. no punctuation), split by comma or spaces
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= 140) {
      finalChunks.push(chunk);
    } else {
      const subParts = chunk.split(/([,;]+|\s{4,})/).filter(Boolean);
      let subCurrent = '';
      for (const sp of subParts) {
        if ((subCurrent + ' ' + sp).length > 100) {
          if (subCurrent) finalChunks.push(subCurrent.trim());
          subCurrent = sp;
        } else {
          subCurrent = subCurrent ? `${subCurrent} ${sp}` : sp;
        }
      }
      if (subCurrent) finalChunks.push(subCurrent.trim());
    }
  }

  return finalChunks.filter(c => c && c.replace(/[।.\s]/g, '').length > 0);
}

/**
 * Select the highest quality Indian / Hindi voice available in the client browser
 */
function selectBestIndianVoice(voices) {
  if (!voices || voices.length === 0) return null;

  const lowerName = (v) => (v.name || '').toLowerCase();
  const lowerLang = (v) => (v.lang || '').toLowerCase();

  // Tier 1: Dedicated Indian Hindi Voices (Native Hindi Pronunciation)
  // E.g., Google हिन्दी, Microsoft Madhur Online (Natural) - Hindi (India), Microsoft Swara, Microsoft Hemant, Apple Lekha, Android Hindi
  const tier1Hindi = voices.find(v => 
    (lowerLang(v).includes('hi-in') || lowerLang(v).includes('hi_in') || lowerLang(v) === 'hi') &&
    (lowerName(v).includes('madhur') || lowerName(v).includes('google') || lowerName(v).includes('swara') || lowerName(v).includes('hemant') || lowerName(v).includes('natural') || lowerName(v).includes('lekha') || lowerName(v).includes('heera'))
  );
  if (tier1Hindi) return tier1Hindi;

  // Tier 2: Any available Hindi voice
  const anyHindi = voices.find(v => 
    lowerLang(v).startsWith('hi') || lowerLang(v).includes('hi-in') || lowerLang(v).includes('hi_in') || lowerName(v).includes('hindi') || lowerName(v).includes('हिन्दी')
  );
  if (anyHindi) return anyHindi;

  // Tier 3: High-Quality Indian English Voices (Trained on Indian phonetics & accents)
  // E.g., Google Indian English, Microsoft Neerja / Prabhat / Ravi, Apple Rishi / Sangeeta
  const tier3IndianEnglish = voices.find(v => 
    (lowerLang(v).includes('en-in') || lowerLang(v).includes('en_in') || lowerName(v).includes('india')) &&
    (lowerName(v).includes('google') || lowerName(v).includes('rishi') || lowerName(v).includes('prabhat') || lowerName(v).includes('neerja') || lowerName(v).includes('ravi') || lowerName(v).includes('natural'))
  );
  if (tier3IndianEnglish) return tier3IndianEnglish;

  // Tier 4: Any Indian English / Indian Locale voice
  const anyIndianLocale = voices.find(v => 
    lowerLang(v).includes('en-in') || lowerLang(v).includes('en_in') || lowerName(v).includes('india') || lowerLang(v).includes('-in')
  );
  if (anyIndianLocale) return anyIndianLocale;

  // Tier 5: Default system voice fallback
  const defaultVoice = voices.find(v => v.default) || voices[0];
  return defaultVoice || null;
}

export function VoiceReader({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // Audio state refs to prevent garbage collection and race conditions
  const chunksRef = useRef([]);
  const currentChunkIndexRef = useRef(0);
  const keepAliveTimerRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const isCanceledRef = useRef(false);

  // Load and cache browser voices safely
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const updateVoices = () => {
      try {
        const vList = window.speechSynthesis.getVoices() || [];
        if (vList.length > 0) {
          setAvailableVoices(vList);
        }
      } catch (err) {
        console.warn('[VoiceReader] Could not load speech voices:', err);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Secondary fallback poll for slow voice loading in Chrome / Android
    const retryTimer = setTimeout(updateVoices, 500);

    return () => {
      clearTimeout(retryTimer);
      stopSpeaking();
    };
  }, []);

  const stopSpeaking = () => {
    isCanceledRef.current = true;
    
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }

    // Clear global and local utterance references to allow clean garbage collection on stop
    if (typeof window !== 'undefined') {
      window.__auraCurrentUtterance = null;
    }
    activeUtteranceRef.current = null;
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handlePlayStop = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying || isLoading) {
      stopSpeaking();
      return;
    }

    const normalizedText = cleanAndNormalizeTextForTTS(text);
    if (!normalizedText) return;

    const chunks = splitIntoSpokenChunks(normalizedText);
    if (chunks.length === 0) return;

    setIsLoading(true);
    isCanceledRef.current = false;
    chunksRef.current = chunks;
    currentChunkIndexRef.current = 0;

    // Fetch latest voices
    let voices = availableVoices;
    if (!voices || voices.length === 0) {
      voices = window.speechSynthesis.getVoices() || [];
    }
    const selectedVoice = selectBestIndianVoice(voices);
    const isHindiVoice = selectedVoice && (selectedVoice.lang?.toLowerCase().startsWith('hi') || selectedVoice.name?.toLowerCase().includes('hindi') || selectedVoice.name?.includes('हिन्दी'));

    // Cancel any stale speech before starting
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    // Heartbeat Keep-Alive to prevent Chrome / Safari / Android mid-speech freezing
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    keepAliveTimerRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (window.speechSynthesis.speaking && activeUtteranceRef.current) {
          // Subtle pause-resume heartbeat ensures internal Chrome audio buffer doesn't timeout
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 8000);

    const speakNextChunk = (index) => {
      if (isCanceledRef.current) return;

      if (index >= chunksRef.current.length) {
        stopSpeaking();
        return;
      }

      const chunkText = chunksRef.current[index];
      if (!chunkText || chunkText.trim().length === 0) {
        speakNextChunk(index + 1);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(chunkText);
        
        // CRITICAL FIX FOR SPEECH STOPPING MIDWAY:
        // Store utterance in persistent window object and component ref to prevent browser V8 Garbage Collector from destroying it mid-sentence!
        activeUtteranceRef.current = utterance;
        if (typeof window !== 'undefined') {
          window.__auraCurrentUtterance = utterance;
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang || (isHindiVoice ? 'hi-IN' : 'en-IN');
        } else {
          utterance.lang = 'hi-IN';
        }

        // Peaceful, dignified Vedic Pandit Ji pace and tone
        utterance.rate = 0.90; // Natural, clear cadence for mantras and explanations
        utterance.pitch = isHindiVoice ? 0.95 : 0.88; // Deep, respectful baritone
        utterance.volume = 1.0;

        utterance.onstart = () => {
          if (isCanceledRef.current) return;
          setIsLoading(false);
          setIsPlaying(true);
        };

        utterance.onend = () => {
          if (isCanceledRef.current) return;
          currentChunkIndexRef.current = index + 1;
          // Short 60ms breath pause between chunks for realistic human Vedic chanting rhythm
          setTimeout(() => {
            speakNextChunk(index + 1);
          }, 60);
        };

        utterance.onerror = (e) => {
          if (isCanceledRef.current) return;
          console.warn('[VoiceReader] Chunk playback note:', e?.error || e);
          // If canceled or interrupted intentionally, do nothing
          if (e?.error === 'canceled' || e?.error === 'interrupted') {
            return;
          }
          // On other errors, skip to next chunk smoothly without breaking the entire narration
          setTimeout(() => {
            speakNextChunk(index + 1);
          }, 80);
        };

        window.speechSynthesis.speak(utterance);

        // Safari/iOS audio unlock check
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        console.error('[VoiceReader] Utterance failed:', err);
        stopSpeaking();
      }
    };

    // Small timeout ensures speechSynthesis buffer is fully reset after cancel()
    setTimeout(() => {
      speakNextChunk(0);
    }, 50);
  };

  if (!isSupported) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <button
        type="button"
        onClick={handlePlayStop}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '16px',
          background: isPlaying
            ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
            : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          color: isPlaying ? '#ffffff' : '#92400e',
          border: isPlaying ? '1px solid #ef4444' : '1px solid #fde68a',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          boxShadow: isPlaying
            ? '0 2px 10px rgba(220, 38, 38, 0.35)'
            : '0 1px 4px rgba(217, 119, 6, 0.15)',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
        title={isPlaying ? 'वाणी रोकें / Stop Speech' : 'पंडित जी की वाणी में सुनें / Listen in Pandit Ji Voice'}
        aria-label={isPlaying ? 'Stop speech' : 'Listen with Pandit Ji voice'}
      >
        {isLoading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>वाणी तैयार हो रही है...</span>
          </>
        ) : isPlaying ? (
          <>
            <Square size={11} fill="currentColor" />
            <span>वाणी रोकें</span>
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
            <Volume2 size={13} color="#b45309" />
            <span>पंडित जी से सुनें</span>
          </>
        )}
      </button>

      {isPlaying && (
        <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <Sparkles size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
          <span>वैदिक उच्चारण जारी है</span>
        </span>
      )}
    </div>
  );
}
