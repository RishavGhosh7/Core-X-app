import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { defaultCards, state, users } from "./data.js";
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
import { isDatabaseEnabled, query } from "./db.js";
import { generateConciergeReply } from "./concierge-llm.js";
import { generatePersonalizedInsights } from "./insights-ml.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 4000;

function buildConciergeReply(topic = "") {
  const text = String(topic || "").toLowerCase();
  if (text.includes("redeem") || text.includes("points")) {
    return "Great choice. I can help you redeem points for flights, hotels, or statement credit. Tell me your preferred travel dates or redemption goal.";
  }
  if (text.includes("flight") || text.includes("travel") || text.includes("airport")) {
    return "I can arrange flights, lounge access, airport transfer, and hotel recommendations. Share destination, dates, and cabin preference.";
  }
  if (text.includes("dining") || text.includes("restaurant")) {
    return "I can shortlist premium restaurants with available tables and eligible Amex dining benefits. Tell me city, date, and cuisine.";
  }
  return "Absolutely. I can assist with travel booking, rewards redemption, and premium services. Share a bit more detail and I will personalize options.";
}

async function buildConciergeResponse(topic = "") {
  let replyMessage = buildConciergeReply(topic);
  try {
    const llmReply = await generateConciergeReply({ topic, userName: "Rishav" });
    if (llmReply) replyMessage = llmReply;
  } catch {
    // Keep fallback reply when OpenRouter is unavailable.
  }
  return {
    sessionId: `concierge_${Date.now()}`,
    status: "connected",
    openingMessage: "Welcome to American Express Concierge. We can help with premium travel, dining bookings, and rewards redemptions.",
    replyMessage,
    suggestedPrompts: [
      "Book airport transfer and lounge access for my upcoming trip",
      "Use points for a premium hotel stay",
      "Find dining reservations with Amex benefits this weekend"
    ]
  };
}

async function getRewardsPayload(userId, context) {
  const rankedOffers = getRankedOffersForContext({ userId, context }).slice(0, 3);
  if (!isDatabaseEnabled()) {
    if (typeof state.rewardBalanceByUser[userId] !== "number") {
      state.rewardBalanceByUser[userId] = 198240;
    }
    const pointsBalance = state.rewardBalanceByUser[userId];
    return {
      pointsBalance,
      redeemableValueInr: Math.round((pointsBalance / 100) * 85) / 100,
      recommendations: rankedOffers,
      nextBestAction: "Navigate to Offers and redeem points on travel + dining partners."
    };
  }

  await query(
    `
      INSERT INTO reward_accounts (user_id, points_balance)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId, 198240]
  );
  const result = await query("SELECT points_balance FROM reward_accounts WHERE user_id = $1 LIMIT 1", [userId]);
  const pointsBalance = Number(result.rows[0]?.points_balance || 0);
  return {
    pointsBalance,
    redeemableValueInr: Math.round((pointsBalance / 100) * 85) / 100,
    recommendations: rankedOffers,
    nextBestAction: "Navigate to Offers and redeem points on travel + dining partners."
  };
}

function getRedemptionCost(offerId) {
  const id = String(offerId || "").toLowerCase();
  if (id.includes("travel")) return 18000;
  if (id.includes("dining")) return 14000;
  if (id.includes("shopping")) return 12000;
  return 15000;
}

async function persistEvent({ type, userId, payload = {} }) {
  const event = {
    id: `evt_${type}_${Date.now()}`,
    type,
    userId,
    createdAt: new Date().toISOString()
  };
  state.events.unshift(event);
  state.events = state.events.slice(0, 120);
  state.realtimeVersion += 1;

  if (isDatabaseEnabled()) {
    await query(
      `
        INSERT INTO app_events (id, user_id, type, payload, created_at)
        VALUES ($1, $2, $3, $4::jsonb, NOW())
      `,
      [event.id, userId, type, JSON.stringify(payload)]
    );
  }
}

function getFallbackCards(userId) {
  if (!state.cardsByUser[userId]) {
    state.cardsByUser[userId] = defaultCards.map((card) => ({ ...card, id: `${userId}_${card.id}` }));
  }
  return state.cardsByUser[userId];
}

function normalizeCardInput(payload = {}) {
  const name = String(payload.name || "").trim();
  const lastFour = String(payload.lastFour || "").replace(/\D/g, "").slice(-4);
  const balance = Number(payload.balance || 0);
  const cardLimit = Number(payload.limit || payload.cardLimit || 0);
  if (!name) throw new Error("Card name is required");
  if (lastFour.length !== 4) throw new Error("Last four digits are required");
  if (!Number.isFinite(balance) || balance <= 0) throw new Error("Balance must be a positive number");
  if (!Number.isFinite(cardLimit) || cardLimit <= 0) throw new Error("Card limit must be a positive number");
  return {
    name,
    type: String(payload.type || "custom"),
    lastFour,
    balance: Math.round(balance),
    limit: Math.round(cardLimit),
    color: payload.color || "#212529",
    gradient: payload.gradient || "linear-gradient(135deg, #111827 0%, #374151 52%, #111827 100%)"
  };
}

function toClientCard(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    lastFour: row.last_four ?? row.lastFour,
    balance: Number(row.balance),
    limit: Number(row.card_limit ?? row.limit),
    color: row.color || "#212529",
    gradient: row.gradient
  };
}

async function listUserCards(userId) {
  if (!isDatabaseEnabled()) return getFallbackCards(userId);
  const existing = await query("SELECT id FROM user_cards WHERE user_id = $1 LIMIT 1", [userId]);
  if (!existing.rows.length) {
    for (const card of defaultCards) {
      await query(
        `
          INSERT INTO user_cards (id, user_id, name, type, last_four, balance, card_limit, color, gradient)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [`${userId}_${card.id}`, userId, card.name, card.type, card.lastFour, card.balance, card.limit, card.color, card.gradient]
      );
    }
  }
  const result = await query("SELECT * FROM user_cards WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return result.rows.map(toClientCard);
}

async function createUserCard(userId, payload) {
  const normalized = normalizeCardInput(payload);
  const cardId = `card_${Date.now()}`;
  if (!isDatabaseEnabled()) {
    const card = { id: cardId, ...normalized };
    const current = getFallbackCards(userId);
    state.cardsByUser[userId] = [card, ...current];
    return card;
  }
  const result = await query(
    `
      INSERT INTO user_cards (id, user_id, name, type, last_four, balance, card_limit, color, gradient)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [cardId, userId, normalized.name, normalized.type, normalized.lastFour, normalized.balance, normalized.limit, normalized.color, normalized.gradient]
  );
  return toClientCard(result.rows[0]);
}

async function updateUserCard(userId, cardId, payload) {
  const normalized = normalizeCardInput(payload);
  if (!isDatabaseEnabled()) {
    const current = getFallbackCards(userId);
    const index = current.findIndex((card) => card.id === cardId);
    if (index === -1) throw new Error("Card not found");
    const updated = { ...current[index], ...normalized };
    current[index] = updated;
    return updated;
  }
  const result = await query(
    `
      UPDATE user_cards
      SET name = $3, type = $4, last_four = $5, balance = $6, card_limit = $7, color = $8, gradient = $9, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [cardId, userId, normalized.name, normalized.type, normalized.lastFour, normalized.balance, normalized.limit, normalized.color, normalized.gradient]
  );
  if (!result.rows.length) throw new Error("Card not found");
  return toClientCard(result.rows[0]);
}

async function deleteUserCard(userId, cardId) {
  if (!isDatabaseEnabled()) {
    const current = getFallbackCards(userId);
    const next = current.filter((card) => card.id !== cardId);
    if (next.length === current.length) throw new Error("Card not found");
    state.cardsByUser[userId] = next;
    return;
  }
  const result = await query("DELETE FROM user_cards WHERE id = $1 AND user_id = $2 RETURNING id", [cardId, userId]);
  if (!result.rows.length) throw new Error("Card not found");
}

async function resetUserCards(userId) {
  const seededCards = defaultCards.map((card) => ({ ...card, id: `${userId}_${card.id}` }));
  if (!isDatabaseEnabled()) {
    state.cardsByUser[userId] = seededCards;
    return seededCards;
  }

  await query("DELETE FROM user_cards WHERE user_id = $1", [userId]);
  for (const card of seededCards) {
    await query(
      `
        INSERT INTO user_cards (id, user_id, name, type, last_four, balance, card_limit, color, gradient, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `,
      [card.id, userId, card.name, card.type, card.lastFour, card.balance, card.limit, card.color, card.gradient]
    );
  }
  return seededCards;
}

async function deductUserCardBalance(userId, cardId, amountMinor) {
  const deduction = Math.max(0, Math.round(Number(amountMinor || 0)));
  if (!deduction) return null;

  if (!isDatabaseEnabled()) {
    const current = getFallbackCards(userId);
    const index = current.findIndex((card) => card.id === cardId);
    if (index === -1) throw new Error("Selected payment card not found");
    const nextBalance = Math.max(0, Number(current[index].balance || 0) - deduction);
    current[index] = { ...current[index], balance: nextBalance };
    return current[index];
  }

  const result = await query(
    `
      UPDATE user_cards
      SET balance = GREATEST(balance - $3, 0), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [cardId, userId, deduction]
  );
  if (!result.rows.length) throw new Error("Selected payment card not found");
  return toClientCard(result.rows[0]);
}

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

app.get("/api/insights/personalized", async (req, res) => {
  try {
    const userId = req.query.userId || "user_amex_1";
    const user = users.find((item) => item.id === userId) || users[0];
    const cards = await listUserCards(userId);
    const payload = generatePersonalizedInsights({
      userName: user?.name || "Member",
      intents: state.intents.slice().reverse(),
      expenseLines: state.expenseLines.slice().reverse(),
      cards
    });
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/bootstrap/reset", (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    state.intents = [];
    state.decisions = [];
    state.offerRanks = [];
    state.offerImpressions = [];
    state.expenseLines = [];
    state.receipts = [];
    state.idempotencyKeys = {};
    state.lastEvaluation = null;
    state.aggregatesByUser[userId] = {
      totalSpend: 0,
      byVertical: { PAYMENT: 0, TRAVEL: 0, DINING: 0 },
      recentMerchants: []
    };
    state.realtimeVersion += 1;
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/intents", async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    let sourceCardId = null;
    if (payload.sourceCardId) {
      const cards = await listUserCards(payload.userId || "user_amex_1");
      const selectedCard = cards.find((card) => card.id === payload.sourceCardId);
      if (!selectedCard) {
        return res.status(400).json({ error: "Selected payment card not found" });
      }
      const amountMinor = Math.round(Number(payload.amount || 0) * 100);
      if (amountMinor > Number(selectedCard.limit || 0)) {
        return res.status(400).json({
          error: `Transaction exceeds single transaction limit for ${selectedCard.name}`
        });
      }
      payload.sourceCardName = selectedCard.name;
      payload.sourceCardLastFour = selectedCard.lastFour;
      sourceCardId = selectedCard.id;
    }
    const result = createIntent(payload);
    let chargedCard = null;
    if (sourceCardId) {
      const amountMinor = Math.round(Number(payload.amount || 0) * 100);
      chargedCard = await deductUserCardBalance(payload.userId || "user_amex_1", sourceCardId, amountMinor);
    }
    explainDecision(result)
      .then((explanation) => res.status(201).json({ ...result, chargedCard, explanation }))
      .catch(() =>
        res.status(201).json({ ...result, chargedCard, explanation: { source: "template", text: "Decision explanation unavailable." } })
      );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/cards", async (req, res) => {
  try {
    const userId = req.query.userId || "user_amex_1";
    const cards = await listUserCards(userId);
    return res.json({ items: cards });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/cards", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const card = await createUserCard(userId, req.body);
    return res.status(201).json({ item: card });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch("/api/cards/:cardId", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const card = await updateUserCard(userId, req.params.cardId, req.body);
    return res.status(200).json({ item: card });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/cards/:cardId", async (req, res) => {
  try {
    const userId = req.query.userId || "user_amex_1";
    await deleteUserCard(userId, req.params.cardId);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/cards/reset", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const items = await resetUserCards(userId);
    return res.status(200).json({ items });
  } catch (error) {
    return res.status(400).json({ error: error.message });
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
  Promise.resolve()
    .then(async () => {
      const userId = req.body?.userId || "user_amex_1";
      let selectedCard = null;
      if (req.body?.sourceCardId) {
        const cards = await listUserCards(userId);
        selectedCard = cards.find((card) => card.id === req.body.sourceCardId) || null;
        if (!selectedCard) {
          throw new Error("Selected payment card not found");
        }
      }
      const result = runAutonomousAgent(userId, selectedCard);
      let chargedCard = null;
      if (selectedCard?.id && result?.intent?.amount) {
        const amountMinor = Math.round(Number(result.intent.amount || 0) * 100);
        chargedCard = await deductUserCardBalance(userId, selectedCard.id, amountMinor);
      }
      return { result, chargedCard };
    })
    .then(({ result, chargedCard }) => {
    explainDecision(result)
        .then((explanation) => res.status(201).json({ ...result, chargedCard, explanation }))
        .catch(() =>
          res.status(201).json({ ...result, chargedCard, explanation: { source: "template", text: "Decision explanation unavailable." } })
        );
    })
    .catch((error) => res.status(400).json({ error: error.message }));
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

app.post("/api/rewards/redeem-options", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const context = req.body?.context || "TRAVEL";
    const payload = await getRewardsPayload(userId, context);
    await persistEvent({ type: "rewards_redeem_options_loaded", userId, payload: { context, pointsBalance: payload.pointsBalance } });
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/rewards/redemptions", async (req, res) => {
  try {
    const userId = req.query.userId || "user_amex_1";
    if (!isDatabaseEnabled()) {
      const redeemed = state.redeemedOffersByUser[userId] || [];
      return res.status(200).json({ offerIds: redeemed });
    }
    const result = await query("SELECT offer_id FROM reward_redemptions WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return res.status(200).json({ offerIds: result.rows.map((row) => row.offer_id) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/rewards/reset", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const defaultPoints = 198240;
    if (!isDatabaseEnabled()) {
      state.rewardBalanceByUser[userId] = defaultPoints;
      state.redeemedOffersByUser[userId] = [];
      return res.status(200).json({ pointsBalance: defaultPoints, offerIds: [] });
    }
    await query(
      `
        INSERT INTO reward_accounts (user_id, points_balance)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET points_balance = $2, last_updated_at = NOW()
      `,
      [userId, defaultPoints]
    );
    await query("DELETE FROM reward_redemptions WHERE user_id = $1", [userId]);
    return res.status(200).json({ pointsBalance: defaultPoints, offerIds: [] });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/offers/:offerId/redeem", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const offerId = String(req.params.offerId || "");
    const pointsRequired = getRedemptionCost(offerId);

    if (!isDatabaseEnabled()) {
      if (typeof state.rewardBalanceByUser[userId] !== "number") {
        state.rewardBalanceByUser[userId] = 198240;
      }
      const redeemed = state.redeemedOffersByUser[userId] || [];
      if (redeemed.includes(offerId)) {
        return res.status(409).json({ error: "Offer already redeemed" });
      }
      if (state.rewardBalanceByUser[userId] < pointsRequired) {
        return res.status(400).json({ error: "Not enough points to redeem this offer" });
      }
      state.rewardBalanceByUser[userId] -= pointsRequired;
      state.redeemedOffersByUser[userId] = [offerId, ...redeemed];
      await persistEvent({ type: "offer_redeemed", userId, payload: { offerId, pointsSpent: pointsRequired } });
      return res.status(200).json({
        offerId,
        pointsSpent: pointsRequired,
        pointsBalance: state.rewardBalanceByUser[userId],
        status: "redeemed"
      });
    }

    await query(
      `
        INSERT INTO reward_accounts (user_id, points_balance)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId, 198240]
    );
    const already = await query("SELECT id FROM reward_redemptions WHERE user_id = $1 AND offer_id = $2 LIMIT 1", [userId, offerId]);
    if (already.rows.length) {
      return res.status(409).json({ error: "Offer already redeemed" });
    }
    const account = await query("SELECT points_balance FROM reward_accounts WHERE user_id = $1 LIMIT 1", [userId]);
    const pointsBalance = Number(account.rows[0]?.points_balance || 0);
    if (pointsBalance < pointsRequired) {
      return res.status(400).json({ error: "Not enough points to redeem this offer" });
    }
    await query("UPDATE reward_accounts SET points_balance = points_balance - $2, last_updated_at = NOW() WHERE user_id = $1", [userId, pointsRequired]);
    await query(
      `
        INSERT INTO reward_redemptions (id, user_id, offer_id, points_spent, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `,
      [`redeem_${Date.now()}`, userId, offerId, pointsRequired]
    );
    const updated = await query("SELECT points_balance FROM reward_accounts WHERE user_id = $1 LIMIT 1", [userId]);
    await persistEvent({ type: "offer_redeemed", userId, payload: { offerId, pointsSpent: pointsRequired } });
    return res.status(200).json({
      offerId,
      pointsSpent: pointsRequired,
      pointsBalance: Number(updated.rows[0]?.points_balance || 0),
      status: "redeemed"
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/concierge/chat", async (req, res) => {
  try {
    const userId = req.body?.userId || "user_amex_1";
    const topic = req.body?.topic || "premium_travel_assistance";
    const response = await buildConciergeResponse(topic);
    if (isDatabaseEnabled()) {
      await query(
        `
          INSERT INTO concierge_sessions (id, user_id, topic, status, opening_message, suggested_prompts, created_at)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
        `,
        [response.sessionId, userId, topic, response.status, response.openingMessage, JSON.stringify(response.suggestedPrompts)]
      );
    }
    await persistEvent({ type: "concierge_session_started", userId, payload: { topic, sessionId: response.sessionId } });
    return res.status(200).json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

export default app;
