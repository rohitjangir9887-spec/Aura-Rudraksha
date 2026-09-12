const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');

// Ensure Out of stock badge looks correctly muted but keeps glassmorphism if needed
// Actually, let's keep it as is since it looks very premium with the glass effect and copper text. 
