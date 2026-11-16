// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuraCommandDock } from "../AuraCommandDock";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("AuraCommandDock", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
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

  it("renders 4 single-line options in panditji mode and opens detailed feature panels on click", async () => {
    const onNewChat = vi.fn();
    const onChangePanditPref = vi.fn();
    const onOpenVedicTool = vi.fn();

    root = createRoot(container);
    await act(async () => {
      root.render(
        <AuraCommandDock
          scope="floating"
          mode="panditji"
          conversationId="conv_1"
          savedSessions={[{ id: "conv_2", title: "नमस्ते पंडित जी मेरा नाम..." }]}
          onNewChat={onNewChat}
          activeBirthDetails={{
            name: "Devotee",
            dob: "2006-05-11",
            birthTime: "12:45",
            birthPlace: "Sikar"
          }}
          panditPrefs={{ responseStyle: "detailed", chartStyle: "auto" }}
          onChangePanditPref={onChangePanditPref}
          onOpenVedicTool={onOpenVedicTool}
        />
      );
    });

    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs).toHaveLength(4);
    expect(tabs[0].textContent).toContain("चैट");
    expect(tabs[1].textContent).toContain("कुंडली");
    expect(tabs[2].textContent).toContain("अंदाज़");
    expect(tabs[3].textContent).toContain("टूल्स");

    // 1. Click 'चैट' tab -> opens Chat sessions & New Chat panel
    await act(async () => {
      tabs[0].click();
    });
    expect(container.textContent).toContain("नया चैट शुरू करें");
    expect(container.textContent).toContain("नमस्ते पंडित जी मेरा नाम");

    // 2. Click 'कुंडली' tab -> shows active Kundali details & Change/Delete buttons
    await act(async () => {
      tabs[1].click();
    });
    expect(container.textContent).toContain("सक्रिय कुंडली प्रोफ़ाइल");
    expect(container.textContent).toContain("Devotee");
    expect(container.textContent).toContain("बदलें");
    expect(container.textContent).toContain("हटाएं");

    // 3. Click 'अंदाज़' tab -> shows Response Style & Graph options
    await act(async () => {
      tabs[2].click();
    });
    expect(container.textContent).toContain("विस्तृत वैदिक विश्लेषण");
    expect(container.textContent).toContain("अपनी मर्ज़ी की बात");
    expect(container.textContent).toContain("चक्र + ग्राफ");

    // 4. Click 'टूल्स' tab -> shows 4 Vedic Tool launchers
    await act(async () => {
      tabs[3].click();
    });
    expect(container.textContent).toContain("गुण मिलान (36)");
    const milanBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("गुण मिलान (36)")
    );
    expect(milanBtn).toBeTruthy();
    await act(async () => {
      milanBtn.click();
    });
    expect(onOpenVedicTool).toHaveBeenCalledWith("milan");
  });
});
