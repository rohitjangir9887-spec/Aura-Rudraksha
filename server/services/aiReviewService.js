import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { getExactTextHash, getNormalizedTextHash } from "../utils/similarity.js";

const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const GEMINI_TEXT_MODELS = [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'].filter(Boolean);

function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    return null;
  }
}

/**
 * Server-side AI Review processing service powered by nvidia/nemotron-3-super-120b-a12b and Gemini models.
 * Strictly respects authentic customer sentiment; never invents fake experiences.
 */
export async function polishReviewWithNemotron({
  text,
  author = "",
  rating = 5,
  productName = "",
  language = "auto"
}) {
  const originalText = String(text || "").trim();
  if (!originalText) {
    return {
      success: false,
      error: "Empty text provided"
    };
  }

  const apiKey = (
    process.env.NVIDIA_API_KEY ||
    process.env.NEMOTRON_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    ""
  ).trim();

  let processedText = originalText;
  let detectedLanguage = "English";
  let aiProcessed = false;
  let aiModel = NEMOTRON_MODEL;

  // Rule-based preliminary cleanup to eliminate copy-paste noise
  let cleaned = originalText
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/^(?:Review|Review\s*Text|Comment|Feedback|Experience)\s*[:–—]\s*/i, "")
    .replace(/^(?:\d+[\.\)\-]\s*)+/g, "")
    .replace(/^Rating\s*[:–—]\s*[\d\.]+\s*(?:\/\s*5)?\s*[:–—]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Simple heuristic language detection
  const hasDevanagari = /[\u0900-\u097F]/.test(cleaned);
  const hasHinglish = /\b(bohot|bahut|achha|achhi|mila|kiya|hai|hain|tha|thi|pujya|shubh|kripa|mala|shuru|dhanyawad)\b/i.test(cleaned);

  if (hasDevanagari) detectedLanguage = "Hindi";
  else if (hasHinglish) detectedLanguage = "Hinglish";
  else detectedLanguage = "English";

  const systemPrompt = `You are a respectful, high-precision review editor for Aura Rudraksha, an authentic consecrated Rudraksha store.
Your ONLY responsibility is to polish grammar, spelling, punctuation, and readability of genuine customer reviews.

STRICT MANDATES:
1. NEVER invent, exaggerate, or hallucinate customer experiences, facts, names, or ratings.
2. PRESERVE the exact original sentiment, rating tone, and core feedback.
3. PRESERVE the original language (Hindi, English, or Hinglish).
4. REMOVE any lingering parsing artifacts or copy-paste labels (like "Review:", "Rating:", "15.", quotation marks).
5. Output ONLY the clean polished review text. No preface, no markdown quotes, no explanations.`;

  const userPrompt = `Clean and polish this customer review while strictly preserving authentic sentiment:\n\nAuthor: ${author || "Customer"}\nProduct: ${productName || "Rudraksha"}\nRating: ${rating}/5\nLanguage: ${detectedLanguage}\nOriginal Review Text:\n"${cleaned}"`;

  // 1. Try Gemini models first if available
  const geminiClient = getGeminiClient();
  if (geminiClient && !aiProcessed) {
    for (const gModel of GEMINI_TEXT_MODELS) {
      if (aiProcessed) break;
      try {
        const geminiRes = await geminiClient.models.generateContent({
          model: gModel,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            maxOutputTokens: 600
          }
        });
        const candidate = (geminiRes.text || "").trim().replace(/^["'\s]+|["'\s]+$/g, "").trim();
        if (candidate.length >= 5) {
          processedText = candidate;
          aiProcessed = true;
          aiModel = gModel;
          break;
        }
      } catch (gErr) {
        // continue to next model candidate
      }
    }
  }

  // 2. Try NVIDIA Nemotron if Gemini was not available or didn't succeed
  if (apiKey && !aiProcessed) {
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: NEMOTRON_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 600
        })
      });

      if (response.ok) {
        const data = await response.json();
        const candidate = (data.choices?.[0]?.message?.content || "").trim();
        const trimmedCandidate = candidate.replace(/^["'\s]+|["'\s]+$/g, "").trim();

        if (trimmedCandidate.length >= 5) {
          processedText = trimmedCandidate;
          aiProcessed = true;
          aiModel = NEMOTRON_MODEL;
        }
      }
    } catch (apiErr) {
      // absorb and fall back cleanly
    }
  }

  // 3. Fallback high-quality deterministic formatting if AI was not invoked or returned unchanged
  if (!aiProcessed) {
    processedText = cleaned
      .replace(/(^\w|\.\s*\w|\?\s*\w|!\s*\w)/g, c => c.toUpperCase());
  }

  return {
    success: true,
    originalText,
    processedText: processedText || cleaned || originalText,
    detectedLanguage,
    aiModel: aiProcessed ? aiModel : "RuleBased-Sanitizer",
    aiProcessed,
    originalTextHash: getExactTextHash(originalText),
    exactTextHash: getExactTextHash(processedText || originalText),
    normalizedTextHash: getNormalizedTextHash(processedText || originalText)
  };
}

/**
 * Intelligent parser for multi-format review data (Key-Value, Pipe-separated, JSON array, CSV/TSV, Line-by-line).
 * Extracts author, per-review rating, review content, photo URLs, and assigned product.
 */
export function parseRawReviewData(rawInput, defaultOptions = {}) {
  if (!rawInput || typeof rawInput !== "string") {
    if (Array.isArray(rawInput)) {
      return normalizeJsonArrayReviews(rawInput, defaultOptions);
    }
    return { success: false, items: [], message: "Empty input text" };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, items: [], message: "Empty input text" };
  }

  // 1. Try parsing JSON array directly
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (Array.isArray(parsedJson)) {
        return normalizeJsonArrayReviews(parsedJson, defaultOptions);
      }
    } catch (_) {
      // Not strict JSON, proceed to other formats
    }
  }

  // 2. Check for Key-Value Block format (e.g. separated by "---", "===", or double newlines with Name:/Rating:/Review:)
  const isKeyValueFormat = /(?:^|\n)(?:Name|Author|Customer|Reviewer)\s*[:–—]/i.test(trimmed) &&
    /(?:^|\n)(?:Review|Text|Comment|Feedback|Experience)\s*[:–—]/i.test(trimmed);

  if (isKeyValueFormat) {
    return parseKeyValueBlocks(trimmed, defaultOptions);
  }

  // 3. Check for Pipe-separated or Tab-separated format (e.g. Name | 4.5 | Review text | Photo)
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pipeLines = lines.filter(l => l.includes("|") || l.includes("\t"));
  if (pipeLines.length >= 1 && pipeLines.length >= Math.ceil(lines.length * 0.6)) {
    return parseDelimitedLines(lines, defaultOptions);
  }

  // 4. Check for CSV format
  if (lines.length > 1 && (lines[0].toLowerCase().includes("name") || lines[0].toLowerCase().includes("rating") || lines[0].toLowerCase().includes("review"))) {
    return parseCsvLines(lines, defaultOptions);
  }

  // 5. Fallback: Parse line-by-line "Author: Review text (Rating)" or "1. Author - 4.5 - Text"
  return parseLineByLineFallback(lines, defaultOptions);
}

function normalizeJsonArrayReviews(arr, defaultOptions) {
  const items = [];
  arr.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const author = sanitizeAuthorName(entry.name || entry.author || entry.customer || entry.reviewer || `Devotee ${idx + 1}`);
    const rawRating = entry.rating !== undefined ? entry.rating : entry.stars !== undefined ? entry.stars : entry.score;
    const parsedRatingResult = parseSingleRating(rawRating);
    const rawText = String(entry.review || entry.text || entry.content || entry.comment || "").trim();
    const cleanText = sanitizeReviewText(rawText);

    if (!cleanText) return;

    const images = Array.isArray(entry.images) ? entry.images : (entry.photo || entry.image || entry.img ? [entry.photo || entry.image || entry.img] : []);
    const product = entry.productId || entry.product || defaultOptions.productId || "all";
    const productName = entry.productName || defaultOptions.productName || "Rudraksha Bead";
    const city = entry.city || defaultOptions.city || "Varanasi, UP";

    items.push({
      tempId: `IMPORT-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
      name: author,
      rating: parsedRatingResult.rating,
      ratingConfirmed: parsedRatingResult.isValid,
      needsReview: !parsedRatingResult.isValid || !cleanText || cleanText.length < 5,
      ratingIssue: parsedRatingResult.issue,
      text: cleanText,
      originalText: rawText || cleanText,
      language: detectLanguageHeuristic(cleanText),
      productId: String(product),
      productName: productName,
      city: city,
      title: entry.title || (parsedRatingResult.rating >= 4 ? "Blessed Spiritual Experience" : "Devotee Review"),
      images: images.filter(Boolean),
      source: defaultOptions.source || "external",
      publicDisplay: defaultOptions.publicDisplay === true
    });
  });

  return { success: true, items, count: items.length };
}

function parseKeyValueBlocks(text, defaultOptions) {
  // Split on delimiters like "---", "===", or double newlines where next block starts with Name:/Author:
  const rawBlocks = text.split(/(?:\r?\n\s*[-=_]{3,}\s*\r?\n)|(?:\r?\n\s*\r?\n(?=(?:Name|Author|Customer|Reviewer)\s*[:–—]))/i);
  const items = [];

  rawBlocks.forEach((block, idx) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    let author = "";
    let rawRating = null;
    let reviewText = "";
    let city = defaultOptions.city || "India";
    let title = "";
    let images = [];
    let productId = defaultOptions.productId || "all";
    let productName = defaultOptions.productName || "Rudraksha Bead";

    const lines = trimmedBlock.split(/\r?\n/);
    let currentField = "";
    let multilineText = [];

    lines.forEach(line => {
      const match = line.match(/^([A-Za-z\s_-]+)\s*[:=–—]\s*(.*)$/);
      if (match) {
        const fieldKey = match[1].trim().toLowerCase();
        const fieldVal = match[2].trim();

        if (["name", "author", "customer", "reviewer", "user"].includes(fieldKey)) {
          author = fieldVal;
          currentField = "name";
        } else if (["rating", "stars", "star", "score", "grade"].includes(fieldKey)) {
          rawRating = fieldVal;
          currentField = "rating";
        } else if (["review", "text", "content", "comment", "feedback", "experience", "body"].includes(fieldKey)) {
          multilineText = [fieldVal];
          currentField = "review";
        } else if (["city", "location", "place", "state"].includes(fieldKey)) {
          city = fieldVal;
          currentField = "city";
        } else if (["title", "headline", "subject"].includes(fieldKey)) {
          title = fieldVal;
          currentField = "title";
        } else if (["photo", "photos", "image", "images", "img"].includes(fieldKey)) {
          if (fieldVal) images.push(fieldVal);
          currentField = "photo";
        } else if (["product", "productid", "product_id", "item"].includes(fieldKey)) {
          productId = fieldVal;
          currentField = "product";
        } else {
          if (currentField === "review") {
            multilineText.push(line);
          }
        }
      } else {
        if (currentField === "review") {
          multilineText.push(line);
        } else if (!author && idx === 0) {
          author = line.trim();
        }
      }
    });

    reviewText = multilineText.join(" ").trim();
    if (!author) author = `Devotee ${items.length + 1}`;

    const cleanAuthor = sanitizeAuthorName(author);
    const cleanReview = sanitizeReviewText(reviewText);
    if (!cleanReview) return;

    const parsedRatingResult = parseSingleRating(rawRating);

    items.push({
      tempId: `IMPORT-KV-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanAuthor,
      rating: parsedRatingResult.rating,
      ratingConfirmed: parsedRatingResult.isValid,
      needsReview: !parsedRatingResult.isValid || cleanReview.length < 5,
      ratingIssue: parsedRatingResult.issue,
      text: cleanReview,
      originalText: reviewText || cleanReview,
      language: detectLanguageHeuristic(cleanReview),
      productId: String(productId),
      productName: productName,
      city: city,
      title: title || (parsedRatingResult.rating >= 4 ? "Blessed Spiritual Experience" : "Devotee Review"),
      images: images.filter(Boolean),
      source: defaultOptions.source || "external",
      publicDisplay: defaultOptions.publicDisplay === true
    });
  });

  return { success: true, items, count: items.length };
}

function parseDelimitedLines(lines, defaultOptions) {
  const items = [];

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#") || trimmedLine.startsWith("//")) return;

    const delimiter = trimmedLine.includes("|") ? "|" : "\t";
    const parts = trimmedLine.split(delimiter).map(p => p.trim());

    if (parts.length < 2) return;

    // Pattern 1: Name | Rating | Review | [Photo/City/Product]
    // Pattern 2: Name | Review (no rating)
    let author = parts[0] || `Devotee ${idx + 1}`;
    let ratingCandidate = parts[1];
    let textCandidate = parts[2] || "";
    let extraCandidate = parts[3] || "";

    // Check if second column is actually the review text rather than rating
    const parsedRating = parseSingleRating(ratingCandidate);
    if (!parsedRating.isValid && parts.length === 2) {
      // Format: Author | Review Text
      textCandidate = parts[1];
      ratingCandidate = null;
    } else if (!parsedRating.isValid && parts.length >= 3) {
      // Maybe format: Review | Author | Rating or other variation
      const parsed3rd = parseSingleRating(parts[2]);
      if (parsed3rd.isValid) {
        textCandidate = parts[1];
        ratingCandidate = parts[2];
      }
    }

    const cleanAuthor = sanitizeAuthorName(author);
    const cleanText = sanitizeReviewText(textCandidate || parts[1] || "");
    if (!cleanText) return;

    const ratingResult = parseSingleRating(ratingCandidate);
    const images = [];
    if (extraCandidate && (extraCandidate.startsWith("http") || extraCandidate.startsWith("data:"))) {
      images.push(extraCandidate);
    }

    items.push({
      tempId: `IMPORT-DELIM-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanAuthor,
      rating: ratingResult.rating,
      ratingConfirmed: ratingResult.isValid,
      needsReview: !ratingResult.isValid || cleanText.length < 5,
      ratingIssue: ratingResult.issue,
      text: cleanText,
      originalText: textCandidate || cleanText,
      language: detectLanguageHeuristic(cleanText),
      productId: String(defaultOptions.productId || "all"),
      productName: defaultOptions.productName || "Rudraksha Bead",
      city: defaultOptions.city || "Varanasi, UP",
      title: ratingResult.rating >= 4 ? "Blessed Spiritual Experience" : "Devotee Review",
      images,
      source: defaultOptions.source || "external",
      publicDisplay: defaultOptions.publicDisplay === true
    });
  });

  return { success: true, items, count: items.length };
}

function parseCsvLines(lines, defaultOptions) {
  const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const nameIdx = header.findIndex(h => h.includes("name") || h.includes("author") || h.includes("user"));
  const ratingIdx = header.findIndex(h => h.includes("rating") || h.includes("star") || h.includes("score"));
  const reviewIdx = header.findIndex(h => h.includes("review") || h.includes("text") || h.includes("content") || h.includes("comment") || h.includes("feedback"));
  const cityIdx = header.findIndex(h => h.includes("city") || h.includes("location"));
  const photoIdx = header.findIndex(h => h.includes("photo") || h.includes("image") || h.includes("img"));
  const productIdx = header.findIndex(h => h.includes("product"));

  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Simple CSV tokenization handling quotes
    const cells = [];
    let current = "";
    let insideQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cells.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim().replace(/^["']|["']$/g, ""));

    const author = sanitizeAuthorName(nameIdx >= 0 ? cells[nameIdx] : cells[0] || `Devotee ${i}`);
    const rawRating = ratingIdx >= 0 ? cells[ratingIdx] : null;
    const rawText = reviewIdx >= 0 ? cells[reviewIdx] : cells[cells.length - 1] || "";
    const cleanText = sanitizeReviewText(rawText);

    if (!cleanText) continue;

    const ratingResult = parseSingleRating(rawRating);
    const city = (cityIdx >= 0 && cells[cityIdx]) ? cells[cityIdx] : (defaultOptions.city || "Varanasi, UP");
    const photo = (photoIdx >= 0 && cells[photoIdx]) ? cells[photoIdx] : "";
    const prod = (productIdx >= 0 && cells[productIdx]) ? cells[productIdx] : (defaultOptions.productId || "all");

    items.push({
      tempId: `IMPORT-CSV-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      name: author,
      rating: ratingResult.rating,
      ratingConfirmed: ratingResult.isValid,
      needsReview: !ratingResult.isValid || cleanText.length < 5,
      ratingIssue: ratingResult.issue,
      text: cleanText,
      originalText: rawText || cleanText,
      language: detectLanguageHeuristic(cleanText),
      productId: String(prod),
      productName: defaultOptions.productName || "Rudraksha Bead",
      city: city,
      title: ratingResult.rating >= 4 ? "Blessed Spiritual Experience" : "Devotee Review",
      images: photo ? [photo] : [],
      source: defaultOptions.source || "external",
      publicDisplay: defaultOptions.publicDisplay === true
    });
  }

  return { success: true, items, count: items.length };
}

function parseLineByLineFallback(lines, defaultOptions) {
  const items = [];

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 5) return;

    let author = "";
    let reviewText = "";
    let rawRating = null;

    // Pattern A: "Rahul Sharma: Mala is very good (Rating: 4.5)" or "Rahul Sharma - 5 stars: Great mala"
    const colonMatch = trimmedLine.match(/^([^:–—]+)[:–—]\s*(.*)$/);
    if (colonMatch) {
      author = colonMatch[1].trim();
      reviewText = colonMatch[2].trim();
    } else {
      author = `Devotee ${idx + 1}`;
      reviewText = trimmedLine;
    }

    // Try extracting embedded rating inside parens or brackets e.g. "(4.5/5)" or "[5 Stars]"
    const ratingEmbedded = reviewText.match(/[\(\[]\s*(?:Rating|Stars)?\s*[:–—]?\s*([1-5](?:\.[0-9])?)\s*(?:\/\s*5|\s*stars?)?\s*[\)\]]/i);
    if (ratingEmbedded) {
      rawRating = ratingEmbedded[1];
      reviewText = reviewText.replace(ratingEmbedded[0], "").trim();
    }

    const cleanAuthor = sanitizeAuthorName(author);
    const cleanText = sanitizeReviewText(reviewText);
    if (!cleanText) return;

    const ratingResult = parseSingleRating(rawRating);

    items.push({
      tempId: `IMPORT-LINE-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanAuthor,
      rating: ratingResult.rating,
      ratingConfirmed: ratingResult.isValid,
      needsReview: !ratingResult.isValid || cleanText.length < 5,
      ratingIssue: ratingResult.issue,
      text: cleanText,
      originalText: reviewText || cleanText,
      language: detectLanguageHeuristic(cleanText),
      productId: String(defaultOptions.productId || "all"),
      productName: defaultOptions.productName || "Rudraksha Bead",
      city: defaultOptions.city || "Varanasi, UP",
      title: ratingResult.rating >= 4 ? "Blessed Spiritual Experience" : "Devotee Review",
      images: [],
      source: defaultOptions.source || "external",
      publicDisplay: defaultOptions.publicDisplay === true
    });
  });

  return { success: true, items, count: items.length };
}

/**
 * Parses and verifies individual review ratings.
 * Flags missing or out-of-range ratings cleanly without defaulting everything to 5.
 */
export function parseSingleRating(val) {
  if (val === null || val === undefined || val === "") {
    return {
      isValid: false,
      rating: 5, // preview placeholder
      issue: "Rating missing - Needs review"
    };
  }

  if (typeof val === "number") {
    if (isNaN(val)) return { isValid: false, rating: 5, issue: "Invalid number" };
    const clamped = Math.min(5, Math.max(1, Math.round(val * 10) / 10));
    return { isValid: true, rating: clamped, issue: null };
  }

  const str = String(val).trim();

  // Count star characters e.g. "⭐⭐⭐⭐" or "★★★★★"
  const starChars = (str.match(/[⭐★]/g) || []).length;
  if (starChars >= 1 && starChars <= 5) {
    return { isValid: true, rating: starChars, issue: null };
  }

  // Check for numeric patterns like "4.5/5", "4.2", "5 Stars", "4"
  const numMatch = str.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (numMatch) {
    const parsedNum = parseFloat(numMatch[1]);
    if (!isNaN(parsedNum)) {
      if (parsedNum >= 1 && parsedNum <= 5) {
        return { isValid: true, rating: Math.round(parsedNum * 10) / 10, issue: null };
      }
      if (parsedNum > 5 && parsedNum <= 10) {
        // Scaled out of 10 e.g. 9/10 -> 4.5
        return { isValid: true, rating: Math.round((parsedNum / 2) * 10) / 10, issue: "Converted 10-point scale" };
      }
      if (parsedNum > 10 && parsedNum <= 100) {
        // Percentage scale e.g. 80% -> 4.0
        return { isValid: true, rating: Math.round((parsedNum / 20) * 10) / 10, issue: "Converted % scale" };
      }
    }
  }

  return {
    isValid: false,
    rating: 5,
    issue: `Unrecognized rating format: '${str}'`
  };
}

/**
 * Strips broken artifact prefixes from author names like "15. ", "Name: ", "Author: "
 */
export function sanitizeAuthorName(rawName) {
  if (!rawName || typeof rawName !== "string") return "Aura Devotee";
  let clean = rawName.trim()
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/^(?:Name|Author|Customer|Reviewer|User)\s*[:–—]\s*/i, "")
    .replace(/^(?:\d+[\.\)\-]\s*)+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean || clean.length < 2 || clean.toLowerCase() === "name" || clean.toLowerCase() === "author") {
    return "Aura Devotee";
  }
  return clean;
}

/**
 * Strips copy-paste prefixes, line numbers, and rating headers from review bodies
 */
export function sanitizeReviewText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  let clean = rawText.trim()
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/^(?:Review|Review\s*Text|Comment|Feedback|Experience)\s*[:–—]\s*/i, "")
    .replace(/^(?:\d+[\.\)\-]\s*)+/g, "")
    .replace(/^Rating\s*[:–—]\s*[\d\.]+\s*(?:\/\s*5)?\s*[:–—]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean;
}

export function detectLanguageHeuristic(text) {
  if (!text) return "English";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  if (/\b(bohot|bahut|achha|achhi|mila|kiya|hai|hain|tha|thi|pujya|shubh|kripa|mala|shuru|dhanyawad)\b/i.test(text)) {
    return "Hinglish";
  }
  return "English";
}
