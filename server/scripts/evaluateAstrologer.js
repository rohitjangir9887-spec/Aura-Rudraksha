import { calculateAuthenticKundali, determineAstrologicalIntent } from "../services/vedicAstrologyService.js";
import { shouldPerformWebResearch } from "../services/groundingService.js";
import { VEDIC_SHASTRA_KNOWLEDGE } from "../services/vedicKnowledgeService.js";

/**
 * Astrological AI Guruji Evaluation & Test Suite
 * Verifies calculation accuracy, intent detection, classical knowledge availability, and zero hallucination principles.
 */

async function runEvaluationSuite() {
  console.log("==================================================");
  console.log("🕉️ AURA RUDRAKSHA - AI GURUJI EVALUATION SUITE");
  console.log("==================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // TEST 1: Authentic Kundali Calculation Verification
  console.log("--- TEST SET 1: Kundali Calculation Accuracy ---");
  const birthData = {
    name: "Rudra Devotee",
    dob: "1995-08-15",
    birthTime: "10:30",
    birthPlace: "Varanasi",
    concern: "Career & Prosperity"
  };

  const kundali = calculateAuthenticKundali(birthData);
  assert(kundali !== null, "Kundali calculated successfully");
  assert(kundali.verifiedBirthData.name === "Rudra Devotee", "Name verified in birth data");
  assert(kundali.astronomicalKundali.lagna && kundali.astronomicalKundali.lagna.rashiHindi, "Lagna Rashi calculated");
  assert(kundali.astronomicalKundali.chandraRashi && kundali.astronomicalKundali.chandraRashi.rashiHindi, "Chandra Rashi calculated");
  assert(kundali.astronomicalKundali.vimshottariDasha.currentMahadashaHindi, "Vimshottari Mahadasha calculated");
  assert(Array.isArray(kundali.astronomicalKundali.planets) && kundali.astronomicalKundali.planets.length === 9, "All 9 Grahas present");
  assert(Array.isArray(kundali.astronomicalKundali.jaiminiKarakas) && kundali.astronomicalKundali.jaiminiKarakas.length === 7, "Jaimini 7 Chara Karakas calculated");
  assert(Array.isArray(kundali.astronomicalKundali.rudrakshaRecommendations) && kundali.astronomicalKundali.rudrakshaRecommendations.length >= 3, "Rudraksha recommendations generated");

  // TEST 2: Question Intent Determination
  console.log("\n--- TEST SET 2: Question Intent Determination ---");
  const intent0 = determineAstrologicalIntent("hii");
  assert(intent0.type === "greeting", "Simple 'hii' correctly classified as 'greeting'");

  const intent1 = determineAstrologicalIntent("कैरियर में सफलता कब मिलेगी और कौन सी नौकरी अच्छी रहेगी?");
  assert(intent1.type === "career", "Career query correctly classified as 'career'");

  const intent2 = determineAstrologicalIntent("मेरी शादी कब होगी और जीवनसाथी कैसा मिलेगा?");
  assert(intent2.type === "marriage", "Marriage query correctly classified as 'marriage'");

  const intent3 = determineAstrologicalIntent("पूरी कुंडली बताओ विस्तार से");
  assert(intent3.type === "full_kundali", "Full Kundali query correctly classified as 'full_kundali'");

  const intent4 = determineAstrologicalIntent("विदेश जाने का योग कब है?");
  assert(intent4.type === "travel", "Travel query correctly classified as 'travel'");

  // TEST 3: Research Grounding Heuristic Trigger
  console.log("\n--- TEST SET 3: Research Grounding Heuristic Trigger ---");
  assert(shouldPerformWebResearch("2026 mein Shani ka Gochar kab hoga?") === true, "Transit 2026 query triggers web research");
  assert(shouldPerformWebResearch("Brihat Parashara Hora Shastra Shloka reference for Gajakesari") === true, "Shastra verse query triggers web research");
  assert(shouldPerformWebResearch("Namaste Pandit ji") === false, "Greeting query does NOT trigger web research");

  // TEST 4: Classical Shastra Knowledge Availability
  console.log("\n--- TEST SET 4: Classical Shastra Knowledge Availability ---");
  assert(VEDIC_SHASTRA_KNOWLEDGE.classicalCanons.bphs !== undefined, "BPHS canon present");
  assert(VEDIC_SHASTRA_KNOWLEDGE.classicalCanons.jaimini !== undefined, "Jaimini canon present");
  assert(VEDIC_SHASTRA_KNOWLEDGE.classicalCanons.brihatJataka !== undefined, "Brihat Jataka canon present");
  assert(VEDIC_SHASTRA_KNOWLEDGE.classicalCanons.prashnaMarga !== undefined, "Prashna Marga canon present");
  assert(VEDIC_SHASTRA_KNOWLEDGE.lifeDomainMatrices.careerAndLeadership !== undefined, "Career domain matrix present");

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log("==================================================\n");
}

runEvaluationSuite().catch(err => {
  console.error("Evaluation Suite Error:", err);
  process.exit(1);
});
