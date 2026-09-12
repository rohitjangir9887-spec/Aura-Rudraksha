with open("src/components/VoiceReader.jsx", "r") as f:
    code = f.read()

# Replace the handlePlayStop function with a better one
target = """  const handlePlayStop = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Strip emojis and formatting for reading
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/_/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Check if text has Hindi characters
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);
    
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (hasHindi) {
        const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
        if (hindiVoice) utterance.voice = hindiVoice;
        utterance.lang = 'hi-IN';
      } else {
        const englishVoice = voices.find(v => v.lang.includes('en'));
        if (englishVoice) utterance.voice = englishVoice;
        utterance.lang = 'en-US';
      }
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.cancel(); // Stop any other speech
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };"""

replacement = """  const handlePlayStop = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Clean text for TTS
    const cleanText = text
      .replace(/[\\u{1F600}-\\u{1F64F}\\u{1F300}-\\u{1F5FF}\\u{1F680}-\\u{1F6FF}\\u{1F700}-\\u{1F77F}\\u{1F780}-\\u{1F7FF}\\u{1F800}-\\u{1F8FF}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/gu, '')
      .replace(/\\*/g, '')
      .replace(/#/g, '')
      .replace(/_/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Check for Devanagari characters
    const hasDevanagari = /[\\u0900-\\u097F]/.test(cleanText);
    
    // Determine if it's likely Hinglish (many Roman characters but in a Pandit context)
    // We will bias towards Indian voices heavily.
    
    let voices = window.speechSynthesis.getVoices();
    
    // If voices are empty, sometimes they need to be loaded (esp on first click)
    // But since it's synchronous here, we do our best.
    if (voices.length > 0) {
      // Prioritize natural sounding Google/Premium Hindi voices
      let bestVoice = null;
      
      if (hasDevanagari) {
        utterance.lang = 'hi-IN';
        bestVoice = voices.find(v => v.name.includes('Google हिन्दी') || v.name.includes('Google Hindi') || v.name.includes('Premium') && (v.lang === 'hi-IN' || v.lang === 'hi_IN')) || 
                    voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN') ||
                    voices.find(v => v.lang.includes('hi'));
      } else {
        // For English/Hinglish, pick Indian English to sound natural when reading Romanized Hindi
        utterance.lang = 'en-IN';
        bestVoice = voices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && v.name.includes('Google')) ||
                    voices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN') ||
                    voices.find(v => v.lang.includes('en'));
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    } else {
      // Fallback languages if voices array is empty but TTS still works (common on some mobile browsers)
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';
    }

    // Adjust rate and pitch for a slightly more natural/calm Pandit Ji sound
    utterance.rate = 0.95; // Slightly slower
    utterance.pitch = 0.95; // Slightly deeper

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.warn("Speech error", e);
      setIsPlaying(false);
    };

    window.speechSynthesis.cancel(); // Stop any other speech
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };"""

code = code.replace(target, replacement)
with open("src/components/VoiceReader.jsx", "w") as f:
    f.write(code)

