const products = [
  { name: "Original 14 Mukhi Rudraksha (Nepali) — Lab Certified Chaudah Mukhi Rudraksha" }
];
const cleanTarget = "original-14-mukhi-rudraksha-nepali-lab-certified-chaudah-mukhi-rudraksha";

const found = products.find(p => {
  const pSlug = "";
  const pName = String(p.name || "").toLowerCase();
  const pSlugifiedName = pName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  console.log("pSlugifiedName:", pSlugifiedName);
  console.log("cleanTarget:", cleanTarget);
  console.log("Match:", pSlugifiedName === cleanTarget);
  return pSlug === cleanTarget ||
          pSlugifiedName === cleanTarget ||
          (cleanTarget.length >= 3 && pSlug.includes(cleanTarget)) ||
         (cleanTarget.length >= 3 && cleanTarget.includes(pSlug)) ||
         (cleanTarget.length >= 3 && pSlugifiedName.includes(cleanTarget)) ||
         (cleanTarget.length >= 3 && cleanTarget.includes(pSlugifiedName));
});
console.log(found);
