// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuraQuickAiAssistantCard } from "../AuraQuickAiAssistantCard";
import { AuraSuggestedActionsAccordion } from "../AuraSuggestedActionsAccordion";
import { AuraActiveKundaliCard } from "../AuraActiveKundaliCard";
import { AuraProductRecCard } from "../AuraProductRecCard";
import { AuraPanditWorkspacePanel, PANDIT_ASTROLOGY_QUICK_TOPICS } from "../AuraPanditWorkspacePanel";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("Aura AI + AI Panditji Redesigned Components", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("renders Quick AI assistant card, 5 rows, prompt, and 4 suggestion chips with working clicks", async () => {
    const onSendPrompt = vi.fn();

    await act(async () => {
      root.render(<AuraQuickAiAssistantCard onSendPrompt={onSendPrompt} />);
    });

    expect(container.textContent).toContain("मैं आपकी कैसे सहायता कर सकता हूँ?");
    expect(container.textContent).toContain("असली नेपाली रुद्राक्ष खरीदें");
    expect(container.textContent).toContain("धारण विधि / मंत्र / राशि अनुसार चयन");
    expect(container.textContent).toContain("ऑर्डर ट्रैक करें");
    expect(container.textContent).toContain("लैब सर्टिफिकेट / X-Ray प्रमाणिकता");
    expect(container.textContent).toContain("लाइव कीमत / स्टॉक / कूपन");
    expect(container.textContent).toContain("कृपया बताएं, आज कौन सा रुद्राक्ष या सेवा आपकी सहायता कर सकती है?");
    expect(container.textContent).toContain("सिद्ध 1 से 14 मुखी रुद्राक्ष देखें");
    expect(container.textContent).toContain("फ्री कुंडली व राशि अनुसार रुद्राक्ष");
    expect(container.textContent).toContain("आज के एक्टिव डिस्काउंट कूपन");
    expect(container.textContent).toContain("मेरा ऑर्डर ट्रैक करें");

    const buttons = Array.from(container.querySelectorAll("button"));
    const buyBtn = buttons.find((b) => b.textContent.includes("असली नेपाली रुद्राक्ष खरीदें"));
    const couponChip = buttons.find((b) => b.textContent.includes("आज के एक्टिव डिस्काउंट कूपन"));

    await act(async () => {
      buyBtn.click();
      couponChip.click();
    });

    expect(onSendPrompt).toHaveBeenCalledTimes(2);
    expect(onSendPrompt.mock.calls[0][0]).toContain("असली नेपाली रुद्राक्ष");
    expect(onSendPrompt.mock.calls[1][0]).toContain("कूपन");
  });

  it("renders Suggested Actions accordion for Quick AI & Panditji and expands/collapses cleanly", async () => {
    const onSelectSuggestion = vi.fn();

    await act(async () => {
      root.render(
        <AuraSuggestedActionsAccordion
          mode="standard"
          isLatest={true}
          isWelcome={true}
          onSelectSuggestion={onSelectSuggestion}
        />
      );
    });

    expect(container.textContent).toContain("🔎 सुझाए गए विषय व आगे का परामर्श");
    expect(container.textContent).toContain("1-14 मुखी रुद्राक्ष व कीमत");
    expect(container.textContent).toContain("7 मुखी रुद्राक्ष की कीमत बताओ");
    expect(container.textContent).toContain("2 पीस 5 मुखी का total calculate करो");
    expect(container.textContent).toContain("आज के एक्टिव डिस्काउंट कूपन");

    const row7Mukhi = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("7 मुखी रुद्राक्ष की कीमत बताओ")
    );
    await act(async () => {
      row7Mukhi.click();
    });
    expect(onSelectSuggestion).toHaveBeenCalledWith("7 मुखी रुद्राक्ष की कीमत बताओ");

    // Re-render in panditji mode and test expand/collapse
    await act(async () => {
      root.render(
        <AuraSuggestedActionsAccordion
          mode="panditji"
          canonicalMukhi="1 Mukhi Rudraksha"
          isLatest={true}
          isWelcome={true}
          onSelectSuggestion={onSelectSuggestion}
        />
      );
    });

    expect(container.textContent).toContain("✨ सुझाए गए विषय व आगे का परामर्श (Suggested Actions)");
    expect(container.textContent).toContain("1 Mukhi Rudraksha धारण विधि व बीज मंत्र");
    expect(container.textContent).toContain("कुंडली अनुसार 1 Mukhi Rudraksha लाभ");
    expect(container.textContent).toContain("सिद्ध 1 Mukhi Rudraksha स्टोर में देखें");
    expect(container.textContent).toContain("विशोंत्तरी महादशा व ग्रह उपाय");

    const trigger = container.querySelector(".aura-suggest-accordion-trigger");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await act(async () => {
      trigger.click();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders Active Kundli Card with details and Change/Delete callbacks", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    await act(async () => {
      root.render(
        <AuraActiveKundaliCard
          activeBirthDetails={{
            name: "Devotee",
            dob: "2006-05-11",
            birthTime: "12:45",
            birthPlace: "Sikar"
          }}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
    });

    expect(container.textContent).toContain("ॐ Active Kundli");
    expect(container.textContent).toContain("Devotee");
    expect(container.textContent).toContain("2006-05-11");
    expect(container.textContent).toContain("12:45");
    expect(container.textContent).toContain("Sikar");

    const editBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("बदलें")
    );
    const delBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("हटाएं")
    );

    await act(async () => {
      editBtn.click();
      delBtn.click();
    });

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("renders Product Recommendation Card with discount, price, rating, stock, View, Buy, and Add to Cart", async () => {
    const onBuy = vi.fn();
    const onAddToCart = vi.fn();
    const product = {
      id: "rudra-5-mukhi",
      slug: "5-mukhi-nepal-rudraksha",
      name: "5 Mukhi Nepal Rudraksha",
      price: 799,
      comparePrice: 1599,
      rating: 4.9,
      stock: 12,
      image: "/images/product-5mukhi.jpg"
    };

    await act(async () => {
      root.render(
        <MemoryRouter>
          <AuraProductRecCard
            product={product}
            isAdded={false}
            variant="compact"
            onBuy={onBuy}
            onAddToCart={onAddToCart}
          />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain("5 Mukhi Nepal Rudraksha");
    expect(container.textContent).toContain("50% OFF");
    expect(container.textContent).toContain("₹799");
    expect(container.textContent).toContain("₹1,599");
    expect(container.textContent).toContain("4.9");
    expect(container.textContent).toContain("In Stock");

    const viewLink = container.querySelector("a.aura-rec-btn-view");
    expect(viewLink).toBeTruthy();
    expect(viewLink.getAttribute("href")).toContain("5-mukhi-nepal-rudraksha");

    const buyBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Buy")
    );
    const addBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Add to Cart")
    );

    await act(async () => {
      buyBtn.click();
      addBtn.click();
    });

    expect(onBuy).toHaveBeenCalledWith(product);
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });

  it("renders AI Panditji workspace controls, settings drawer (chat, अंदाज़, graph), and quick topics", async () => {
    const onNewChat = vi.fn();
    const onToggleBirthForm = vi.fn();
    const onOpenSavedKundalis = vi.fn();
    const onOpenHistory = vi.fn();
    const onChangePanditPref = vi.fn();
    const onOpenVedicTools = vi.fn();

    expect(PANDIT_ASTROLOGY_QUICK_TOPICS.map((t) => t.label)).toEqual([
      "नौकरी व करियर",
      "धन, व्यापार व आर्थिक स्थिति",
      "विवाह, संबंध व जीवनसाथी",
      "रुद्राक्ष धारण विधि"
    ]);

    await act(async () => {
      root.render(
        <AuraPanditWorkspacePanel
          conversationId="conv_1"
          savedSessions={[]}
          onNewChat={onNewChat}
          onToggleBirthForm={onToggleBirthForm}
          onOpenSavedKundalis={onOpenSavedKundalis}
          onOpenHistory={onOpenHistory}
          panditPrefs={{ responseStyle: "detailed", chartStyle: "auto" }}
          onChangePanditPref={onChangePanditPref}
          onOpenVedicTools={onOpenVedicTools}
        />
      );
    });

    expect(container.textContent).toContain("New Chat");
    expect(container.textContent).toContain("Kundli Form");
    expect(container.textContent).toContain("Saved Kundalis");
    expect(container.textContent).toContain("History");

    const toggleBtn = container.querySelector(".aura-pandit-settings-toggle");
    await act(async () => {
      toggleBtn.click();
    });

    expect(container.textContent).toContain("नया चैट");
    expect(container.textContent).toContain("सक्रिय चैट");
    expect(container.textContent).toContain("नमस्ते पंडित जी");
    expect(container.textContent).toContain("नमस्ते पंडित");
    expect(container.textContent).toContain("विस्तृत");
    expect(container.textContent).toContain("अपनी मर्जी की बात");
    expect(container.textContent).toContain("Auto");
    expect(container.textContent).toContain("चक्र+ग्राफ");
    expect(container.textContent).toContain("कार्ड");
    expect(container.textContent).toContain("तालिका");
    expect(container.textContent).toContain("टूल्स");

    const graphBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent === "चक्र+ग्राफ"
    );
    const toolsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent === "टूल्स"
    );
    await act(async () => {
      graphBtn.click();
      toolsBtn.click();
    });

    expect(onChangePanditPref).toHaveBeenCalledWith({ chartStyle: "chart" });
    expect(onOpenVedicTools).toHaveBeenCalledWith("milan");
  });
});
