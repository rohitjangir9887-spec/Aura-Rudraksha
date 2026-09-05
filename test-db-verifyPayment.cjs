const assert = require('node:assert');
import('./src/lib/db.js').then(module => {
  console.log(Object.keys(module.default));
}).catch(e => console.error(e));
