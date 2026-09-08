const fs = require('fs');
const content = fs.readFileSync('src/hooks/useWishlist.jsx', 'utf8');
console.log(content.includes('import { db } from "../lib/db";'));
