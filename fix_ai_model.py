import re

with open("server/controllers/auraAiController.js", "r") as f:
    code = f.read()

# Replace Gemini execution in Streaming
code = code.replace(
    '// 1. Try Gemini 3.8 Flash streaming first for ultra-fast response\n      if (geminiClient && !clientDisconnected) {',
    '// 1. Try Gemini 3.8 Flash streaming first for ultra-fast response (Skip for Pandit Ji)\n      if (mode !== "panditji" && geminiClient && !clientDisconnected) {'
)

# Replace Gemini execution in Non-Streaming
code = code.replace(
    '// Try Gemini 3.8 Flash first\n    const nonStreamGeminiClient = getGeminiClient();\n    if (nonStreamGeminiClient) {',
    '// Try Gemini 3.8 Flash first (Skip for Pandit Ji)\n    const nonStreamGeminiClient = getGeminiClient();\n    if (mode !== "panditji" && nonStreamGeminiClient) {'
)

with open("server/controllers/auraAiController.js", "w") as f:
    f.write(code)
