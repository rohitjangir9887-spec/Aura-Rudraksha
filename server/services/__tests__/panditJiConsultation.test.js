import { describe, it, expect } from "vitest";
import { 
  determineAstrologicalIntent, 
  generateKundaliTopicDiagnosis, 
  calculateAuthenticKundali 
} from "../vedicAstrologyService.js";
import { generateSmartCustomerFallbackResponse } from "../../controllers/auraAiController.js";

describe("AI Pandit Ji Follow-up & Topic Guidance Suite", () => {
  const sampleBirthDetails = {
    dob: "1995-08-15",
    birthTime: "10:30",
    birthPlace: "Jaipur, Rajasthan",
    name: "Ramesh Sharma",
    gender: "male",
    concern: "career"
  };

  const kundaliData = calculateAuthenticKundali(sampleBirthDetails);

  describe("determineAstrologicalIntent", () => {
    it("correctly identifies 'nokri ke bare me' as career intent", () => {
      const intent = determineAstrologicalIntent("nokri ke bare me");
      expect(intent.type).toBe("career");
      expect(intent.houses).toContain(10);
      expect(intent.houses).toContain(6);
    });

    it("correctly classifies 'job me pareshani kab theek hogi' as career intent, not full kundali dump", () => {
      const intent = determineAstrologicalIntent("job me pareshani kab theek hogi");
      expect(intent.type).toBe("career");
    });

    it("correctly classifies 'naukri kab milegi' as career", () => {
      const intent = determineAstrologicalIntent("naukri kab milegi");
      expect(intent.type).toBe("career");
    });

    it("correctly classifies 'shadi kab hogi' as marriage", () => {
      const intent = determineAstrologicalIntent("shadi kab hogi");
      expect(intent.type).toBe("marriage");
      expect(intent.houses).toContain(7);
    });

    it("correctly classifies 'paisa kab aayega' or 'karza kab utrega' as finance", () => {
      const intent = determineAstrologicalIntent("karza kab utrega");
      expect(intent.type).toBe("finance");
      expect(intent.houses).toContain(2);
      expect(intent.houses).toContain(11);
    });

    it("identifies explicit full kundali request as full_kundali", () => {
      const intent = determineAstrologicalIntent("meri poori kundali dekho");
      expect(intent.type).toBe("full_kundali");
    });

    it("identifies general pareshani request without domain as full_kundali", () => {
      const intent = determineAstrologicalIntent("kya pareshani chal rahi hai aur kab theek hogi");
      expect(intent.type).toBe("full_kundali");
    });
  });

  describe("generateKundaliTopicDiagnosis", () => {
    it("generates a focused, authentic career response for 'nokri ke bare me'", () => {
      const intent = determineAstrologicalIntent("nokri ke bare me");
      const diagnosis = generateKundaliTopicDiagnosis(kundaliData, intent, "nokri ke bare me");

      expect(diagnosis).toBeDefined();
      expect(diagnosis).toContain("नौकरी, करियर व आजीविका");
      expect(diagnosis).toContain("दशम भाव");
      expect(diagnosis).toContain("षष्ठ भाव");
      expect(diagnosis).toContain("शनि देव");
      expect(diagnosis).toContain("विंशोत्तरी");

      // Verify it does NOT dump the full 9-planet breakdown or 10-part whole life diagnosis
      expect(diagnosis).not.toContain("अवकहड़ा चक्र");
      expect(diagnosis).not.toContain("All 9 Planets Detailed Reading");
      expect(diagnosis).not.toContain("पूरी कुंडली का संपूर्ण विस्तृत विश्लेषण");
    });

    it("generates a focused marriage response for 'shadi kab hogi'", () => {
      const intent = determineAstrologicalIntent("shadi kab hogi");
      const diagnosis = generateKundaliTopicDiagnosis(kundaliData, intent, "shadi kab hogi");

      expect(diagnosis).toBeDefined();
      expect(diagnosis).toContain("सप्तम भाव");
      expect(diagnosis).toContain("शुक्र देव");
      expect(diagnosis).toContain("गौरी शंकर रुद्राक्ष");
      expect(diagnosis).not.toContain("All 9 Planets Detailed Reading");
    });

    it("generates a focused financial response for wealth questions", () => {
      const intent = determineAstrologicalIntent("dhan labh kab hoga");
      const diagnosis = generateKundaliTopicDiagnosis(kundaliData, intent, "dhan labh kab hoga");

      expect(diagnosis).toBeDefined();
      expect(diagnosis).toContain("धन भाव");
      expect(diagnosis).toContain("7 मुखी");
    });
  });

  describe("generateSmartCustomerFallbackResponse", () => {
    it("returns targeted career guidance for 'nokri ke bare me' instead of full kundali markdown", () => {
      const response = generateSmartCustomerFallbackResponse("nokri ke bare me", [], [], "panditji", kundaliData);
      expect(response).toContain("नौकरी, करियर व आजीविका");
      expect(response).toContain("दशम भाव");
      expect(response).not.toContain("All 9 Planets Detailed Reading");
      expect(response).not.toContain("आपकी जन्म कुंडली का मूल पंचांग व अवकहड़ा चक्र");
    });

    it("returns full detailed markdown when devotee explicitly asks for full kundali", () => {
      const response = generateSmartCustomerFallbackResponse("meri poori kundali report dikhao", [], [], "panditji", kundaliData);
      expect(response).toContain("वर्तमान समस्याओं का सटीक निदान");
      expect(response).toContain("संपूर्ण कुंडली फलादेश");
    });
  });
});
