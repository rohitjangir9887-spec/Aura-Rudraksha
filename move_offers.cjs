const fs = require('fs');
const content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// The block to extract
const startTag = "{offers.length > 0 && (";
const endTag = "      </section>\n    )}";

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag) + endTag.length;

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find the block");
  process.exit(1);
}

const block = content.substring(startIndex, endIndex);

let cleanContent = content.replace(block, "");

// find where to insert it: between popular-collection-section and about-block
const insertPoint = `    </section>\n\n    <section className="section about-block" id="about">`;
if(cleanContent.indexOf(insertPoint) === -1) {
  console.log("Could not find insert point, checking alternative whitespace...");
  // Alternative
  const regex = /<\/section>\s*<section className="section about-block" id="about">/;
  if(regex.test(cleanContent)) {
     cleanContent = cleanContent.replace(regex, `</section>\n\n    ${block}\n\n    <section className="section about-block" id="about">`);
  } else {
     console.log("Failed to find insertion point");
     process.exit(1);
  }
} else {
  cleanContent = cleanContent.replace(insertPoint, `    </section>\n\n    ${block}\n\n    <section className="section about-block" id="about">`);
}

// Remove the inline style `style={{ marginTop: '20px' }}` since it's going back to its normal place
cleanContent = cleanContent.replace(/style=\{\{ marginTop: '20px' \}\}/, ``);

fs.writeFileSync('src/pages/Home.jsx', cleanContent);
console.log("Moved successfully.");
