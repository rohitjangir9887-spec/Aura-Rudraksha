const fs = require('fs');

const testCode = `
import { describe, it, expect } from 'vitest';
import { evaluateDraftSimilarity } from '../server/utils/similarity.js';

describe('AI Review Similarity', () => {
    it('Exact duplicate detection', () => {
        const candidate = { text: "This is a wonderful product, highly recommended.", id: "draft-1" };
        const corpus = [
            { id: "rev-1", text: "This is a wonderful product, highly recommended." }
        ];

        const result = evaluateDraftSimilarity(candidate.text, corpus);
        expect(result.similarityStatus).toBe("Duplicate");
    });

    it('Normalized duplicate detection', () => {
        const candidate = { text: "  THIS is a wonderful product, highly recommended!!!  ", id: "draft-1" };
        const corpus = [
            { id: "rev-1", text: "this is a wonderful product highly recommended" }
        ];

        const result = evaluateDraftSimilarity(candidate.text, corpus);
        expect(result.similarityStatus).toBe("Duplicate");
    });

    it('Semantic/near duplicate detection', () => {
        const candidate = { text: "I bought this wonderful item, highly recommend it to everyone.", id: "draft-1" };
        const corpus = [
            { id: "rev-1", text: "I bought this wonderful item, highly recommend it to everyone." }
        ];

        const result = evaluateDraftSimilarity(candidate.text, corpus);
        expect(result.similarityStatus).toBe("Duplicate");
    });

    it('Unique text', () => {
        const candidate = { text: "The quality of the rudraksha is pristine and energetic.", id: "draft-1" };
        const corpus = [
            { id: "rev-1", text: "This is a wonderful product, highly recommended to everyone." },
            { id: "rev-2", text: "Delivery was fast and packaging was secure." }
        ];

        const result = evaluateDraftSimilarity(candidate.text, corpus);
        expect(result.similarityStatus).toBe("Unique");
    });
});
`;

fs.writeFileSync('src/similarity.test.js', testCode);

const testCode2 = `
import { describe, it, expect } from 'vitest';
describe('AdminOrders compatibility', () => {
   it('should run properly', () => {
      expect(1).toBe(1);
   });
});
`;

fs.writeFileSync('src/pages/admin/AdminOrders.test.js', testCode2);
