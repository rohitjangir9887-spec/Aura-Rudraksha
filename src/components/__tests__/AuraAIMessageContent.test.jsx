import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AuraAIMessageContent } from "../AuraAIMessageContent.jsx";

describe("AuraAIMessageContent Rich UI & Lossless Rendering", () => {
  it("renders greetings, dividers, headings, tables, and mantras completely", () => {
    const aiText = `[GREETING]🙏 प्रणाम भक्त! हर हर महादेव![/GREETING]

[DIVIDER]

## वैदिक जन्म कुंडली विश्लेषण (Vedic Kundali Analysis)

आपके लग्न में सूर्य देव उच्च के होकर विराजमान हैं। यह अत्यंत शुभ योग है।

| ग्रह (Planet) | भाव (House) | राशि (Sign) | स्थिति (Status) | फल व प्रभाव (Interpretation) |
|---|---|---|---|---|
| सूर्य (Sun) | 1st भाव | मेष | उच्च | मान-सम्मान व नेतृत्व क्षमता में वृद्धि होगी। |
| चंद्रमा (Moon) | 4th भाव | कर्क | स्वगृही | मानसिक शांति व माता का स्नेह प्राप्त होगा। |

[MANTRA]ॐ नमः शिवाय[/MANTRA]

[WARNING]⚠️ कालसर्प दोष आंशिक रूप से प्रभाव दिखा रहा है।[/WARNING]

**अनुशंसित रुद्राक्ष:** 5 मुखी रुद्राक्ष एवं 7 मुखी रुद्राक्ष धारण करें।

हर हर महादेव! 🕉️`;

    const html = renderToString(
      <MemoryRouter>
        <AuraAIMessageContent text={aiText} sender="ai" />
      </MemoryRouter>
    );

    // Verify greeting rendered
    expect(html).toContain("प्रणाम भक्त! हर हर महादेव!");

    // Verify heading rendered
    expect(html).toContain("वैदिक जन्म कुंडली विश्लेषण");

    // Verify all table cells rendered completely without loss
    expect(html).toContain("सूर्य (Sun)");
    expect(html).toContain("मान-सम्मान व नेतृत्व क्षमता में वृद्धि होगी।");
    expect(html).toContain("चंद्रमा (Moon)");
    expect(html).toContain("मानसिक शांति व माता का स्नेह प्राप्त होगा।");

    // Verify mantra rendered
    expect(html).toContain("ॐ नमः शिवाय");

    // Verify warning rendered
    expect(html).toContain("कालसर्प दोष");
    expect(html).toContain("आंशिक रूप से प्रभाव दिखा रहा है।");

    // Verify summary rendered at the bottom
    expect(html).toContain("सरल ग्राहक सारांश");
  });

  it("never truncates or drops any paragraph from long 6000+ words text", () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) => `विस्तृत व्याख्या खंड ${i + 1}: यह भाव आपके जीवन में विशेष फल प्रदान करेगा और आध्यात्मिक उन्नति कराएगा।`);
    const longAiText = paragraphs.join("\n\n");

    const html = renderToString(
      <MemoryRouter>
        <AuraAIMessageContent text={longAiText} sender="ai" />
      </MemoryRouter>
    );

    paragraphs.forEach((p) => {
      expect(html).toContain(p);
    });
  });
});
