const fs = require('fs');
let content = fs.readFileSync('src/pages/PaymentResult.jsx', 'utf-8');

if (!content.includes('useCart()')) {
  content = content.replace(
    /import \{ db \} from "\.\.\/lib\/db";/,
    `import { db } from "../lib/db";
import { useCart } from "../hooks/useCart";`
  );

  content = content.replace(
    /export function PaymentResult\(\) \{/,
    `export function PaymentResult() {
  const { clear } = useCart();`
  );

  content = content.replace(
    /if \(res\.data\.paymentStatus === "Paid" && \(status === "success" \|\| status === "processing"\)\) \{/g,
    `if (res.data.paymentStatus === "Paid" && (status === "success" || status === "processing")) {
            clear(); // Clear cart only on confirmed success`
  );

  fs.writeFileSync('src/pages/PaymentResult.jsx', content);
}
