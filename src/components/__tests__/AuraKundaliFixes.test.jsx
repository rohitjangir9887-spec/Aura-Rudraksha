// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractBirthDetailsFromText } from "../../../server/controllers/auraAiController";
import { auraChatStore } from "../../lib/auraChatStore";
import { AuraActiveKundaliCard } from "../AuraActiveKundaliCard";
import { AuraAISavedKundaliModal } from "../AuraAISavedKundaliModal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("Kundli Name Preservation, Deletion & Collapsible Header Fixes", () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
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
    localStorage.clear();
  });

  it("extractBirthDetailsFromText preserves names without Devanagari Danda (है।) and extracts श्री <Name> जी", () => {
    const res1 = extractBirthDetailsFromText("मेरा नाम Jitendra है, DOB: 1995-08-15, Time: 09:30 AM, Place: Jaipur");
    expect(res1).toBeTruthy();
    expect(res1.name).toBe("Jitendra");
    expect(res1.dob).toBe("1995-08-15");
    expect(res1.birthPlace).toBe("Jaipur");

    const formPrompt = `नमस्ते पंडित जी 🙏 मेरा नाम Rohit Jangir है।\n• जन्म तिथि: 2006-05-11\n• जन्म समय: 12:45\n• जन्म स्थान: Sikar\n• मुख्य संकल्प / समस्या: ⚡ व्यापार, नौकरी व धन वृद्धि`;
    const resForm = extractBirthDetailsFromText(formPrompt);
    expect(resForm).toBeTruthy();
    expect(resForm.name).toBe("Rohit Jangir");
    expect(resForm.dob).toBe("2006-05-11");
    expect(resForm.birthTime).toBe("12:45");
    expect(resForm.birthPlace).toBe("Sikar");

    const res2 = extractBirthDetailsFromText("नाम: राजीव शर्मा, जन्म तिथि: 11-05-2006, समय: 12:45 PM, स्थान: Sikar");
    expect(res2).toBeTruthy();
    expect(res2.name).toBe("राजीव शर्मा");
    expect(res2.dob).toBe("2006-05-11");

    const res3 = extractBirthDetailsFromText("🙏 श्री Vikram Singh जी की जन्म कुंडली का संपूर्ण वैदिक विश्लेषण व रुद्राक्ष परामर्श (DOB: 1998-04-12, Time: 10:15, Place: Churu)");
    expect(res3).toBeTruthy();
    expect(res3.name).toBe("Vikram Singh");
    expect(res3.hasExplicitName).toBe(true);
    expect(res3.dob).toBe("1998-04-12");
    expect(res3.birthTime).toBe("10:15");
    expect(res3.birthPlace).toBe("Churu");
  });

  it("auraChatStore sanitizes legacy 'है।' suffixes, protects real names against 'Devotee', and blocks stream resurrection after delete", () => {
    const added = auraChatStore.addSavedKundali({
      name: "Vikram है।",
      dob: "1995-08-15",
      birthTime: "09:30",
      birthPlace: "Jaipur",
      relation: "Self"
    });
    expect(added).toHaveLength(1);
    expect(added[0].name).toBe("Vikram");

    // Simulate backend fallback returning "Devotee" for the same DOB/Time
    const savedActive = auraChatStore.saveVerifiedBirthDetails({
      name: "Devotee",
      dob: "1995-08-15",
      birthTime: "09:30",
      birthPlace: "Jaipur, Rajasthan"
    });

    expect(savedActive).toBeTruthy();
    expect(savedActive.name).toBe("Vikram");
    expect(auraChatStore.getVerifiedBirthDetails().name).toBe("Vikram");

    const savedList = auraChatStore.getSavedKundalis();
    expect(savedList).toHaveLength(1);
    expect(savedList[0].name).toBe("Vikram");

    // Delete saved Kundli and confirm both list and active profile stay cleared
    const remaining = auraChatStore.deleteSavedKundali(savedList[0].id, 0, savedList[0]);
    expect(remaining).toEqual([]);
    expect(auraChatStore.getSavedKundalis()).toEqual([]);
    expect(auraChatStore.getVerifiedBirthDetails()).toBeNull();
    expect(auraChatStore.isBirthDetailsCleared()).toBe(true);

    // Simulate background SSE stream chunk/done trying to re-save the deleted Kundli
    const resurrected = auraChatStore.saveVerifiedBirthDetails({
      name: "Vikram",
      dob: "1995-08-15",
      birthTime: "09:30",
      birthPlace: "Jaipur"
    });
    expect(resurrected).toBeNull();
    expect(auraChatStore.getVerifiedBirthDetails()).toBeNull();
    expect(auraChatStore.getSavedKundalis()).toEqual([]);
  });

  it("AuraActiveKundaliCard collapses cleanly to a compact single-line bar and expands on toggle", async () => {
    const onToggle = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    await act(async () => {
      root.render(
        <AuraActiveKundaliCard
          activeBirthDetails={{
            name: "Rahul",
            dob: "1999-01-20",
            birthTime: "08:15",
            birthPlace: "Jaipur"
          }}
          collapsed={true}
          onToggleCollapse={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
    });

    expect(container.textContent).toContain("ॐ Active Kundli");
    expect(container.textContent).toContain("Rahul (1999-01-20)");
    expect(container.querySelector(".aura-active-kundali-grid")).toBeNull();

    const expandBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("देखें")
    );
    await act(async () => {
      expandBtn.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("AuraAISavedKundaliModal deletes a saved profile without triggering profile selection", async () => {
    auraChatStore.addSavedKundali({
      name: "Meera",
      dob: "1997-11-02",
      birthTime: "06:40",
      birthPlace: "Udaipur"
    });

    const onSelectKundali = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <AuraAISavedKundaliModal
          isOpen={true}
          onClose={onClose}
          onSelectKundali={onSelectKundali}
        />
      );
    });

    expect(container.textContent).toContain("Meera");

    const deleteBtn = container.querySelector('button[aria-label="Delete Meera"]');
    expect(deleteBtn).toBeTruthy();

    await act(async () => {
      deleteBtn.click();
    });

    expect(onSelectKundali).not.toHaveBeenCalled();
    expect(auraChatStore.getSavedKundalis()).toEqual([]);
    expect(container.textContent).toContain("कोई सुरक्षित कुंडली प्रोफाइल नहीं है।");
  });
});
