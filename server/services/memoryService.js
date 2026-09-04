import { AuraAIMemory } from "../models/AuraAI.js";
import { isDbConnected } from "../config/db.js";
import { GoogleGenAI } from "@google/genai";

// In-memory fallback map for non-DB environments: userId -> Map(memoryKey -> MemoryObj)
const inMemoryStore = new Map();

// Sensitive blacklisted keys that must NEVER be saved in long-term memory
const SENSITIVE_PATTERNS = [
  /password/i, /pwd/i, /credit_card/i, /card_number/i, /cvv/i, /token/i,
  /auth_key/i, /otp/i, /secret/i, /pin/i, /ssn/i, /account_number/i
];

function isKeySensitive(key = "", val = "") {
  const combined = `${key} ${val}`;
  return SENSITIVE_PATTERNS.some(p => p.test(combined));
}

/**
 * Retrieve long-term user memories. Strictly scoped by authenticated userId or guestSessionId.
 */
export async function getUserMemories({ userId, guestSessionId }) {
  const effectiveId = String(userId && userId !== "guest" ? userId : (guestSessionId || "")).trim();
  if (!effectiveId) return [];

  if (!isDbConnected()) {
    const userMap = inMemoryStore.get(effectiveId);
    if (!userMap) return [];
    return Array.from(userMap.values());
  }

  try {
    const memories = await AuraAIMemory.find({ userId: effectiveId })
      .sort({ updatedAt: -1 })
      .lean();
    return memories || [];
  } catch (err) {
    console.warn("[MemoryService] Failed to load user memories:", err?.message);
    return [];
  }
}

/**
 * Save or update a specific memory key for a user.
 */
export async function setUserMemory({ userId, guestSessionId, memoryKey, memoryValue, category = "preference", confidence = 0.95 }) {
  const effectiveId = String(userId && userId !== "guest" ? userId : (guestSessionId || "")).trim();
  if (!effectiveId || !memoryKey || !memoryValue) return null;

  if (isKeySensitive(memoryKey, memoryValue)) {
    console.warn(`[MemoryService] Blocked sensitive memory save attempt for key: ${memoryKey}`);
    return null;
  }

  const cleanKey = String(memoryKey).trim().toLowerCase().replace(/[^\w_-]/g, "_");
  const cleanVal = String(memoryValue).trim();

  if (!isDbConnected()) {
    if (!inMemoryStore.has(effectiveId)) inMemoryStore.set(effectiveId, new Map());
    const userMap = inMemoryStore.get(effectiveId);
    const memObj = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: effectiveId,
      memoryKey: cleanKey,
      memoryValue: cleanVal,
      category,
      confidence,
      lastUpdated: new Date()
    };
    userMap.set(cleanKey, memObj);
    return memObj;
  }

  try {
    const updated = await AuraAIMemory.findOneAndUpdate(
      { userId: effectiveId, memoryKey: cleanKey },
      {
        $set: {
          memoryValue: cleanVal,
          category,
          confidence,
          lastUpdated: new Date()
        },
        $setOnInsert: {
          id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        }
      },
      { upsert: true, new: true, returnDocument: "after" }
    ).lean();
    return updated;
  } catch (err) {
    console.warn("[MemoryService] Failed to save memory:", err?.message);
    return null;
  }
}

/**
 * Automatically extract conversational preferences and update long-term memory after a turn.
 */
export async function extractAndUpdateMemories({ userId, guestSessionId, userMessage, aiResponse }) {
  const effectiveId = String(userId && userId !== "guest" ? userId : (guestSessionId || "")).trim();
  if (!effectiveId || !userMessage) return;

  const msgLower = userMessage.toLowerCase();

  // 1. Budget Preference Extraction
  const budgetMatch = userMessage.match(/(?:under|below|budget|tk|tak|ke andar|max|around)\s*(?:rs\.?|₹)?\s*(\d{3,6})/i) ||
                      userMessage.match(/(\d{3,6})\s*(?:rs\.?|rupees|₹|tak|ke andar)/i);
  if (budgetMatch && budgetMatch[1]) {
    const amount = Number(budgetMatch[1]);
    if (amount >= 300 && amount <= 500000) {
      await setUserMemory({
        userId: effectiveId,
        guestSessionId,
        memoryKey: "budget_preference",
        memoryValue: `₹${amount}`,
        category: "preference"
      });
    }
  }

  // 2. Rashi / Zodiac Extraction
  const rashiMatch = userMessage.match(/(?:rashi|zodiac|sign|kundli)\s*(?:hai|is)?\s*([a-zA-Z]+)/i) ||
                     userMessage.match(/(mesh|vrishabh|mithun|kark|singh|kanya|tula|vrischika|dhanu|makar|kumbh|meen|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)/i);
  if (rashiMatch && rashiMatch[1]) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "rashi_zodiac",
      memoryValue: rashiMatch[1].toLowerCase(),
      category: "astrology"
    });
  }

  // 3. Primary Purpose / Concern Extraction
  if (/(dhan|wealth|paisa|money|business|growth|kuber|lakshmi)/i.test(msgLower)) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "primary_concern",
      memoryValue: "wealth_and_business_growth",
      category: "preference"
    });
  } else if (/(stress|tension|peace|shanti|health|bp|depression|sleep)/i.test(msgLower)) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "primary_concern",
      memoryValue: "health_and_peace_of_mind",
      category: "preference"
    });
  } else if (/(hanuman|protection|fear|dar|courage|himmat|enemy)/i.test(msgLower)) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "primary_concern",
      memoryValue: "protection_and_courage",
      category: "preference"
    });
  } else if (/(study|student|exam|focus|concentration|memory|education)/i.test(msgLower)) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "primary_concern",
      memoryValue: "education_and_focus",
      category: "preference"
    });
  }

  // 4. Preferred Bead/Mukhi Interest
  const mukhiMatch = userMessage.match(/(\d{1,2})\s*mukhi/i);
  if (mukhiMatch && mukhiMatch[1]) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "preferred_mukhi",
      memoryValue: `${mukhiMatch[1]} Mukhi`,
      category: "product_interest"
    });
  } else if (/(108|jaap|mala)/i.test(msgLower)) {
    await setUserMemory({
      userId: effectiveId,
      guestSessionId,
      memoryKey: "preferred_mukhi",
      memoryValue: "108 Jaap Mala",
      category: "product_interest"
    });
  }
}
