const fs = require('fs');
let code = fs.readFileSync('src/components/AuraAIFloating.jsx', 'utf8');

// Fix executeQuickAction
const executeQuickActionOld = /const executeQuickAction = \(prompt\) => \{[\s\S]*?\}, 1000\);\n  \};/;
const executeQuickActionNew = `const executeQuickAction = (prompt) => {
    setShowQuickActions(false);
    setIsFullWindow(false);
    setIsOpen(true);
    if (prompt) {
      setTimeout(() => {
        handleSend(prompt);
      }, 50);
    }
  };`;
code = code.replace(executeQuickActionOld, executeQuickActionNew);

// Make VoiceReader appear for all AI messages, not just panditji mode
// It currently is: {m.sender === "ai" && mode === "panditji" && m.text && (
code = code.replace(/\{m\.sender === "ai" && mode === "panditji" && m\.text && \(/g, 
                    '{m.sender === "ai" && m.text && (');

fs.writeFileSync('src/components/AuraAIFloating.jsx', code);
console.log("Fixed timing and VoiceReader");
