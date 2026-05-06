import { useCallback, useEffect, useState } from "react";

async function parseApiResponse(response, fallbackMessage) {
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`${fallbackMessage}. Received non-JSON response from API.`);
  }
  if (!response.ok) throw new Error(data?.error || fallbackMessage);
  return data;
}

function defaultBootstrapState() {
  return {
    user: { id: "user_amex_1", name: "Rishav Ghosh" },
    aggregates: {
      totalSpend: 0,
      byVertical: { PAYMENT: 0, TRAVEL: 0, DINING: 0 },
      recentMerchants: []
    },
    intents: [],
    expenseLines: [],
    events: [],
    lastEvaluation: null,
    realtimeVersion: 0
  };
}

function mergeActionResultIntoBootstrap(previous, result) {
  if (!result?.intent || !result?.decision) return previous;
  const base = previous || defaultBootstrapState();

  const intents = [result.intent, ...(base.intents || []).filter((item) => item.id !== result.intent.id)].slice(0, 20);
  const nextExpenseLine = result.expenseLine || null;
  const expenseLines = nextExpenseLine
    ? [nextExpenseLine, ...(base.expenseLines || []).filter((item) => item.id !== nextExpenseLine.id)].slice(0, 20)
    : base.expenseLines || [];

  const nextAggregates = { ...(base.aggregates || defaultBootstrapState().aggregates) };
  if (result.intent.amount && result.intent.vertical && !base.intents?.some((item) => item.id === result.intent.id)) {
    nextAggregates.totalSpend = Number(nextAggregates.totalSpend || 0) + Number(result.intent.amount || 0);
    nextAggregates.byVertical = {
      ...(nextAggregates.byVertical || defaultBootstrapState().aggregates.byVertical),
      [result.intent.vertical]:
        Number(nextAggregates.byVertical?.[result.intent.vertical] || 0) + Number(result.intent.amount || 0)
    };
    nextAggregates.recentMerchants = [
      result.intent.merchant,
      ...(nextAggregates.recentMerchants || []).filter((item) => item !== result.intent.merchant)
    ].slice(0, 5);
  }

  return {
    ...base,
    user: base.user || defaultBootstrapState().user,
    aggregates: nextAggregates,
    intents,
    expenseLines,
    lastEvaluation: {
      intent: result.intent,
      decision: result.decision,
      offers: result.offers || [],
      expenseLine: nextExpenseLine,
      updatedAt: new Date().toISOString()
    }
  };
}

export function useBackendData() {
  const [bootstrap, setBootstrap] = useState(null);
  const [realtime, setRealtime] = useState({ version: 0, lastEvaluation: null, latestOffers: [], events: [] });
  const [error, setError] = useState("");
  const [lastExplanation, setLastExplanation] = useState(null);
  const [conciergeSession, setConciergeSession] = useState(null);
  const [cards, setCards] = useState([]);
  const [redeemedOfferIds, setRedeemedOfferIds] = useState([]);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [personalizedInsights, setPersonalizedInsights] = useState([]);

  const refreshBootstrap = useCallback(async () => {
    const response = await fetch("/api/bootstrap");
    const data = await parseApiResponse(response, "Unable to load bootstrap data");
    setBootstrap((prev) => {
      // In serverless deployments, cold starts may return empty snapshots;
      // keep richer local state rather than wiping recent action results.
      const looksReset =
        (data?.intents?.length || 0) === 0 &&
        (data?.expenseLines?.length || 0) === 0 &&
        (prev?.intents?.length || 0) > 0;
      return looksReset ? prev : data;
    });
    return data;
  }, []);

  const resetBootstrap = useCallback(async () => {
    const response = await fetch("/api/bootstrap/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1" })
    });
    await parseApiResponse(response, "Unable to reset bootstrap data");
    setBootstrap(defaultBootstrapState());
  }, []);

  const refreshRealtime = useCallback(async () => {
    const response = await fetch("/api/realtime");
    const data = await parseApiResponse(response, "Realtime sync failed");
    setRealtime((prev) => {
      const looksReset = (data?.version || 0) === 0 && (data?.events?.length || 0) === 0 && (prev?.events?.length || 0) > 0;
      return looksReset ? prev : data;
    });
    return data;
  }, []);

  useEffect(() => {
    refreshBootstrap().catch((err) => setError(err.message));
    refreshRealtime().catch(() => {});
  }, [refreshBootstrap, refreshRealtime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetBootstrap()
        .then(() => Promise.all([refreshBootstrap(), refreshRealtime()]))
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [resetBootstrap, refreshBootstrap, refreshRealtime]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshRealtime().catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [refreshRealtime]);

  const refreshCards = useCallback(async () => {
    const response = await fetch("/api/cards?userId=user_amex_1");
    const data = await parseApiResponse(response, "Unable to load cards");
    setCards(data?.items || []);
    return data?.items || [];
  }, []);

  const refreshPersonalizedInsights = useCallback(async () => {
    const response = await fetch("/api/insights/personalized?userId=user_amex_1");
    const data = await parseApiResponse(response, "Unable to load personalized insights");
    setPersonalizedInsights(Array.isArray(data?.insights) ? data.insights : []);
    return data;
  }, []);

  const resetCards = useCallback(async () => {
    const response = await fetch("/api/cards/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1" })
    });
    const data = await parseApiResponse(response, "Unable to reset cards");
    setCards(data?.items || []);
    return data?.items || [];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetCards().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [resetCards]);

  const refreshRedeemedOffers = useCallback(async () => {
    const response = await fetch("/api/rewards/redemptions?userId=user_amex_1");
    const data = await parseApiResponse(response, "Unable to load redeemed offers");
    setRedeemedOfferIds(data?.offerIds || []);
    return data?.offerIds || [];
  }, []);

  const resetRewards = useCallback(async () => {
    const response = await fetch("/api/rewards/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1" })
    });
    const data = await parseApiResponse(response, "Unable to reset rewards");
    setRedeemedOfferIds(data?.offerIds || []);
    setAvailablePoints(Number(data?.pointsBalance || 0));
    return data;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetRewards().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [resetRewards]);

  useEffect(() => {
    refreshPersonalizedInsights().catch(() => {});
  }, [refreshPersonalizedInsights]);

  const createIntent = useCallback(
    async (payload) => {
      const response = await fetch("/api/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await parseApiResponse(response, "Intent request failed");
      if (data?.explanation) setLastExplanation(data.explanation);
      setBootstrap((prev) => mergeActionResultIntoBootstrap(prev, data));
      setRealtime((prev) => ({
        ...(prev || { version: 0, lastEvaluation: null, latestOffers: [], events: [] }),
        version: (prev?.version || 0) + 1,
        lastEvaluation: {
          intent: data.intent,
          decision: data.decision,
          offers: data.offers || [],
          expenseLine: data.expenseLine || null
        },
        latestOffers: data.offers || prev?.latestOffers || []
      }));
      refreshPersonalizedInsights().catch(() => {});
      return data;
    },
    [refreshPersonalizedInsights]
  );

  const runAutonomousPay = useCallback(
    async (payload = {}) => {
      const response = await fetch("/api/agents/autonomous-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user_amex_1", ...payload })
      });
      const data = await parseApiResponse(response, "Autonomous payment failed");
      if (data?.explanation) setLastExplanation(data.explanation);
      setBootstrap((prev) => mergeActionResultIntoBootstrap(prev, data));
      setRealtime((prev) => ({
        ...(prev || { version: 0, lastEvaluation: null, latestOffers: [], events: [] }),
        version: (prev?.version || 0) + 1,
        lastEvaluation: {
          intent: data.intent,
          decision: data.decision,
          offers: data.offers || [],
          expenseLine: data.expenseLine || null
        },
        latestOffers: data.offers || prev?.latestOffers || []
      }));
      refreshPersonalizedInsights().catch(() => {});
      return data;
    },
    [refreshPersonalizedInsights]
  );

  const uploadReceipt = useCallback(
    async ({ file, intentId }) => {
      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("userId", "user_amex_1");
      if (intentId) formData.append("intentId", intentId);
      const response = await fetch("/api/expenses/scan-upload", { method: "POST", body: formData });
      const data = await parseApiResponse(response, "Receipt upload automation failed");
      if (data?.explanation) setLastExplanation(data.explanation);
      setBootstrap((prev) => mergeActionResultIntoBootstrap(prev, data));
      setRealtime((prev) => ({
        ...(prev || { version: 0, lastEvaluation: null, latestOffers: [], events: [] }),
        version: (prev?.version || 0) + 1,
        lastEvaluation: data?.intent
          ? {
              intent: data.intent,
              decision: data.decision,
              offers: data.offers || [],
              expenseLine: data.expenseLine || null
            }
          : prev?.lastEvaluation || null,
        latestOffers: data.offers || prev?.latestOffers || []
      }));
      refreshPersonalizedInsights().catch(() => {});
      return data;
    },
    [refreshPersonalizedInsights]
  );

  const autoReconcile = useCallback(
    async (intentId) => {
      const response = await fetch(`/api/expenses/${intentId}/auto-reconcile`, { method: "POST" });
      const data = await parseApiResponse(response, "Auto reconciliation failed");
      if (data?.explanation) setLastExplanation(data.explanation);
      setBootstrap((prev) => mergeActionResultIntoBootstrap(prev, data));
      setRealtime((prev) => ({
        ...(prev || { version: 0, lastEvaluation: null, latestOffers: [], events: [] }),
        version: (prev?.version || 0) + 1,
        lastEvaluation: {
          intent: data.intent,
          decision: data.decision,
          offers: data.offers || [],
          expenseLine: data.expenseLine || null
        },
        latestOffers: data.offers || prev?.latestOffers || []
      }));
      return data;
    },
    []
  );

  const scanAutoSubmit = useCallback(
    async (intentId, fallbackIntentPayload = null) => {
      let response = await fetch(`/api/expenses/${intentId}/scan-auto-submit`, { method: "POST" });
      let data;
      try {
        data = await parseApiResponse(response, "Scan and auto-submit failed");
      } catch (error) {
        const msg = String(error?.message || "").toLowerCase();
        const canRetryWithFreshIntent = msg.includes("intent not found") && fallbackIntentPayload;
        if (!canRetryWithFreshIntent) throw error;

        // Serverless cold starts can lose in-memory intents.
        // Recreate the intent from visible expense row data, then retry scan+submit.
        const created = await createIntent({
          userId: "user_amex_1",
          merchant: fallbackIntentPayload.merchant,
          amount: Number(fallbackIntentPayload.amount || 0),
          vertical: fallbackIntentPayload.vertical
        });
        if (!created?.intent?.id) {
          throw new Error("Scan and auto-submit failed. Could not recreate missing intent.");
        }
        response = await fetch(`/api/expenses/${created.intent.id}/scan-auto-submit`, { method: "POST" });
        data = await parseApiResponse(response, "Scan and auto-submit failed");
      }
      if (data?.explanation) setLastExplanation(data.explanation);
      setBootstrap((prev) => mergeActionResultIntoBootstrap(prev, data));
      setRealtime((prev) => ({
        ...(prev || { version: 0, lastEvaluation: null, latestOffers: [], events: [] }),
        version: (prev?.version || 0) + 1,
        lastEvaluation: {
          intent: data.intent,
          decision: data.decision,
          offers: data.offers || [],
          expenseLine: data.expenseLine || null
        },
        latestOffers: data.offers || prev?.latestOffers || []
      }));
      refreshPersonalizedInsights().catch(() => {});
      return data;
    },
    [createIntent, refreshPersonalizedInsights]
  );

  const redeemRewards = useCallback(async (context = "TRAVEL") => {
    const response = await fetch("/api/rewards/redeem-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1", context })
    });
    const data = await parseApiResponse(response, "Failed to load rewards redemption options");
    setAvailablePoints(Number(data.pointsBalance || 0));
    setLastExplanation({
      source: "rewards",
      severity: "low",
      text: `You have ${Number(data.pointsBalance || 0).toLocaleString("en-IN")} points ready to redeem.`,
      suggestion: data.nextBestAction || "Open offers to redeem rewards."
    });
    return data;
  }, []);

  const redeemOffer = useCallback(async (offerId) => {
    const response = await fetch(`/api/offers/${encodeURIComponent(offerId)}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1" })
    });
    const data = await parseApiResponse(response, "Failed to redeem offer");
    setRedeemedOfferIds((prev) => (prev.includes(offerId) ? prev : [offerId, ...prev]));
    setAvailablePoints(Number(data.pointsBalance || 0));
    setLastExplanation({
      source: "rewards",
      severity: "low",
      text: `Offer redeemed successfully. ${Number(data.pointsSpent || 0).toLocaleString("en-IN")} points were used.`,
      suggestion: `Remaining points: ${Number(data.pointsBalance || 0).toLocaleString("en-IN")}`
    });
    return data;
  }, []);

  const startConciergeChat = useCallback(async (topic = "premium_travel_assistance") => {
    const response = await fetch("/api/concierge/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1", topic })
    });
    const data = await parseApiResponse(response, "Failed to start concierge chat");
    setConciergeSession(data);
    setLastExplanation({
      source: "concierge",
      severity: "low",
      text: data.openingMessage || "Concierge chat is now available.",
      suggestion: "Open profile to continue the concierge conversation."
    });
    return data;
  }, []);

  const createCard = useCallback(async (payload) => {
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1", ...payload })
    });
    const data = await parseApiResponse(response, "Failed to create card");
    setCards((prev) => [data.item, ...prev]);
    return data.item;
  }, []);

  const updateCard = useCallback(async (cardId, payload) => {
    const response = await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_amex_1", ...payload })
    });
    const data = await parseApiResponse(response, "Failed to update card");
    setCards((prev) => prev.map((card) => (card.id === cardId ? data.item : card)));
    return data.item;
  }, []);

  const deleteCard = useCallback(async (cardId) => {
    const response = await fetch(`/api/cards/${cardId}?userId=user_amex_1`, { method: "DELETE" });
    if (!response.ok) {
      const raw = await response.text();
      let message = "";
      try {
        const data = raw ? JSON.parse(raw) : {};
        message = data?.error || "";
      } catch {
        message = "";
      }
      throw new Error(message || raw || "Failed to delete card");
    }
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  }, []);

  return {
    bootstrap,
    realtime,
    error,
    lastExplanation,
    conciergeSession,
    cards,
    redeemedOfferIds,
    availablePoints,
    personalizedInsights,
    actions: {
      createIntent,
      runAutonomousPay,
      uploadReceipt,
      autoReconcile,
      scanAutoSubmit,
      redeemRewards,
      redeemOffer,
      refreshRedeemedOffers,
      resetRewards,
      startConciergeChat,
      createCard,
      updateCard,
      deleteCard,
      resetCards,
      refreshCards,
      refreshPersonalizedInsights,
      resetBootstrap,
      refreshBootstrap,
      refreshRealtime
    }
  };
}
