const fs = require('fs');
let code = fs.readFileSync('src/pages/Product.jsx', 'utf8');

const parseMarkup = `
  const renderDescription = (text) => {
    if (!text) return null;
    let html = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    html = html.replace(/\\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: html }} style={{ lineHeight: '1.6', color: '#4a3b32', fontSize: '14px' }} />;
  };
`;

code = code.replace(
  /const highlightText = /,
  parseMarkup + '\n  const highlightText = '
);

code = code.replace(
  /<p>\s*\{p.description \|\| `The \$\{p.name\} is a revered spiritual seed ethically harvested from authentic trees. Worn by seekers, devotees, and meditators worldwide to cultivate inner tranquility, clarity of focus, and protective spiritual energy.`\}\s*<\/p>/,
  `{p.description ? renderDescription(p.description) : <p>The {p.name} is a revered spiritual seed ethically harvested from authentic trees. Worn by seekers, devotees, and meditators worldwide to cultivate inner tranquility, clarity of focus, and protective spiritual energy.</p>}`
);

fs.writeFileSync('src/pages/Product.jsx', code);
console.log("Patched Product.jsx");
