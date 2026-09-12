import re

with open("src/pages/AuraAIPage.jsx", "r") as f:
    code = f.read()

# Add import
if "import { VoiceReader }" not in code:
    code = code.replace(
        'import { AuraAIMessageContent } from "../components/AuraAIMessageContent";',
        'import { AuraAIMessageContent } from "../components/AuraAIMessageContent";\nimport { VoiceReader } from "../components/VoiceReader";'
    )

# Add VoiceReader component
target_str = '<AuraAIMessageContent text={customerSafeAiText(m.text)} sender={m.sender} />\n                        </div>'
replacement_str = '''<AuraAIMessageContent text={customerSafeAiText(m.text)} sender={m.sender} />
                        </div>
                        {m.sender === "ai" && mode === "panditji" && m.text && (
                          <div style={{ marginTop: "4px" }}>
                            <VoiceReader text={customerSafeAiText(m.text)} />
                          </div>
                        )}'''

code = code.replace(target_str, replacement_str)

with open("src/pages/AuraAIPage.jsx", "w") as f:
    f.write(code)
