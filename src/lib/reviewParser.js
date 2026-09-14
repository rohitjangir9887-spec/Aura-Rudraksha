/**
 * Aura Rudraksha — Intelligent Review Parser & Format Normalizer
 * 
 * Central multi-format parser supporting:
 *  - JSON Array / Single JSON Object (with aliasing & fault-tolerance)
 *  - Key-Value blocks (Name:, Rating:, Review:)
 *  - Numbered Key-Value (1., 2., 10. block headers)
 *  - Pipe-Separated (Author | Rating | Review)
 *  - CSV (with or without headers, handles quoted multiline strings)
 *  - Natural Text ("Rahul Sharma gave 4.8 stars:\n...")
 *  - Mixed Input / Multi-Format blocks
 */

/**
 * Remove BOM, zero-width characters, and normalize line endings.
 */
export function sanitizeInputText(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "") // Strip UTF-8 BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Strip zero-width characters
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/**
 * Parse and normalize numeric or star ratings into a 1.0–5.0 float.
 * Returns null if no valid rating is detectable.
 */
export function normalizeRating(val) {
  if (val === undefined || val === null || val === "") return null;

  if (typeof val === "number") {
    if (isNaN(val)) return null;
    return Math.min(5, Math.max(1, Number(val.toFixed(1))));
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. Check Unicode Star Symbols: ★★★★★, ★★★★☆, ⭐⭐⭐⭐
  const filledBlackStars = (str.match(/★/g) || []).length;
  const emojiStars = (str.match(/⭐/g) || []).length;
  const totalStars = filledBlackStars + emojiStars;
  if (totalStars >= 1 && totalStars <= 5) {
    return totalStars;
  }

  // 2. Pattern: "4.6/5", "4.6 / 5", "4.6 out of 5", "4.6 stars", "4.6 star"
  const ratioMatch = str.match(/([1-5](?:\.[0-9]+)?)\s*(?:\/|\s*out\s+of\s*)\s*5/i);
  if (ratioMatch) {
    const num = parseFloat(ratioMatch[1]);
    if (!isNaN(num)) return Math.min(5, Math.max(1, Number(num.toFixed(1))));
  }

  const starsWordMatch = str.match(/([1-5](?:\.[0-9]+)?)\s*(?:stars?|pts?|points?|rating|score)/i);
  if (starsWordMatch) {
    const num = parseFloat(starsWordMatch[1]);
    if (!isNaN(num)) return Math.min(5, Math.max(1, Number(num.toFixed(1))));
  }

  // 3. Standalone float or integer (e.g. "4.8", "5", "5.0")
  const directNumMatch = str.match(/^[0-5](?:\.[0-9]+)?$/);
  if (directNumMatch) {
    const num = parseFloat(directNumMatch[0]);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return Number(num.toFixed(1));
    }
  }

  // 4. Extract any first valid number between 1 and 5 in the string
  const generalNum = str.match(/\b([1-5](?:\.[0-9]+)?)\b/);
  if (generalNum) {
    const num = parseFloat(generalNum[1]);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return Number(num.toFixed(1));
    }
  }

  return null;
}

/**
 * Detect language of text: Hindi, Hinglish, or English
 */
export function detectLanguage(text) {
  if (!text) return "English";
  const str = String(text);

  // Devanagari script regex
  if (/[\u0900-\u097F]/.test(str)) {
    return "Hindi (Devanagari)";
  }

  // Common Hindi/Hinglish vocabulary tokens
  const hinglishKeywords = [
    /\b(bahut|achha|achhi|achhe|mila|mili|mile|tha|thi|the|raha|rahi|rahe|hoga|hogi|hoge|hai|hain|ki|ka|ke|ko|se|aur|bhi|par|me|mein|kripa|shanti|anubhav|rudraksh|rudraksha|mala|dharana|pooja|puja|prasad|dhanyawad|shukriya|asli|shuddh|kripya)\b/i
  ];

  for (const regex of hinglishKeywords) {
    if (regex.test(str)) {
      return "Hinglish / Hindi";
    }
  }

  return "English";
}

/**
 * Detect input format before and during parsing.
 */
export function detectReviewFormat(rawText) {
  const text = sanitizeInputText(rawText).trim();
  if (!text) return { format: "empty", label: "No input detected", badge: "No Input" };

  // 1. JSON Array check
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      JSON.parse(text);
      return { format: "json_array", label: "JSON Array", badge: "JSON Array ✓" };
    } catch (_) {
      // Possible slightly malformed JSON array
      if (/^\s*\[\s*\{/.test(text)) {
        return { format: "json_array", label: "JSON Array", badge: "JSON Array ✓" };
      }
    }
  }

  // 2. Single JSON Object check
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      JSON.parse(text);
      return { format: "json_object", label: "Single JSON Object", badge: "Single JSON Object ✓" };
    } catch (_) {
      if (/^\s*\{\s*["']/.test(text)) {
        return { format: "json_object", label: "Single JSON Object", badge: "Single JSON Object ✓" };
      }
    }
  }

  // 3. Numbered Key-Value check (e.g. "1.\nName:" or "10.\nName:")
  if (/^\s*\d+[\.\)]\s*\n\s*(?:name|author|reviewer|rating|review|comment|text)\s*:/im.test(text)) {
    return { format: "numbered_key_value", label: "Numbered Key-Value", badge: "Numbered Key-Value ✓" };
  }

  // 4. Standard Key-Value check (e.g. "Name: ...\nRating: ...\nReview: ...")
  if (/(?:^|\n)\s*(?:name|author|reviewer|customer|rating|stars|score|review|comment|text|content|feedback)\s*:/im.test(text)) {
    return { format: "key_value", label: "Key-Value", badge: "Key-Value ✓" };
  }

  // 5. Pipe-Separated check (e.g. "Rahul Sharma | 4.8 | Mala ki quality...")
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const pipeLines = lines.filter(l => l.includes("|") && l.split("|").length >= 2);
  if (pipeLines.length > 0 && pipeLines.length >= lines.length * 0.5) {
    return { format: "pipe", label: "Pipe-Separated", badge: "Pipe-Separated ✓" };
  }

  // 6. CSV check (e.g. "Name,Rating,Review" or lines with commas)
  if (/^(?:name|author|reviewer)\s*,\s*(?:rating|stars|score)?\s*,?\s*(?:review|text|comment)/i.test(lines[0] || "")) {
    return { format: "csv", label: "CSV", badge: "CSV ✓" };
  }

  // 7. Natural text check (e.g. "Rahul Sharma gave 4.8 stars:")
  if (/(?:gave|rated|rating|stars?|★)\s*(?:it\s*)?(?:[1-5](?:\.[0-9]+)?|\d\s*\/\s*5)/i.test(text)) {
    return { format: "natural_text", label: "Natural Text", badge: "Natural Text ✓" };
  }

  return { format: "mixed", label: "Mixed / Auto Parsing", badge: "Mixed Input — Auto Parsing ✓" };
}

/**
 * Robust JSON Review Parser (supports single object, array, and common property aliases)
 */
export function parseJsonReviews(rawText, options = {}) {
  const text = sanitizeInputText(rawText).trim();
  if (!text) return [];

  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // Try relaxing trailing commas and single quotes
    try {
      const relaxed = text
        .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"'); // Single to double quotes for strings
      parsed = JSON.parse(relaxed);
    } catch (_) {
      return [];
    }
  }

  if (!parsed) return [];

  let items = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    if (Array.isArray(parsed.reviews)) items = parsed.reviews;
    else if (Array.isArray(parsed.data)) items = parsed.data;
    else if (Array.isArray(parsed.items)) items = parsed.items;
    else items = [parsed];
  }

  const results = [];
  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    if (!raw || typeof raw !== "object") continue;

    // Resolve Name
    const name = (
      raw.name || raw.author || raw.reviewer || raw.reviewerName ||
      raw.customer || raw.customerName || raw.user || raw.authorDisplayName || ""
    ).toString().trim();

    // Resolve Rating
    const rawRating = raw.rating !== undefined ? raw.rating : (raw.stars !== undefined ? raw.stars : (raw.score !== undefined ? raw.score : raw.star));
    const parsedRating = normalizeRating(rawRating);

    // Resolve Review Text
    const reviewText = (
      raw.review || raw.text || raw.content || raw.comment ||
      raw.feedback || raw.message || raw.body || raw.description || ""
    ).toString().trim();

    // Resolve Title
    const title = (raw.title || raw.headline || raw.subject || raw.summary || "").toString().trim();

    // Resolve City & Date
    const city = (raw.city || raw.location || "").toString().trim();
    const date = (raw.date || raw.createdAt || raw.time || "").toString().trim();

    // Resolve Product info if present
    const productId = raw.productId || raw.product_id || options.selectedProductId || "all";
    const productName = raw.productName || raw.product_name || raw.product || options.selectedProductName || "";

    results.push(buildNormalizedReviewRecord({
      index: i + 1,
      name,
      rating: parsedRating,
      hasExplicitRating: parsedRating !== null,
      fallbackRating: options.fallbackRating,
      title,
      text: reviewText,
      city,
      date,
      productId,
      productName,
      source: options.source || "external",
      images: Array.isArray(raw.images) ? raw.images : []
    }));
  }

  return results;
}

/**
 * Key-Value Review Parser (supports multiline review text and numbered 1., 2., 10. headers)
 */
export function parseKeyValueReviews(rawText, options = {}) {
  const text = sanitizeInputText(rawText);
  if (!text.trim()) return [];

  // Split into record blocks using double newlines, dashes, or numbered headers (e.g. "1.", "10.")
  const lines = text.split("\n");
  const rawBlocks = [];
  let currentBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line is a record header like "1.", "2.", "10.", "[1]", "#1", or "Record 1:"
    const isNumberedHeader = /^(?:\d+[\.\)]|\[\d+\]|#\d+|Record\s+\d+[:\.]?|---+)$/i.test(trimmed);

    // Check if line is a fresh "Name:" when we already have review text in current block
    const isNewNameStart = /^(?:name|author|reviewer|customer|reviewer\s*name)\s*:/i.test(trimmed);

    if (isNumberedHeader) {
      if (currentBlockLines.length > 0) {
        rawBlocks.push(currentBlockLines.join("\n"));
        currentBlockLines = [];
      }
      // Note: do not push the numbered header itself into record lines
      continue;
    }

    if (isNewNameStart && currentBlockLines.some(l => /^(?:review|comment|text|content)\s*:/i.test(l.trim()))) {
      rawBlocks.push(currentBlockLines.join("\n"));
      currentBlockLines = [line];
      continue;
    }

    if (trimmed === "" && currentBlockLines.length > 0) {
      // Look ahead: if next non-empty line starts a new record, finish current block
      const nextNonEmpty = lines.slice(i + 1).find(l => l.trim().length > 0);
      if (nextNonEmpty && (/^(?:\d+[\.\)]|name:|author:|reviewer:)/i.test(nextNonEmpty.trim()))) {
        rawBlocks.push(currentBlockLines.join("\n"));
        currentBlockLines = [];
        continue;
      }
    }

    currentBlockLines.push(line);
  }

  if (currentBlockLines.length > 0) {
    rawBlocks.push(currentBlockLines.join("\n"));
  }

  const results = [];

  for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
    const block = rawBlocks[bIdx].trim();
    if (!block) continue;

    const blockLines = block.split("\n");
    let name = "";
    let rating = null;
    let title = "";
    let city = "";
    let date = "";
    let reviewLines = [];
    let currentKey = null;

    for (const bLine of blockLines) {
      const trimmedLine = bLine.trim();
      if (!trimmedLine) continue;

      // Ignore pure numbering in line
      if (/^\d+[\.\)]$/.test(trimmedLine)) continue;

      const keyMatch = trimmedLine.match(/^([a-zA-Z\s]{2,25}):\s*(.*)$/);
      if (keyMatch) {
        const rawKey = keyMatch[1].trim().toLowerCase();
        const value = keyMatch[2].trim();

        if (["name", "author", "reviewer", "reviewer name", "customer", "user"].includes(rawKey)) {
          currentKey = "name";
          name = value;
          continue;
        } else if (["rating", "stars", "score", "star", "rate"].includes(rawKey)) {
          currentKey = "rating";
          rating = normalizeRating(value);
          continue;
        } else if (["title", "headline", "subject", "summary"].includes(rawKey)) {
          currentKey = "title";
          title = value;
          continue;
        } else if (["city", "location", "place"].includes(rawKey)) {
          currentKey = "city";
          city = value;
          continue;
        } else if (["date", "time", "relative date"].includes(rawKey)) {
          currentKey = "date";
          date = value;
          continue;
        } else if (["review", "comment", "text", "content", "feedback", "message", "experience"].includes(rawKey)) {
          currentKey = "review";
          if (value) reviewLines.push(value);
          continue;
        }
      }

      // If no new key, append to the active field (multiline review support)
      if (currentKey === "review") {
        reviewLines.push(trimmedLine);
      } else if (!currentKey && !name) {
        // Line without key before any key: could be author or natural text
        name = trimmedLine;
      }
    }

    const reviewText = reviewLines.join("\n").replace(/^["'“]+|["'”]+$/g, "").trim();

    if (name || reviewText) {
      results.push(buildNormalizedReviewRecord({
        index: results.length + 1,
        name: name.replace(/^["'“]+|["'”]+$/g, "").trim(),
        rating,
        hasExplicitRating: rating !== null,
        fallbackRating: options.fallbackRating,
        title,
        text: reviewText,
        city,
        date,
        productId: options.selectedProductId || "all",
        productName: options.selectedProductName || "",
        source: options.source || "external"
      }));
    }
  }

  return results;
}

/**
 * Pipe-Separated Review Parser (e.g. "Author | Rating | Review" or "Author | Review")
 */
export function parsePipeReviews(rawText, options = {}) {
  const text = sanitizeInputText(rawText);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|")) continue;

    // Ignore numbered prefix if present: "1. Rahul | 5 | ..."
    const cleanedLine = line.replace(/^\d+[\.\)]\s*/, "");
    const parts = cleanedLine.split("|").map(p => p.trim());

    if (parts.length === 2) {
      // Format: Author | Review OR Rating | Review
      const ratingCheck = normalizeRating(parts[0]);
      if (ratingCheck !== null) {
        results.push(buildNormalizedReviewRecord({
          index: results.length + 1,
          name: "",
          rating: ratingCheck,
          hasExplicitRating: true,
          fallbackRating: options.fallbackRating,
          text: parts[1],
          productId: options.selectedProductId || "all",
          productName: options.selectedProductName || "",
          source: options.source || "external"
        }));
      } else {
        results.push(buildNormalizedReviewRecord({
          index: results.length + 1,
          name: parts[0],
          rating: null,
          hasExplicitRating: false,
          fallbackRating: options.fallbackRating,
          text: parts[1],
          productId: options.selectedProductId || "all",
          productName: options.selectedProductName || "",
          source: options.source || "external"
        }));
      }
    } else if (parts.length === 3) {
      // Standard: Name | Rating | Review
      const rating = normalizeRating(parts[1]);
      results.push(buildNormalizedReviewRecord({
        index: results.length + 1,
        name: parts[0],
        rating,
        hasExplicitRating: rating !== null,
        fallbackRating: options.fallbackRating,
        text: parts[2],
        productId: options.selectedProductId || "all",
        productName: options.selectedProductName || "",
        source: options.source || "external"
      }));
    } else if (parts.length >= 4) {
      // Name | Rating | Title | Review (or Name | Rating | City | Review)
      const rating = normalizeRating(parts[1]);
      results.push(buildNormalizedReviewRecord({
        index: results.length + 1,
        name: parts[0],
        rating,
        hasExplicitRating: rating !== null,
        fallbackRating: options.fallbackRating,
        title: parts[2],
        text: parts.slice(3).join(" | "),
        productId: options.selectedProductId || "all",
        productName: options.selectedProductName || "",
        source: options.source || "external"
      }));
    }
  }

  return results;
}

/**
 * CSV Review Parser (handles standard CSV, commas inside quotes, multiline quoted fields)
 */
export function parseCsvReviews(rawText, options = {}) {
  const text = sanitizeInputText(rawText).trim();
  if (!text) return [];

  // Parse CSV rows handling quotes and newlines inside quotes
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (char === "\n" && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  // Check for header row
  let headerMap = { name: -1, rating: -1, review: -1, title: -1, city: -1 };
  const firstRowLower = rows[0].map(c => c.toLowerCase().trim());
  let hasHeader = false;

  firstRowLower.forEach((col, idx) => {
    if (["name", "author", "reviewer", "customer"].includes(col)) {
      headerMap.name = idx;
      hasHeader = true;
    } else if (["rating", "stars", "score", "rate"].includes(col)) {
      headerMap.rating = idx;
      hasHeader = true;
    } else if (["review", "text", "comment", "feedback", "content"].includes(col)) {
      headerMap.review = idx;
      hasHeader = true;
    } else if (["title", "headline", "subject"].includes(col)) {
      headerMap.title = idx;
    } else if (["city", "location"].includes(col)) {
      headerMap.city = idx;
    }
  });

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const results = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length === 0) continue;

    let name = "";
    let rawRating = "";
    let reviewText = "";
    let title = "";
    let city = "";

    if (hasHeader) {
      if (headerMap.name !== -1) name = row[headerMap.name] || "";
      if (headerMap.rating !== -1) rawRating = row[headerMap.rating] || "";
      if (headerMap.review !== -1) reviewText = row[headerMap.review] || "";
      if (headerMap.title !== -1) title = row[headerMap.title] || "";
      if (headerMap.city !== -1) city = row[headerMap.city] || "";
    } else {
      // Positional inference
      if (row.length === 2) {
        name = row[0];
        reviewText = row[1];
      } else if (row.length === 3) {
        name = row[0];
        rawRating = row[1];
        reviewText = row[2];
      } else if (row.length >= 4) {
        name = row[0];
        rawRating = row[1];
        title = row[2];
        reviewText = row[3];
      }
    }

    const parsedRating = normalizeRating(rawRating);

    if (name || reviewText) {
      results.push(buildNormalizedReviewRecord({
        index: results.length + 1,
        name: name.replace(/^["']+|["']+$/g, "").trim(),
        rating: parsedRating,
        hasExplicitRating: parsedRating !== null,
        fallbackRating: options.fallbackRating,
        title: title.replace(/^["']+|["']+$/g, "").trim(),
        text: reviewText.replace(/^["']+|["']+$/g, "").trim(),
        city,
        productId: options.selectedProductId || "all",
        productName: options.selectedProductName || "",
        source: options.source || "external"
      }));
    }
  }

  return results;
}

/**
 * Natural Text Review Parser (e.g. "Rahul Sharma gave 4.8 stars:\nMala ki quality...")
 */
export function parseNaturalTextReviews(rawText, options = {}) {
  const text = sanitizeInputText(rawText);
  const chunks = text.split(/\n\s*\n+/);
  const results = [];

  const naturalPattern = /^(?:(\d+[\.\)]\s*)?)(.+?)\s+(?:gave|rated(?:\s+it)?|rating:?)\s+([1-5](?:\.[0-9]+)?(?:\s*\/\s*5|\s*stars?|\s*★)?)\s*[:\-\n]+\s*([\s\S]+)$/i;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;

    const match = chunk.match(naturalPattern);
    if (match) {
      const name = match[2].trim().replace(/^["'“]+|["'”]+$/g, "");
      const rating = normalizeRating(match[3]);
      const reviewText = match[4].trim().replace(/^["'“]+|["'”]+$/g, "");

      results.push(buildNormalizedReviewRecord({
        index: results.length + 1,
        name,
        rating,
        hasExplicitRating: rating !== null,
        fallbackRating: options.fallbackRating,
        text: reviewText,
        productId: options.selectedProductId || "all",
        productName: options.selectedProductName || "",
        source: options.source || "external"
      }));
    }
  }

  return results;
}

/**
 * Central Master Review Parser
 * Automatically tries all parsing strategies in intelligent priority order.
 */
export function parseReviewInput(rawInput, options = {}) {
  const text = sanitizeInputText(rawInput).trim();
  const formatInfo = detectReviewFormat(text);

  if (!text) {
    return {
      detectedFormat: "empty",
      formatLabel: "No input detected",
      formatBadge: "No Input",
      rawCount: 0,
      records: [],
      summary: { total: 0, valid: 0, needsReview: 0, duplicates: 0 }
    };
  }

  const defaultOpts = {
    fallbackRating: options.fallbackRating !== undefined ? Number(options.fallbackRating) : 5,
    selectedProductId: options.selectedProductId || "",
    selectedProductName: options.selectedProductName || "",
    source: options.source || "external",
    existingReviews: options.existingReviews || []
  };

  let parsedRecords = [];

  // Strategy 1: JSON
  if (formatInfo.format === "json_array" || formatInfo.format === "json_object") {
    parsedRecords = parseJsonReviews(text, defaultOpts);
  }

  // Strategy 2: Numbered Key-Value or Key-Value
  if (parsedRecords.length === 0 && (formatInfo.format === "numbered_key_value" || formatInfo.format === "key_value")) {
    parsedRecords = parseKeyValueReviews(text, defaultOpts);
  }

  // Strategy 3: Pipe
  if (parsedRecords.length === 0 && formatInfo.format === "pipe") {
    parsedRecords = parsePipeReviews(text, defaultOpts);
  }

  // Strategy 4: CSV
  if (parsedRecords.length === 0 && formatInfo.format === "csv") {
    parsedRecords = parseCsvReviews(text, defaultOpts);
  }

  // Strategy 5: Natural text
  if (parsedRecords.length === 0 && formatInfo.format === "natural_text") {
    parsedRecords = parseNaturalTextReviews(text, defaultOpts);
  }

  // Strategy 6: General Fallback cascade
  if (parsedRecords.length === 0) {
    parsedRecords = parseJsonReviews(text, defaultOpts);
  }
  if (parsedRecords.length === 0) {
    parsedRecords = parseKeyValueReviews(text, defaultOpts);
  }
  if (parsedRecords.length === 0) {
    parsedRecords = parsePipeReviews(text, defaultOpts);
  }
  if (parsedRecords.length === 0) {
    parsedRecords = parseCsvReviews(text, defaultOpts);
  }
  if (parsedRecords.length === 0) {
    parsedRecords = parseNaturalTextReviews(text, defaultOpts);
  }

  // Strategy 7: Line-by-Line fallback for single lines or unstructured text
  if (parsedRecords.length === 0) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^([^:|]{1,60})\s*[:|]\s*(.+)$/);
      if (match) {
        parsedRecords.push(buildNormalizedReviewRecord({
          index: i + 1,
          name: match[1].trim(),
          rating: null,
          hasExplicitRating: false,
          fallbackRating: defaultOpts.fallbackRating,
          text: match[2].trim(),
          productId: defaultOpts.selectedProductId || "all",
          productName: defaultOpts.selectedProductName || "",
          source: defaultOpts.source
        }));
      } else {
        parsedRecords.push(buildNormalizedReviewRecord({
          index: i + 1,
          name: "",
          rating: null,
          hasExplicitRating: false,
          fallbackRating: defaultOpts.fallbackRating,
          text: line,
          productId: defaultOpts.selectedProductId || "all",
          productName: defaultOpts.selectedProductName || "",
          source: defaultOpts.source
        }));
      }
    }
  }

  // Perform Duplicate Detection & Validation
  const deduplicatedRecords = deduplicateReviewRecords(parsedRecords, defaultOpts.existingReviews);

  const total = deduplicatedRecords.length;
  const valid = deduplicatedRecords.filter(r => r.validation.isValid).length;
  const needsReview = total - valid;
  const duplicates = deduplicatedRecords.filter(r => r.isDuplicate).length;

  return {
    detectedFormat: formatInfo.format,
    formatLabel: formatInfo.label,
    formatBadge: formatInfo.badge,
    rawCount: total,
    records: deduplicatedRecords,
    summary: {
      total,
      valid,
      needsReview,
      duplicates
    }
  };
}

/**
 * Standardize single review item structure
 */
function buildNormalizedReviewRecord({
  index = 1,
  name = "",
  rating = null,
  hasExplicitRating = false,
  fallbackRating = 5,
  title = "",
  text = "",
  city = "",
  date = "",
  productId = "all",
  productName = "",
  source = "external",
  images = []
}) {
  const cleanName = (name || "").replace(/^["'“]+|["'”]+$/g, "").trim();
  const cleanText = (text || "").replace(/^["'“]+|["'”]+$/g, "").trim();
  const cleanTitle = (title || "").replace(/^["'“]+|["'”]+$/g, "").trim();

  const finalRating = hasExplicitRating && rating !== null
    ? rating
    : Math.min(5, Math.max(1, Number(fallbackRating) || 5));

  const language = detectLanguage(cleanText);

  const issues = [];
  if (!cleanText) issues.push("Missing review text");
  if (!cleanName) issues.push("Unknown / missing author name");
  if (!hasExplicitRating) issues.push(`Using fallback rating (${finalRating}★)`);

  const isValid = cleanText.length > 0;

  return {
    id: `EXT-REV-${Date.now()}-${index}-${Math.floor(100 + Math.random() * 900)}`,
    index,
    name: cleanName || "Unknown / Needs Review",
    displayName: cleanName || "Customer Reviewer",
    hasExplicitName: Boolean(cleanName),
    rating: finalRating,
    hasExplicitRating,
    title: cleanTitle,
    text: cleanText,
    originalText: cleanText,
    city: city || "India",
    date: date || "Recently",
    productId: productId || "all",
    productName: productName || (productId === "all" ? "Aura Rudraksha Sacred Store" : "Rudraksha Bead"),
    source: source || "external",
    language,
    images: Array.isArray(images) ? images : [],
    validation: {
      isValid,
      missingRating: !hasExplicitRating,
      missingText: !cleanText,
      missingName: !cleanName,
      issues
    },
    isDuplicate: false,
    duplicateReason: "",
    aiProcessed: false,
    selectedForImport: isValid
  };
}

/**
 * Deduplicate records against existing reviews and within the current batch.
 */
export function deduplicateReviewRecords(records = [], existingReviews = []) {
  if (!Array.isArray(records)) return [];

  const normalizeForMatch = (t) => {
    return (t || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F]/gi, "")
      .trim();
  };

  const seenBatchHashes = new Map();

  return records.map(record => {
    const normText = normalizeForMatch(record.text);
    if (!normText) return record;

    // Check within current batch
    if (seenBatchHashes.has(normText)) {
      const prevIdx = seenBatchHashes.get(normText);
      return {
        ...record,
        isDuplicate: true,
        duplicateReason: `Duplicate of item #${prevIdx} in this import batch`
      };
    }
    seenBatchHashes.set(normText, record.index);

    // Check against existing corpus
    if (Array.isArray(existingReviews) && existingReviews.length > 0) {
      const matched = existingReviews.find(ex => {
        const exNorm = normalizeForMatch(ex.text || ex.content || ex.originalText);
        return exNorm && exNorm === normText;
      });

      if (matched) {
        return {
          ...record,
          isDuplicate: true,
          duplicateReason: `Matches existing store review by "${matched.name || 'Customer'}" (${matched.rating || 5}★)`
        };
      }
    }

    return record;
  });
}
