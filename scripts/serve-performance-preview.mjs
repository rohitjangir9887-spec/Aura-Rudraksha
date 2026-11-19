import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const app = express();
const product = {
  id: "performance-fixture",
  slug: "performance-fixture",
  name: "5 Mukhi Rudraksha",
  category: "Rudraksha",
  price: 1299,
  mrp: 1499,
  stock: 10,
  status: "Published",
  img: "/images/product-5mukhi.jpg",
  images: ["/images/product-5mukhi.jpg"],
  showOnHome: true
};

app.use(compression());
app.get(["/api/products", "/api/products/public/catalog"], (_req, res) => {
  res.json({ success: true, data: [product], count: 1 });
});
app.get("/api/products/:id", (_req, res) => res.json({ success: true, data: product }));
app.get("/api/banners", (_req, res) => res.json({ success: true, data: [
  { id: "performance-banner", url: "/images/product-5mukhi.jpg", position: "hero", isActive: true }
] }));
app.get("/api/settings", (_req, res) => res.json({ success: true, data: {} }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", database: "connected" }));
app.use("/api", (_req, res) => res.json({ success: true, data: [] }));
app.use(express.static(dist));
app.get(["/shop", "/product/:id", "/cart"], (_req, res) => res.sendFile("index.html", { root: dist }));
app.listen(process.env.PORT || 4173, "127.0.0.1");
