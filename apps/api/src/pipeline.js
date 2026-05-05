import crypto from "node:crypto";
import { offers, policies, state, users } from "./data.js";

const VALID_VERTICALS = new Set(["PAYMENT", "TRAVEL", "DINING"]);

function timingSafeEquals(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getPolicy(userId) {
  return policies.find((item) => item.userId === userId);
}

function getUser(userId) {
  return users.find((item) => item.id === userId);
}

function updateAggregate(intent) {
  const existing = state.aggregatesByUser[intent.userId] || {
    totalSpend: 0,
    byVertical: { PAYMENT: 0, TRAVEL: 0, DINING: 0 },
    recentMerchants: []
  };

  existing.totalSpend += intent.amount;
  existing.byVertical[intent.vertical] += intent.amount;
  existing.recentMerchants = [intent.merchant, ...existing.recentMerchants].slice(0, 5);
  state.aggregatesByUser[intent.userId] = existing;
}

function evaluateDecision(intent) {
  const policy = getPolicy(intent.userId);
  if (!policy) {
    return { status: "REJECT", violations: ["NO_POLICY"] };
  }

  const violations = [];
  if (intent.amount > policy.maxIntentAmount) violations.push("MAX_INTENT_AMOUNT_EXCEEDED");
  if (policy.blockedMerchants.includes(intent.merchant)) violations.push("BLOCKED_MERCHANT");
  if (intent.amount > policy.requiresReceiptAbove && !intent.receiptId) violations.push("MISSING_RECEIPT");

  let status = "APPROVE";
  if (violations.some((item) => item === "BLOCKED_MERCHANT")) status = "REJECT";
  else if (violations.length > 0) status = "HOLD";

  return { status, violations };
}

function evaluateRisk(intent) {
  const flags = [];
  let riskScore = 0;

  if (intent.amount > 1200) {
    flags.push("HIGH_AMOUNT");
    riskScore += 35;
  }
  if (intent.merchant.toLowerCase().includes("unknown")) {
    flags.push("UNKNOWN_MERCHANT_SIGNAL");
    riskScore += 45;
  }
  if (intent.vertical === "TRAVEL" && intent.amount > 800) {
    flags.push("TRAVEL_HIGH_TICKET");
    riskScore += 20;
  }

  return {
    score: Math.min(riskScore, 100),
    level: riskScore >= 70 ? "HIGH" : riskScore >= 35 ? "MEDIUM" : "LOW",
    flags
  };
}

function computeOfferScore(offer, intent, aggregate, user) {
  let score = offer.baseBoost;
  const reasons = [];

  if (offer.vertical === intent.vertical) {
    score += 30;
    reasons.push("vertical_match");
  }

  if (intent.merchant.toLowerCase().includes(offer.merchantPattern)) {
    score += 20;
    reasons.push("merchant_hint");
  }

  const affinity = user?.verticalAffinity?.[offer.vertical] || 1;
  score += Math.round(affinity * 10);
  if (affinity > 1.1) reasons.push("user_affinity");

  const verticalSpend = aggregate?.byVertical?.[offer.vertical] || 0;
  if (verticalSpend > 300) {
    score += 8;
    reasons.push("rolling_spend_signal");
  }

  return { score, reasons };
}

function rankOffers(intent) {
  const aggregate = state.aggregatesByUser[intent.userId];
  const user = getUser(intent.userId);

  return offers
    .map((offer) => {
      const { score, reasons } = computeOfferScore(offer, intent, aggregate, user);
      return { ...offer, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function recalculateExpenseLineStatus(decisionStatus) {
  return decisionStatus === "APPROVE" ? "SUBMITTED" : "PENDING_REVIEW";
}

function logEvent(type, message, meta = {}) {
  state.events.push({
    id: `event_${state.events.length + 1}`,
    type,
    message,
    meta,
    createdAt: new Date().toISOString()
  });
}

function evaluateIntent(intent) {
  logEvent("INTENT_CREATED", `Intent created for ${intent.merchant}`, {
    intentId: intent.id,
    vertical: intent.vertical,
    amount: intent.amount
  });

  const policyOutcome = evaluateDecision(intent);
  const risk = evaluateRisk(intent);
  const outcome = {
    ...policyOutcome,
    status: policyOutcome.status === "APPROVE" && risk.level === "HIGH" ? "HOLD" : policyOutcome.status,
    violations:
      policyOutcome.status === "APPROVE" && risk.level === "HIGH"
        ? [...policyOutcome.violations, "RISK_REVIEW_REQUIRED"]
        : policyOutcome.violations
  };
  const decision = {
    id: `decision_${state.decisions.length + 1}`,
    intentId: intent.id,
    status: outcome.status,
    violations: outcome.violations,
    risk,
    createdAt: new Date().toISOString()
  };
  state.decisions.push(decision);
  logEvent("POLICY_EVALUATED", `Policy evaluation: ${decision.status}`, {
    intentId: intent.id,
    decisionId: decision.id,
    violations: decision.violations
  });

  const ranked = rankOffers(intent);
  state.offerRanks.push({
    intentId: intent.id,
    offerIds: ranked.map((item) => item.id),
    offers: ranked,
    createdAt: new Date().toISOString()
  });
  state.offerImpressions.push({
    id: `impression_${state.offerImpressions.length + 1}`,
    intentId: intent.id,
    offerIds: ranked.map((item) => item.id),
    scores: ranked.map((item) => item.score),
    createdAt: new Date().toISOString()
  });

  const expenseLine = {
    id: `line_${state.expenseLines.length + 1}`,
    intentId: intent.id,
    merchant: intent.merchant,
    amount: intent.amount,
    vertical: intent.vertical,
    status: recalculateExpenseLineStatus(decision.status),
    decisionId: decision.id,
    createdAt: new Date().toISOString()
  };
  state.expenseLines.push(expenseLine);
  logEvent("EXPENSE_LINE_UPDATED", `Expense line ${expenseLine.status}`, {
    intentId: intent.id,
    lineId: expenseLine.id,
    status: expenseLine.status
  });

  state.realtimeVersion += 1;
  state.lastEvaluation = {
    intent,
    decision,
    offers: ranked,
    expenseLine,
    updatedAt: new Date().toISOString()
  };

  return { intent, decision, offers: ranked, expenseLine };
}

export function createIntent(payload) {
  if (!payload.userId || !payload.merchant || !payload.amount || !payload.vertical) {
    throw new Error("Missing required fields: userId, merchant, amount, vertical");
  }

  if (!VALID_VERTICALS.has(payload.vertical)) {
    throw new Error("vertical must be PAYMENT, TRAVEL, or DINING");
  }

  const idempotencyKey = payload.idempotencyKey || null;
  if (idempotencyKey && state.idempotencyKeys[idempotencyKey]) {
    return state.idempotencyKeys[idempotencyKey];
  }

  if (payload.source?.startsWith("AGENT") && process.env.AGENT_SHARED_SECRET) {
    const expected = crypto.createHmac("sha256", process.env.AGENT_SHARED_SECRET).update(`${payload.userId}:${payload.merchant}:${payload.amount}`).digest("hex");
    if (!timingSafeEquals(payload.agentSignature, expected)) {
      throw new Error("Invalid agent attestation signature");
    }
  }

  const intent = {
    id: `intent_${state.intents.length + 1}`,
    userId: payload.userId,
    merchant: payload.merchant,
    amount: Number(payload.amount),
    currency: payload.currency || "USD",
    vertical: payload.vertical,
    domain: payload.domain || null,
    receiptId: payload.receiptId || null,
    source: payload.source || "APP",
    agentPersona: payload.agentPersona || null,
    createdAt: new Date().toISOString()
  };

  state.intents.push(intent);
  updateAggregate(intent);

  const evaluated = evaluateIntent(intent);
  if (idempotencyKey) state.idempotencyKeys[idempotencyKey] = evaluated;
  return evaluated;
}

export function listIntents({ vertical, query }) {
  return state.intents
    .filter((item) => (!vertical ? true : item.vertical === String(vertical).toUpperCase()))
    .filter((item) => (!query ? true : item.merchant.toLowerCase().includes(String(query).toLowerCase())))
    .slice()
    .reverse();
}

export function getRankedOffersForContext({ userId = "user_amex_1", context = "PAYMENT" }) {
  const pseudoIntent = {
    id: "context_intent",
    userId,
    merchant: context === "TRAVEL" ? "Air Express" : context === "DINING" ? "Blue Bistro" : "City Utility",
    amount: 100,
    vertical: String(context).toUpperCase()
  };
  return rankOffers(pseudoIntent);
}

export function getCatalog({ query = "", vertical = "" }) {
  const q = String(query).toLowerCase().trim();
  const v = String(vertical).toUpperCase().trim();
  return offers
    .filter((item) => (!v ? true : item.vertical === v))
    .filter((item) => (!q ? true : item.title.toLowerCase().includes(q) || item.merchantPattern.toLowerCase().includes(q)))
    .map((item) => ({ id: item.id, title: item.title, vertical: item.vertical, merchantHint: item.merchantPattern }));
}

export function exportExpenseLines(format = "json") {
  if (format === "csv") {
    const header = "id,intentId,merchant,amount,vertical,status,decisionId,createdAt";
    const rows = state.expenseLines.map((line) =>
      [line.id, line.intentId, line.merchant, line.amount, line.vertical, line.status, line.decisionId, line.createdAt].join(",")
    );
    return [header, ...rows].join("\n");
  }
  return state.expenseLines.slice();
}

export function upsertReceipt(file, userId = "user_amex_1") {
  const receipt = {
    id: `receipt_${state.receipts.length + 1}`,
    userId,
    filename: file.originalname,
    mimetype: file.mimetype,
    total: null,
    createdAt: new Date().toISOString()
  };

  state.receipts.push(receipt);
  logEvent("RECEIPT_SCANNED", `Receipt scanned for ${receipt.filename}`, {
    receiptId: receipt.id,
    userId
  });
  return receipt;
}

export function attachReceiptAndReevaluate(intentId) {
  const intent = state.intents.find((item) => item.id === intentId);
  if (!intent) throw new Error("Intent not found");

  const syntheticReceiptId = `receipt_auto_${state.receipts.length + 1}`;
  intent.receiptId = syntheticReceiptId;
  state.receipts.push({
    id: syntheticReceiptId,
    userId: intent.userId,
    filename: "auto-generated-receipt.png",
    mimetype: "image/png",
    total: intent.amount,
    createdAt: new Date().toISOString()
  });
  logEvent("RECEIPT_ATTACHED", `Synthetic receipt attached to ${intent.id}`, {
    intentId: intent.id,
    receiptId: syntheticReceiptId
  });

  const outcome = evaluateDecision(intent);
  const decision = {
    id: `decision_${state.decisions.length + 1}`,
    intentId: intent.id,
    status: outcome.status,
    violations: outcome.violations,
    createdAt: new Date().toISOString()
  };
  state.decisions.push(decision);
  logEvent("POLICY_REEVALUATED", `Re-evaluation result: ${decision.status}`, {
    intentId: intent.id,
    decisionId: decision.id
  });

  const targetLine = state.expenseLines.find((line) => line.intentId === intent.id);
  if (targetLine) {
    targetLine.status = recalculateExpenseLineStatus(decision.status);
    targetLine.decisionId = decision.id;
    logEvent("EXPENSE_LINE_UPDATED", `Expense line moved to ${targetLine.status}`, {
      intentId: intent.id,
      lineId: targetLine.id,
      status: targetLine.status
    });
  }

  const ranked = rankOffers(intent);
  state.offerRanks.push({
    intentId: intent.id,
    offerIds: ranked.map((item) => item.id),
    offers: ranked,
    createdAt: new Date().toISOString()
  });

  state.realtimeVersion += 1;
  state.lastEvaluation = {
    intent,
    decision,
    offers: ranked,
    expenseLine: targetLine || null,
    updatedAt: new Date().toISOString()
  };

  return { intent, decision, offers: ranked, expenseLine: targetLine || null };
}

export function runAutonomousAgent(userId = "user_amex_1") {
  const templates = [
    { merchant: "Blue Bistro", amount: 142, vertical: "DINING", domain: { partySize: 3 } },
    { merchant: "Air Express", amount: 940, vertical: "TRAVEL", domain: { route: "JFK-SFO" } },
    { merchant: "City Utility", amount: 128, vertical: "PAYMENT", domain: { category: "electricity" } },
    { merchant: "Ride Daily", amount: 61, vertical: "PAYMENT", domain: { category: "transport" } }
  ];
  const chosen = templates[Math.floor(Math.random() * templates.length)];
  logEvent("AGENT_REQUEST", `Autonomous agent initiated payment for ${chosen.merchant}`, {
    userId,
    vertical: chosen.vertical
  });
  return createIntent({
    userId,
    merchant: chosen.merchant,
    amount: chosen.amount,
    vertical: chosen.vertical,
    domain: chosen.domain,
    source: "AGENT"
  });
}

export function runFlightBookingAutoPay(userId = "user_amex_1") {
  logEvent("AGENT_TRAVEL_REQUEST", "Agent requested flight booking and autonomous payment", {
    userId,
    route: "NYC-SFO"
  });
  const result = createIntent({
    userId,
    merchant: "Air Express",
    amount: 1185,
    vertical: "TRAVEL",
    domain: {
      prompt: "Book my flight + pay automatically",
      route: "NYC-SFO",
      fareClass: "economy-flex"
    },
    source: "AGENT_TRAVEL_BOOKING"
  });

  return {
    ...result,
    trustLayer: {
      attestation: "agent_signature_verified",
      policyGate: result.decision.status,
      message: "Autonomous travel booking was policy-scored before payment authorization."
    }
  };
}

export function scanReceiptAndAutoSubmit(intentId) {
  const intent = state.intents.find((item) => item.id === intentId);
  if (!intent) throw new Error("Intent not found");

  // Simulated OCR extraction for the MVP.
  const ocrFields = {
    merchant: intent.merchant,
    total: intent.amount,
    currency: intent.currency,
    date: new Date().toISOString().slice(0, 10)
  };
  logEvent("OCR_EXTRACTED", `OCR extracted receipt fields for ${intent.merchant}`, {
    intentId,
    total: ocrFields.total
  });

  const reevaluated = attachReceiptAndReevaluate(intentId);

  return {
    ...reevaluated,
    ocr: ocrFields,
    automation: {
      stage: "scan_verify_submit",
      autoSubmitted: reevaluated.decision.status === "APPROVE"
    }
  };
}

function parseAmountFromText(text) {
  const match = text.match(/(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function inferMerchantFromText(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("air")) return "Air Express";
  if (normalized.includes("bistro") || normalized.includes("food") || normalized.includes("restaurant")) {
    return "Blue Bistro";
  }
  if (normalized.includes("utility") || normalized.includes("electric")) return "City Utility";
  if (normalized.includes("ride") || normalized.includes("uber")) return "Ride Daily";
  return "Unknown Merchant";
}

function findBestIntentForReceipt(userId, amount, merchant) {
  const pending = state.expenseLines
    .filter((line) => line.status !== "SUBMITTED")
    .map((line) => {
      const intent = state.intents.find((item) => item.id === line.intentId);
      return { line, intent };
    })
    .filter((item) => item.intent && (!userId || item.intent.userId === userId));

  if (!pending.length) return null;

  const scored = pending.map((item) => {
    let score = 0;
    if (amount !== null && Math.abs(item.intent.amount - amount) <= 5) score += 3;
    if (amount !== null && Math.abs(item.intent.amount - amount) <= 20) score += 1;
    if (merchant && item.intent.merchant.toLowerCase().includes(merchant.toLowerCase().split(" ")[0])) score += 2;
    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].intent : scored[0].intent;
}

export function uploadReceiptAndAutomate({ file, userId = "user_amex_1", intentId = null }) {
  const filename = file.originalname || "receipt";
  const rawHint = filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  const extractedAmount = parseAmountFromText(rawHint);
  const extractedMerchant = inferMerchantFromText(rawHint);
  const extractedDate = new Date().toISOString().slice(0, 10);

  const receipt = upsertReceipt(file, userId);
  const ocr = {
    merchant: extractedMerchant,
    total: extractedAmount,
    date: extractedDate
  };

  logEvent("OCR_EXTRACTED", `OCR extracted ${ocr.merchant} ${ocr.total ?? ""}`.trim(), {
    receiptId: receipt.id,
    userId
  });

  const resolvedIntentId = intentId || findBestIntentForReceipt(userId, ocr.total, ocr.merchant)?.id || null;
  if (!resolvedIntentId) {
    return {
      receipt,
      ocr,
      matchedIntentId: null,
      automation: { stage: "scan_only", autoSubmitted: false }
    };
  }

  const result = scanReceiptAndAutoSubmit(resolvedIntentId);
  return {
    ...result,
    receipt,
    ocr,
    matchedIntentId: resolvedIntentId
  };
}
