const fs = require('fs');

let content = fs.readFileSync('server/controllers/auraAiController.js', 'utf8');

const intentCode = `function detectUserIntent(msg) {
  msg = (msg || "").toLowerCase().trim();
  const intents = [];
  
  if (/(fayde|fayda|benefits|what is good|why should|profit|use of|what does|meaning of|kya hota|kaise madad|labh)/i.test(msg)) {
    intents.push("BENEFITS");
  }
  if (/(dikhao|chahiye|need|want|show|buy|purchase|looking for|mere liye sahi|suggest|recommend|which rudraksha|order karna hai|order krna|mangwana)/i.test(msg)) {
    if (msg.includes("order karna") || msg.includes("order krna") || msg.includes("mangwana")) {
      intents.push("CHECKOUT");
    } else {
      intents.push(msg.includes("mere liye sahi") || msg.includes("suggest") || msg.includes("recommend") ? "PRODUCT_RECOMMENDATION" : "PRODUCT_SEARCH");
    }
  }
  if (/(price|cost|rate|kitne ka|bhav|rupees|amount|under|budget|₹|sasta|mehenga)/i.test(msg)) {
    intents.push("PRICE");
  }
  if (/(offer|discount|deal|sale)/i.test(msg)) {
    intents.push("OFFER");
  }
  if (/(coupon|promo|code)/i.test(msg)) {
    intents.push("COUPON");
  }
  if (/(mera order|my order|track|where is my order|kaha hai|status|shipment|delivery status|order kaha)/i.test(msg)) {
    intents.push("ORDER_TRACKING");
  }
  if (/(history|previous orders|past orders)/i.test(msg)) {
    intents.push("ORDER_HISTORY");
  }
  if (/(cancel|stop order)/i.test(msg)) {
    intents.push("ORDER_CANCEL");
  }
  if (/(shipping|deliver|dispatch|bhej|kab aayega|how many days)/i.test(msg)) {
    intents.push("SHIPPING");
  }
  if (/(return|refund|wapas|exchange)/i.test(msg)) {
    intents.push("RETURN");
  }
  if (/(payment|pay|cash on delivery|cod|upi|card|online)/i.test(msg)) {
    intents.push("PAYMENT");
  }
  if (/(cart|basket|bag)/i.test(msg)) {
    intents.push("CART");
  }
  if (/(hi|hello|hey|namaste|pranam|radhe|har har|prabhat|kaise ho)/i.test(msg) && msg.length < 25) {
    intents.push("GREETING");
  }
  if (/(customer care|support|human|agent|baat karni|phone|contact|number|helpline|help|şikayat)/i.test(msg)) {
    intents.push("GENERAL_SUPPORT");
  }
  if (/(mukhi)/i.test(msg) && !intents.includes("PRODUCT_SEARCH") && !intents.includes("BENEFITS")) {
     intents.push("PRODUCT_INFO");
  }
  
  if (intents.length === 0) return "UNKNOWN";
  
  if (intents.includes("ORDER_TRACKING")) return "ORDER_TRACKING";
  if (intents.includes("CHECKOUT")) return "CHECKOUT";
  if (intents.includes("BENEFITS")) return "BENEFITS";
  if (intents.includes("PRODUCT_SEARCH")) return "PRODUCT_SEARCH";
  if (intents.includes("PRODUCT_RECOMMENDATION")) return "PRODUCT_RECOMMENDATION";
  if (intents.includes("COUPON")) return "COUPON";
  if (intents.includes("OFFER")) return "OFFER";
  if (intents.includes("PRICE")) return "PRICE";
  
  return intents[0];
}

function generateDynamicQuickReplies({ userMessage, intent }) {
  const msgLower = (userMessage || "").toLowerCase();
  const replies = [];
  
  if (msgLower.includes("13 mukhi") && (msgLower.includes("fayde") || msgLower.includes("benefit"))) {
    replies.push("13 Mukhi Price", "13 Mukhi Dekhein", "Kaise Pehne", "Order Karein");
  } else if (msgLower.includes("1000") && (msgLower.includes("andar") || msgLower.includes("under") || msgLower.includes("kam"))) {
    replies.push("5 Mukhi Dekhein", "7 Mukhi Dekhein", "Best Seller", "Compare Products");
  } else if (msgLower.includes("mera order kaha hai") || intent === "ORDER_TRACKING") {
    replies.push("Track Order", "Order History", "Shipping Help");
  } else if (msgLower.includes("coupon hai") || intent === "COUPON" || intent === "OFFER") {
    replies.push("Today's Offers", "Available Coupons", "Apply Coupon");
  } else if (intent === "BENEFITS") {
    let m = msgLower.match(/(\\d+)\\s*mukhi/);
    if (m) {
      replies.push(\`\${m[1]} Mukhi Price\`, \`\${m[1]} Mukhi Dekhein\`, "Kaise Pehne", "Order Karein");
    } else {
      replies.push("Check Price", "View Products", "How to Wear");
    }
  } else if (intent === "PRODUCT_SEARCH" || intent === "PRODUCT_INFO") {
    let m = msgLower.match(/(\\d+)\\s*mukhi/);
    if (m) {
      replies.push(\`\${m[1]} Mukhi Details\`, \`Buy \${m[1]} Mukhi\`, "Compare Products");
    } else {
      replies.push("Best Sellers", "Shop by Rashi", "Offers");
    }
  } else if (intent === "CHECKOUT" || intent === "CART") {
     replies.push("Confirm Order", "Apply Coupon", "Change Address");
  } else if (intent === "GREETING") {
     replies.push("5 Mukhi Rudraksha", "Find by Rashi", "Today's Offers", "Track Order");
  } else {
     replies.push("Talk to Support", "Explore Catalog", "Offers", "Find Rudraksha");
  }
  
  return Array.from(new Set(replies)).slice(0, 4);
}
`;

const searchCode = `function searchRelevantProducts(message, products) {
  const msgLower = message.toLowerCase();
  
  let scored = products.map(p => {
    let score = 0;
    const nameLower = (p.name || "").toLowerCase();
    
    const mukhiMatch = msgLower.match(/(\\d+)\\s*mukhi/);
    if (mukhiMatch) {
      if (nameLower.includes(\`\${mukhiMatch[1]} mukhi\`)) score += 100;
    }
    
    if (msgLower.includes("1000") && (msgLower.includes("under") || msgLower.includes("andar") || msgLower.includes("kam"))) {
      if (p.price <= 1000) score += 50;
      else score -= 100;
    }

    if (msgLower.includes("sasta") || msgLower.includes("cheap")) {
      if (p.price < 1500) score += 30;
    }

    if (msgLower.includes("mesh") || msgLower.includes("aries")) { if (nameLower.includes("3 mukhi")) score += 40; }
    if (msgLower.includes("mithun") || msgLower.includes("gemini") || msgLower.includes("kanya")) { if (nameLower.includes("4 mukhi")) score += 40; }
    if (msgLower.includes("kark") || msgLower.includes("cancer")) { if (nameLower.includes("2 mukhi")) score += 40; }
    if (msgLower.includes("singh") || msgLower.includes("leo")) { if (nameLower.includes("1 mukhi") || nameLower.includes("12 mukhi")) score += 40; }
    if (msgLower.includes("dhanu") || msgLower.includes("sagittarius") || msgLower.includes("meen") || msgLower.includes("pisces")) { if (nameLower.includes("5 mukhi")) score += 40; }
    if (msgLower.includes("makar") || msgLower.includes("capricorn") || msgLower.includes("kumbh") || msgLower.includes("aquarius")) { if (nameLower.includes("7 mukhi") || nameLower.includes("14 mukhi")) score += 40; }

    score += (p.rating || 4.5) * 2;
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 10).map(s => s.product).slice(0, 3);
}`;

const chatCode = `export async function chatAuraAI(req, res, next) {
  try {
    const { message, conversationId = "guest", userEmail, userName, history = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let userIsAuthenticated = false;
    let verifiedUserId = null;
    let verifiedEmail = "";
    let verifiedName = "Devotee";

    if (req.user) {
      userIsAuthenticated = true;
      verifiedUserId = req.user.authUserId;
      verifiedEmail = (req.user.email || "").toLowerCase().trim();
      verifiedName = req.user.name || "Devotee";
    }

    let products = [];
    let coupons = [];
    let userOrders = [];
    
    if (mongoose.connection.readyState === 1) {
      try {
        products = await Product.find({ inStock: { $ne: false } }).lean();
        coupons = await Coupon.find({ status: "Active" }).lean();
        if (userIsAuthenticated && (verifiedUserId || verifiedEmail)) {
          const orderQueries = [];
          if (verifiedUserId) {
            orderQueries.push({ authUserId: verifiedUserId });
            orderQueries.push({ customerAuthUserId: verifiedUserId });
          }
          if (verifiedEmail) {
            orderQueries.push({ customerEmail: verifiedEmail });
            orderQueries.push({ email: verifiedEmail });
          }
          userOrders = await Order.find({ $or: orderQueries }).sort({ createdAt: -1 }).limit(5).lean();
        }
      } catch (err) {
        console.warn("DB fetch error:", err.message);
      }
    }

    const intent = detectUserIntent(message);
    let relevantProducts = [];
    if (["PRODUCT_SEARCH", "PRODUCT_RECOMMENDATION", "BENEFITS", "PRICE", "CHECKOUT", "PRODUCT_INFO"].includes(intent)) {
      relevantProducts = searchRelevantProducts(message, products);
    }
    
    let contextualProducts = [...relevantProducts];
    if (contextualProducts.length === 0 && history.length > 0) {
       const lastUserMsgs = history.filter(h => h.sender === 'user').slice(-2).map(h => h.text).join(" ");
       if (lastUserMsgs) {
         contextualProducts = searchRelevantProducts(lastUserMsgs + " " + message, products);
       }
    }

    const quickReplies = generateDynamicQuickReplies({ userMessage: message, intent });
    
    const catalogContext = contextualProducts.map(p => ({
      id: String(p.id || p._id),
      name: p.name,
      price: p.price,
      mrp: p.comparePrice || Math.round(p.price * 1.3),
      inStock: p.inStock !== false,
      rating: p.rating || 4.5,
      reviews: p.reviewsCount || 10,
      description: (p.description || "").substring(0, 100)
    }));

    const ordersContext = userOrders.map(o => ({
      id: o.id || o.orderId,
      status: o.status,
      total: o.total,
      date: o.createdAt
    }));

    const systemPrompt = \`You are Aura AI, a premium spiritual ecommerce assistant for Aura Rudraksha.
Your core behavior:
1. Short, Natural & Human-like: Answer concisely. Do NOT write long paragraphs. Do NOT repeat "Namaste, Main Aura AI hoon".
2. Multilingual: Understand English, Hindi, and Hinglish perfectly. Reply in the same language/tone as the user.
3. Order Flow Guidance: If the user wants to place an order, guide them step-by-step. Do NOT ask for credit card numbers. Tell them you will show the product card below to add to cart.
4. Memory: Contextualize queries (e.g. if they just asked about 5 mukhi, and now say "under 1000", combine them).
5. Accurate Website Data: Use the provided context precisely. Never invent products, prices, or orders.

Current User Intent: \${intent}
Authenticated Customer: \${userIsAuthenticated ? verifiedName : "Guest (Not logged in)"}
Customer Orders (Auth-Only): \${JSON.stringify(ordersContext)}
Relevant Catalog Products Found: \${JSON.stringify(catalogContext)}
Active Coupons: \${JSON.stringify(coupons.map(c => c.code + " - " + c.discount))}

Instructions:
- If user asks about their order, only use the 'Customer Orders' context. If they are Guest, ask them to log in. NEVER invent an order.
- If user asks for 13 mukhi fayde, give a concise 2-line answer about benefits, do NOT dump products unless they also want to buy.
- Answer the user DIRECTLY in pure text. NO markdown code blocks. NO json wrappers. JUST TEXT.\`;

    const formattedMessages = [{ role: "system", content: systemPrompt }];
    for (const h of history.slice(-4)) {
      if (h.sender === "user" && h.text) formattedMessages.push({ role: "user", content: String(h.text) });
      else if (h.sender === "ai" && h.text) formattedMessages.push({ role: "assistant", content: String(h.text) });
    }
    formattedMessages.push({ role: "user", content: message });

    const nvidiaApiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : "";
    
    const isStreaming = Boolean(req.query?.stream === "true" || req.body?.stream === true || (req.headers?.accept && req.headers.accept.includes("text/event-stream")));
    
    if (isStreaming) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      if (res.flushHeaders) res.flushHeaders();
      res.write(\`data: \${JSON.stringify({ type: "start", conversationId })}\\n\\n\`);

      if (!nvidiaApiKey) {
        const fallbackText = "Namaste! Main abhi thoda maintainance mein hoon, please support se contact karein.";
        res.write(\`data: \${JSON.stringify({ type: "chunk", delta: fallbackText })}\\n\\n\`);
        res.write(\`data: \${JSON.stringify({ type: "final", data: { text: fallbackText, products: [], coupons: [], quickReplies } })}\\n\\n\`);
        res.end();
        return;
      }

      let fullRawContent = "";
      try {
        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": \`Bearer \${nvidiaApiKey}\`,
            "Accept": "text/event-stream"
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-super-120b-a12b",
            messages: formattedMessages,
            temperature: 0.3,
            max_tokens: 300,
            stream: true
          })
        });

        if (nimRes.ok && nimRes.body) {
          const reader = nimRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                try {
                  const parsedJson = JSON.parse(trimmed.slice(6));
                  const delta = parsedJson.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullRawContent += delta;
                    res.write(\`data: \${JSON.stringify({ type: "chunk", delta })}\\n\\n\`);
                    if (res.flush) res.flush();
                  }
                } catch (_) {}
              }
            }
          }
        } else {
            const fallbackText = "Kshama karein, connection thoda slow hai.";
            res.write(\`data: \${JSON.stringify({ type: "chunk", delta: fallbackText })}\\n\\n\`);
            fullRawContent = fallbackText;
        }
      } catch (err) {
        console.error("NIM Exception:", err.message);
      }

      const finalProducts = contextualProducts.slice(0, 3).map(p => ({
        id: String(p._id || p.id),
        name: p.name,
        price: p.price,
        comparePrice: p.comparePrice || Math.round(p.price * 1.3),
        images: p.images || (p.image ? [p.image] : []),
        image: p.image || (p.images && p.images[0]) || "",
        rating: p.rating || 4.5,
        reviewsCount: p.reviewsCount || 10,
        inStock: p.inStock !== false,
        slug: p.slug
      }));
      
      const finalCoupons = intent === "COUPON" || intent === "OFFER" ? coupons.slice(0, 2) : [];

      res.write(\`data: \${JSON.stringify({ 
        type: "final", 
        data: { 
          text: fullRawContent, 
          products: finalProducts, 
          coupons: finalCoupons, 
          quickReplies,
          requiresHuman: false
        } 
      })}\\n\\n\`);
      res.end();
      return;
    }

    return res.status(200).json({ success: true, text: "Streaming required", products: [], quickReplies: [] });
  } catch (error) {
    next(error);
  }
}`;

const idxIntent = content.indexOf('function detectUserIntent(message)');
const idxSearch = content.indexOf('function searchRelevantProducts(message, products)');
const idxChat = content.indexOf('export async function chatAuraAI(req, res, next)');
const idxGetSettings = content.indexOf('export async function getAuraAISettings(req, res, next)');

if (idxIntent === -1 || idxSearch === -1 || idxChat === -1 || idxGetSettings === -1) {
  console.log("Could not find markers!");
  process.exit(1);
}

// Rebuild content
const beforeIntent = content.substring(0, idxIntent);
const afterGetSettings = content.substring(idxGetSettings);

const newContent = beforeIntent + 
  intentCode + '\\n\\n' + 
  searchCode + '\\n\\n' + 
  chatCode + '\\n\\n' + 
  afterGetSettings;

fs.writeFileSync('server/controllers/auraAiController.js', newContent);
console.log("Done");
