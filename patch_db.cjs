const fs = require('fs');
const file = 'src/lib/db.js';
let content = fs.readFileSync(file, 'utf8');

const oldEmit = `export const emitStoreUpdate = (type, payload) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aura:store-updated", {
        detail: { type, payload, timestamp: Date.now() }
      })
    );
  }
};`;

const newEmit = `export const emitStoreUpdate = (type, payload) => {
  if (typeof window !== "undefined") {
    const detail = { type, payload, timestamp: Date.now() };
    window.dispatchEvent(
      new CustomEvent("aura:store-updated", { detail })
    );
    try {
      localStorage.setItem("aura_cross_tab_signal", JSON.stringify(detail));
    } catch (e) {}
  }
};`;

const oldOnUpdate = `export const onStoreUpdate = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => callback(event.detail || {});
  window.addEventListener("aura:store-updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("aura:store-updated", handler);
    window.removeEventListener("storage", handler);
  };
};`;

const newOnUpdate = `export const onStoreUpdate = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => callback(event.detail || {});
  window.addEventListener("aura:store-updated", handler);
  return () => {
    window.removeEventListener("aura:store-updated", handler);
  };
};`;

content = content.replace(oldEmit, newEmit);
content = content.replace(oldOnUpdate, newOnUpdate);
fs.writeFileSync(file, content);
console.log('Done replacing emitStoreUpdate and onStoreUpdate');
