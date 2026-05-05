import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { state, users } from "./data.js";
import { explainDecision } from "./explainer.js";
import {
  attachReceiptAndReevaluate,
  createIntent,
  exportExpenseLines,
  getCatalog,
  getRankedOffersForContext,
  listIntents,
  runAutonomousAgent,
  runFlightBookingAutoPay,
  scanReceiptAndAutoSubmit,
  uploadReceiptAndAutomate,
  upsertReceipt
} from "./pipeline.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "amex-aligned-api" });
});

app.get("/api/bootstrap", (_req, res) => {
  const user = users[0];
  res.json({
    user,
    aggregates: state.aggregatesByUser[user.id] || {
      totalSpend: 0,
      byVertical: { PAYMENT: 0, TRAVEL: 0, DINING: 0 },
      recentMerchants: []
    },
    intents: state.intents.slice(-8).reverse(),
    expenseLines: state.expenseLines.slice(-8).reverse(),
    events: state.events.slice(-12).reverse(),
    lastEvaluation: state.lastEvaluation,
    realtimeVersion: state.realtimeVersion
  });
});

app.post("/api/intents", (req, res) => {
  try {
    const result = createIntent(req.body);
    explainDecision(result)
      .then((explanation) => res.status(201).json({ ...result, explanation }))
      .catch(() => res.status(201).json({ ...result, explanation: { source: "template", text: "Decision explanation unavailable." } }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/intents", (req, res) => {
  const intents = listIntents({
    vertical: req.query.vertical,
    query: req.query.q
  });
  res.json({ items: intents });
});

app.post("/api/receipts", upload.single("receipt"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "receipt file is required" });
  }
  const receipt = upsertReceipt(req.file, req.body.userId);
  return res.status(201).json(receipt);
});

app.post("/api/expenses/scan-upload", upload.single("receipt"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "receipt file is required" });
  }
  if (!req.file.mimetype.includes("image") && req.file.mimetype !== "application/pdf") {
    return res.status(400).json({ error: "only image or pdf receipts are supported in MVP" });
  }
  try {
    const result = uploadReceiptAndAutomate({
      file: req.file,
      userId: req.body.userId || "user_amex_1",
      intentId: req.body.intentId || null
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/expenses/:intentId/auto-reconcile", (req, res) => {
  try {
    const result = attachReceiptAndReevaluate(req.params.intentId);
    explainDecision(result)
      .then((explanation) => res.status(200).json({ ...result, explanation }))
      .catch(() => res.status(200).json({ ...result, explanation: { source: "template", text: "Decision explanation unavailable." } }));
    return;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/agents/autonomous-pay", (req, res) => {
  try {
    const result = runAutonomousAgent(req.body?.userId || "user_amex_1");
    explainDecision(result)
      .then((explanation) => res.status(201).json({ ...result, explanation }))
      .catch(() => res.status(201).json({ ...result, explanation: { source: "template", text: "Decision explanation unavailable." } }));
    return;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/agents/book-flight-autopay", (req, res) => {
  try {
    const result = runFlightBookingAutoPay(req.body?.userId || "user_amex_1");
    explainDecision(result)
      .then((explanation) => res.status(201).json({ ...result, explanation }))
      .catch(() => res.status(201).json({ ...result, explanation: { source: "template", text: "Decision explanation unavailable." } }));
    return;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/offers", (req, res) => {
  const vertical = req.query.vertical;
  const latestRank = state.offerRanks[state.offerRanks.length - 1];
  const offersResponse = latestRank?.offers || [];

  if (!vertical) {
    return res.json({ offers: offersResponse });
  }
  return res.json({
    offers: offersResponse.filter((item) => item.id.toLowerCase().includes(String(vertical).toLowerCase()))
  });
});

app.get("/api/offers/ranked", (req, res) => {
  const offers = getRankedOffersForContext({
    userId: req.query.userId || "user_amex_1",
    context: req.query.context || "PAYMENT"
  });
  res.json({ offers });
});

app.get("/api/catalog", (req, res) => {
  const items = getCatalog({ query: req.query.q, vertical: req.query.vertical });
  res.json({ items });
});

app.get("/api/expenses", (_req, res) => {
  res.json({ items: state.expenseLines.slice().reverse() });
});

app.get("/api/expenses/export", (req, res) => {
  const format = String(req.query.format || "json").toLowerCase();
  const payload = exportExpenseLines(format);
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    return res.send(payload);
  }
  return res.json({ items: payload });
});

app.post("/api/expenses/:intentId/scan-auto-submit", (req, res) => {
  try {
    const result = scanReceiptAndAutoSubmit(req.params.intentId);
    explainDecision(result)
      .then((explanation) => res.status(200).json({ ...result, explanation }))
      .catch(() => res.status(200).json({ ...result, explanation: { source: "template", text: "Decision explanation unavailable." } }));
    return;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/decisions/:decisionId/explain", async (req, res) => {
  const decision = state.decisions.find((item) => item.id === req.params.decisionId);
  if (!decision) return res.status(404).json({ error: "Decision not found" });
  const intent = state.intents.find((item) => item.id === decision.intentId);
  if (!intent) return res.status(404).json({ error: "Linked intent not found" });
  const ranked = state.offerRanks.find((item) => item.intentId === intent.id)?.offers || [];
  const explanation = await explainDecision({ intent, decision, offers: ranked });
  return res.json({ decisionId: decision.id, explanation });
});

app.get("/api/realtime", (_req, res) => {
  res.json({
    version: state.realtimeVersion,
    lastEvaluation: state.lastEvaluation,
    latestOffers: state.offerRanks[state.offerRanks.length - 1]?.offers || [],
    events: state.events.slice(-12).reverse()
  });
});

app.get("/api/realtime/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const push = () => {
    const body = JSON.stringify({
      version: state.realtimeVersion,
      lastEvaluation: state.lastEvaluation,
      latestOffers: state.offerRanks[state.offerRanks.length - 1]?.offers || [],
      events: state.events.slice(-12).reverse()
    });
    res.write(`data: ${body}\n\n`);
  };

  push();
  const timer = setInterval(push, 3000);
  req.on("close", () => {
    clearInterval(timer);
    res.end();
  });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

export default app;
