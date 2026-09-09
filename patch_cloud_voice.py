with open("src/components/VoiceReader.jsx", "r") as f:
    code = f.read()

# We'll use the browser's speech synthesis but force it to look for specific high-quality cloud voices if available
target = """    // Force a significantly lower pitch to strongly simulate a male / Pandit Ji voice.
    // We slow down the rate to make it sound calm and authoritative.
    utterance.rate = 0.85;
    utterance.pitch = 0.1;"""

replacement = """    // Adjust rate and pitch to sound more authoritative but keep it natural enough
    utterance.rate = 0.90;
    
    // If we couldn't find a specifically male voice, we drop the pitch to simulate one.
    // However, if we DID find a native male voice, we keep the pitch near normal (0.8-1.0) so it doesn't sound distorted.
    const isActuallyMale = bestVoice && ['male', 'man', 'rishi', 'neil', 'ravi', 'hemant', 'amit', 'prabhat', 'arvind', 'david', 'mark'].some(kw => bestVoice.name.toLowerCase().includes(kw));
    utterance.pitch = isActuallyMale ? 0.9 : 0.4;"""

code = code.replace(target, replacement)

with open("src/components/VoiceReader.jsx", "w") as f:
    f.write(code)
