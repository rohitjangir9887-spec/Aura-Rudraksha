const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAnalytics.jsx', 'utf8');

content = content.replace(
  /useEffect\(\(\) => \{[\s\S]*?const analytics = db\.getAnalytics\(\);/,
  `useEffect(() => {
    async function loadData() {
      const analytics = await db.fetchAnalytics();`
);

content = content.replace(
  /const orders = db\.getOrders\(\);[\s\S]*?\}\, \[\]\);/,
  `const orders = db.getOrders();
      const rev = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (o.amount || 0), 0);
      setStats({
        visits: analytics.visits || 0,
        productViews: analytics.productViews || 0,
        totalOrders: orders.length,
        conversion: analytics.visits ? ((orders.length / analytics.visits) * 100).toFixed(1) : 0,
        revenue: rev
      });
    }
    loadData();
  }, []);`
);

fs.writeFileSync('src/pages/admin/AdminAnalytics.jsx', content);
