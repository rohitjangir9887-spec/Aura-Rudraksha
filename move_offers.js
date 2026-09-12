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

// Remove the block and the trailing newline from the original place
let newContent = content.substring(0, startIndex) + content.substring(endIndex);
newContent = newContent.replace(/^\s*[\r\n]/gm, '\n'); // remove empty lines it might have left
// actually let's just do a string replace
let cleanContent = content.replace(block, "");

// find where to insert it: between popular-collection-section and about-block
const insertPoint = `    </section>\n\n    <section className="section about-block" id="about">`;
if(cleanContent.indexOf(insertPoint) === -1) {
  console.log("Could not find insert point");
  process.exit(1);
}

// Also remove the inline style `style={{ marginTop: '20px' }}` since it's going back to its normal place
let cleanBlock = block.replace(`style={{ marginTop: '20px' }}`, ``);

cleanContent = cleanContent.replace(insertPoint, `    </section>\n\n    ${cleanBlock}\n\n    <section className="section about-block" id="about">`);

fs.writeFileSync('src/pages/Home.jsx', cleanContent);
console.log("Moved successfully.");
