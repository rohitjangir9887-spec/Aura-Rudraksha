const fs = require('fs');
let txt = fs.readFileSync('QA_REPORT.md', 'utf8');
txt = txt.replace(/=======[\s\S]*?>>>>>>> origin\/main/m, '');
txt = txt.replace(/<<<<<<< HEAD/m, '');
fs.writeFileSync('QA_REPORT.md', txt);
