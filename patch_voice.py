with open("src/components/VoiceReader.jsx", "r") as f:
    code = f.read()

import re

# We will rewrite the voice selection logic to prioritize natural, premium voices and remove pitch distortion.
target = """    if (voices.length > 0) {
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

    // Adjust rate and pitch to sound more authoritative but keep it natural enough
    utterance.rate = 0.90;
    
    // If we couldn't find a specifically male voice, we drop the pitch to simulate one.
    // However, if we DID find a native male voice, we keep the pitch near normal (0.8-1.0) so it doesn't sound distorted.
    const isActuallyMale = bestVoice && ['male', 'man', 'rishi', 'neil', 'ravi', 'hemant', 'amit', 'prabhat', 'arvind', 'david', 'mark'].some(kw => bestVoice.name.toLowerCase().includes(kw));
    utterance.pitch = isActuallyMale ? 0.9 : 0.4;"""

replacement = """    if (voices.length > 0) {
      let bestVoice = null;
      
      const isNatural = (v) => ['google', 'premium', 'natural', 'online', 'neural'].some(kw => v.name.toLowerCase().includes(kw));
      
      if (hasDevanagari) {
        utterance.lang = 'hi-IN';
        const hiVoices = voices.filter(v => v.lang.includes('hi') || v.lang.includes('IN'));
        
        // Prioritize natural, Google, and premium Hindi voices to sound like ElevenLabs
        bestVoice = hiVoices.find(v => (v.lang === 'hi-IN' || v.lang === 'hi_IN') && isNatural(v)) ||
                    hiVoices.find(v => isNatural(v)) ||
                    hiVoices.find(v => v.lang.includes('hi')) || hiVoices[0];
      } else {
        utterance.lang = 'en-IN';
        const enVoices = voices.filter(v => v.lang.includes('en'));
        
        // Prioritize natural Indian English voices
        bestVoice = enVoices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && isNatural(v)) ||
                    enVoices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN') ||
                    enVoices.find(v => isNatural(v)) ||
                    enVoices[0];
      }
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    } else {
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';
    }

    // Pure natural pitch and rate (1.0). Distorting pitch makes it sound robotic.
    utterance.rate = 1.0;
    utterance.pitch = 1.0;"""

code = code.replace(target, replacement)

with open("src/components/VoiceReader.jsx", "w") as f:
    f.write(code)
