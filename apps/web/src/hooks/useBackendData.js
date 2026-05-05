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
    const id = setInterval(() => {
      refreshRealtime().catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [refreshRealtime]);

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
      return data;
    },
    []
  );

  const runAutonomousPay = useCallback(
    async () => {
      const response = await fetch("/api/agents/autonomous-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user_amex_1" })
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
      return data;
    },
    []
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
      return data;
    },
    []
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
      return data;
    },
    [createIntent]
  );

  return {
    bootstrap,
    realtime,
    error,
    lastExplanation,
    actions: { createIntent, runAutonomousPay, uploadReceipt, autoReconcile, scanAutoSubmit, refreshBootstrap, refreshRealtime }
  };
}
