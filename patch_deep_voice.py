with open("src/components/VoiceReader.jsx", "r") as f:
    code = f.read()

target = """    // Lower the pitch significantly to simulate a deeper, masculine Pandit Ji voice. 
    // This helps even if the system defaults to a female voice.
    utterance.rate = 0.90;
    utterance.pitch = 0.75;"""

replacement = """    // Force a significantly lower pitch to strongly simulate a male / Pandit Ji voice.
    // We slow down the rate to make it sound calm and authoritative.
    utterance.rate = 0.85;
    utterance.pitch = 0.1;"""

code = code.replace(target, replacement)

with open("src/components/VoiceReader.jsx", "w") as f:
    f.write(code)
