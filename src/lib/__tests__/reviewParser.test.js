import { describe, it, expect } from "vitest";
import {
  parseReviewInput,
  detectReviewFormat,
  normalizeRating,
  detectLanguage
} from "../reviewParser.js";

describe("Aura Review Parser Suite", () => {
  // TEST 1 — Single JSON Object
  it("TEST 1: correctly parses a single JSON object", () => {
    const input = `{
      "name": "Karan Patel",
      "rating": 4.6,
      "review": "Premium 1 Mukhi Rudraksha ka look bahut beautiful hai."
    }`;

    const result = parseReviewInput(input);
    expect(result.detectedFormat).toBe("json_object");
    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.records[0].name).toBe("Karan Patel");
    expect(result.records[0].rating).toBe(4.6);
    expect(result.records[0].hasExplicitRating).toBe(true);
    expect(result.records[0].text).toBe("Premium 1 Mukhi Rudraksha ka look bahut beautiful hai.");
  });

  // TEST 2 — JSON Array
  it("TEST 2: correctly parses a JSON array with exact user failing case", () => {
    const input = `[
      {
        "name": "Karan Patel",
        "rating": 5,
        "review": "Premium quality 1 Mukhi Rudraksha. Product, certification aur packaging tino ka experience excellent raha. Definitely satisfied."
      },
      {
        "name": "Pooja Agarwal",
        "rating": 4.6,
        "review": "Natural finish aur packaging achhi thi."
      }
    ]`;

    const result = parseReviewInput(input);
    expect(result.detectedFormat).toBe("json_array");
    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(2);

    expect(result.records[0].name).toBe("Karan Patel");
    expect(result.records[0].rating).toBe(5);
    expect(result.records[0].hasExplicitRating).toBe(true);
    expect(result.records[0].text).toContain("Premium quality 1 Mukhi Rudraksha");

    expect(result.records[1].name).toBe("Pooja Agarwal");
    expect(result.records[1].rating).toBe(4.6);
    expect(result.records[1].hasExplicitRating).toBe(true);
    expect(result.records[1].text).toContain("Natural finish");
  });

  // TEST 3 — Key-Value Format
  it("TEST 3: correctly parses Key-Value format", () => {
    const input = `Name: Rahul Sharma
Rating: 4.8
Review: Mala ki quality achhi hai, genuine rudraksha mila.`;

    const result = parseReviewInput(input);
    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.records[0].name).toBe("Rahul Sharma");
    expect(result.records[0].rating).toBe(4.8);
    expect(result.records[0].hasExplicitRating).toBe(true);
    expect(result.records[0].text).toBe("Mala ki quality achhi hai, genuine rudraksha mila.");
  });

  // TEST 4 — Numbered Key-Value (e.g. 10. block header)
  it("TEST 4: strips leading numbers and does not include them in name or review text", () => {
    const input = `10.
Name: Pooja Agarwal
Rating: 4.6
Review: Premium 1 Mukhi Rudraksha ka look bahut beautiful hai.`;

    const result = parseReviewInput(input);
    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.records[0].name).toBe("Pooja Agarwal");
    expect(result.records[0].rating).toBe(4.6);
    expect(result.records[0].text).toBe("Premium 1 Mukhi Rudraksha ka look bahut beautiful hai.");
    expect(result.records[0].text).not.toContain("10.");
    expect(result.records[0].name).not.toContain("10.");
  });

  // TEST 5 — Pipe Format
  it("TEST 5: correctly parses Pipe-Separated format", () => {
    const input = `Rahul Sharma | 4.8 | Mala ki quality achhi hai, genuine rudraksha mila.
Pooja Agarwal | 4.6 | Premium 1 Mukhi Rudraksha ka look bahut beautiful hai.`;

    const result = parseReviewInput(input);
    expect(result.summary.total).toBe(2);
    expect(result.records[0].name).toBe("Rahul Sharma");
    expect(result.records[0].rating).toBe(4.8);
    expect(result.records[0].text).toContain("Mala ki quality achhi hai");

    expect(result.records[1].name).toBe("Pooja Agarwal");
    expect(result.records[1].rating).toBe(4.6);
    expect(result.records[1].text).toContain("Premium 1 Mukhi Rudraksha");
  });

  // TEST 6 — CSV Format
  it("TEST 6: correctly parses CSV format with header and quotes", () => {
    const input = `Name,Rating,Review
Rahul Sharma,4.8,"Mala ki quality achhi hai, genuine rudraksha mila."
Pooja Agarwal,4.6,"Premium 1 Mukhi Rudraksha ka look bahut beautiful hai."`;

    const result = parseReviewInput(input);
    expect(result.summary.total).toBe(2);
    expect(result.records[0].name).toBe("Rahul Sharma");
    expect(result.records[0].rating).toBe(4.8);
    expect(result.records[0].text).toBe("Mala ki quality achhi hai, genuine rudraksha mila.");

    expect(result.records[1].name).toBe("Pooja Agarwal");
    expect(result.records[1].rating).toBe(4.6);
    expect(result.records[1].text).toBe("Premium 1 Mukhi Rudraksha ka look bahut beautiful hai.");
  });

  // TEST 7 — Mixed Hindi / English / Hinglish & Natural Text
  it("TEST 7: correctly detects languages and parses natural text", () => {
    const input = `Rahul Sharma gave 4.8 stars:
Mala ki quality achhi hai, genuine rudraksha mila.

Pooja Agarwal rated it 4.6/5:
Premium 1 Mukhi Rudraksha ka look bahut beautiful hai.`;

    const result = parseReviewInput(input);
    expect(result.summary.total).toBe(2);
    expect(result.records[0].name).toBe("Rahul Sharma");
    expect(result.records[0].rating).toBe(4.8);
    expect(result.records[0].language).toBe("Hinglish / Hindi");

    expect(result.records[1].name).toBe("Pooja Agarwal");
    expect(result.records[1].rating).toBe(4.6);
  });

  // TEST 8 — Missing Rating (fallback used ONLY on missing records)
  it("TEST 8: applies fallback rating only to records lacking explicit ratings", () => {
    const input = `[
      { "name": "User 1", "rating": 4.2, "review": "Explicit rating review" },
      { "name": "User 2", "review": "No rating review" }
    ]`;

    const result = parseReviewInput(input, { fallbackRating: 3 });
    expect(result.records[0].rating).toBe(4.2);
    expect(result.records[0].hasExplicitRating).toBe(true);

    expect(result.records[1].rating).toBe(3);
    expect(result.records[1].hasExplicitRating).toBe(false);
  });

  // TEST 9 — Duplicate Reviews Detection
  it("TEST 9: detects duplicates within batch and against existing corpus without deleting", () => {
    const input = `[
      { "name": "Amit", "rating": 5, "review": "Great genuine item!" },
      { "name": "Amit Duplicate", "rating": 5, "review": "Great genuine item!" }
    ]`;

    const existingReviews = [
      { name: "Old Devotee", text: "Unique text in DB", rating: 5 }
    ];

    const result = parseReviewInput(input, { existingReviews });
    expect(result.summary.total).toBe(2);
    expect(result.records[0].isDuplicate).toBe(false);
    expect(result.records[1].isDuplicate).toBe(true);
    expect(result.records[1].duplicateReason).toContain("Duplicate of item #1");
  });

  // TEST 10 — Star Unicode Normalization
  it("TEST 10: normalizes unicode star characters", () => {
    expect(normalizeRating("★★★★★")).toBe(5);
    expect(normalizeRating("★★★★☆")).toBe(4);
    expect(normalizeRating("★★★☆☆")).toBe(3);
    expect(normalizeRating("4.6/5")).toBe(4.6);
    expect(normalizeRating("4 out of 5")).toBe(4);
  });
});
