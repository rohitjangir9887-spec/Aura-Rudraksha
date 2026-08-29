const fs = require('fs');
let code = fs.readFileSync('src/pages/account/Orders.jsx', 'utf8');

// We want to make the entire order card clickable or just change the product link
// Let's replace the link around imgContent
code = code.replace(
  /return exists \? \([\s\S]*?<Link key=\{idx\} to=\{`\/product\/\$\{prod\.id\}`\} title=\{prod\.name\}>[\s\S]*?\{imgContent\}[\s\S]*?<\/Link>[\s\S]*?\) : imgContent;/g,
  "return (<Link key={idx} to={`/account/orders/${o.id}`} title={`View Order`}>{imgContent}</Link>);"
);

// We can also make the entire motion.div clickable
code = code.replace(
  /<motion\.div key=\{o\.id\} initial=\{\{ opacity: 0, y: 10 \}\} animate=\{\{ opacity: 1, y: 0 \}\} style=\{\{/g,
  "<motion.div onClick={() => navigate(`/account/orders/${o.id}`)} key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ cursor: 'pointer',"
);

// We should also remove the onClick propagation on the View Order button if it's there? It's a Link. Clicking a Link inside an onClick div will trigger both.
// Let's just prevent default if they click the button, or not worry about it since they go to the same place.

fs.writeFileSync('src/pages/account/Orders.jsx', code);
console.log("Patched Orders.jsx");
