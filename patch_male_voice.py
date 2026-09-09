with open("src/components/VoiceReader.jsx", "r") as f:
    code = f.read()

target = """    if (voices.length > 0) {
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
    utterance.pitch = 0.95;"""

replacement = """    if (voices.length > 0) {
      let bestVoice = null;
      
      // Keywords that typically denote a male voice in various OS TTS engines
      const maleKeywords = ['male', 'man', 'rishi', 'neil', 'ravi', 'hemant', 'amit', 'prabhat', 'arvind', 'david', 'mark'];
      const isMale = (v) => maleKeywords.some(kw => v.name.toLowerCase().includes(kw));
      
      if (hasDevanagari) {
        utterance.lang = 'hi-IN';
        const hiVoices = voices.filter(v => v.lang.includes('hi') || v.lang.includes('IN'));
        
        // 1. Prioritize Male Hindi voices
        bestVoice = hiVoices.find(v => (v.lang === 'hi-IN' || v.lang === 'hi_IN') && isMale(v)) ||
                    // 2. Prioritize Male Indian voices
                    hiVoices.find(v => isMale(v)) ||
                    // 3. Fallback to Premium/Google Hindi
                    hiVoices.find(v => v.name.includes('Google हिन्दी') || v.name.includes('Google Hindi') || v.name.includes('Premium')) ||
                    // 4. Any Hindi
                    hiVoices.find(v => v.lang.includes('hi')) || hiVoices[0];
      } else {
        // Hinglish / English
        utterance.lang = 'en-IN';
        const enVoices = voices.filter(v => v.lang.includes('en'));
        
        // 1. Prioritize Male Indian English voices
        bestVoice = enVoices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && isMale(v)) ||
                    // 2. Prioritize Any Male English voice
                    enVoices.find(v => isMale(v)) ||
                    // 3. Fallback to Indian English
                    enVoices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN') ||
                    enVoices[0];
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    } else {
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';
    }

    // Lower the pitch significantly to simulate a deeper, masculine Pandit Ji voice. 
    // This helps even if the system defaults to a female voice.
    utterance.rate = 0.90;
    utterance.pitch = 0.75;"""

code = code.replace(target, replacement)

with open("src/components/VoiceReader.jsx", "w") as f:
    f.write(code)
