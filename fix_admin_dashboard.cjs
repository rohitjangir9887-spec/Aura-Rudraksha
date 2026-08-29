const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/Admin.jsx', 'utf8');

content = content.replace(
  /useEffect\(\(\) => \{[\s\S]*?const analytics = db\.getAnalytics\(\);/,
  `useEffect(() => {
    async function loadData() {
      const orders = db.getOrders();
      const customers = db.getCustomers();
      const products = db.getProducts();
      const analytics = await db.fetchAnalytics();`
);

content = content.replace(
  /setTopProducts\(products\.slice\(0, 5\)\);\n  \}, \[\]\);/,
  `setTopProducts(products.slice(0, 5));
    }
    loadData();
  }, []);`
);

fs.writeFileSync('src/pages/admin/Admin.jsx', content);
