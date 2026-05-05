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

export function useBackendData() {
  const [bootstrap, setBootstrap] = useState(null);
  const [realtime, setRealtime] = useState({ version: 0, lastEvaluation: null, latestOffers: [], events: [] });
  const [error, setError] = useState("");
  const [lastExplanation, setLastExplanation] = useState(null);

  const refreshBootstrap = useCallback(async () => {
    const response = await fetch("/api/bootstrap");
    const data = await parseApiResponse(response, "Unable to load bootstrap data");
    setBootstrap(data);
    return data;
  }, []);

  const refreshRealtime = useCallback(async () => {
    const response = await fetch("/api/realtime");
    const data = await parseApiResponse(response, "Realtime sync failed");
    setRealtime(data);
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
      await Promise.all([refreshBootstrap(), refreshRealtime()]);
      return data;
    },
    [refreshBootstrap, refreshRealtime]
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
      await Promise.all([refreshBootstrap(), refreshRealtime()]);
      return data;
    },
    [refreshBootstrap, refreshRealtime]
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
      await Promise.all([refreshBootstrap(), refreshRealtime()]);
      return data;
    },
    [refreshBootstrap, refreshRealtime]
  );

  const autoReconcile = useCallback(
    async (intentId) => {
      const response = await fetch(`/api/expenses/${intentId}/auto-reconcile`, { method: "POST" });
      const data = await parseApiResponse(response, "Auto reconciliation failed");
      if (data?.explanation) setLastExplanation(data.explanation);
      await Promise.all([refreshBootstrap(), refreshRealtime()]);
      return data;
    },
    [refreshBootstrap, refreshRealtime]
  );

  const scanAutoSubmit = useCallback(
    async (intentId) => {
      const response = await fetch(`/api/expenses/${intentId}/scan-auto-submit`, { method: "POST" });
      const data = await parseApiResponse(response, "Scan and auto-submit failed");
      if (data?.explanation) setLastExplanation(data.explanation);
      await Promise.all([refreshBootstrap(), refreshRealtime()]);
      return data;
    },
    [refreshBootstrap, refreshRealtime]
  );

  return {
    bootstrap,
    realtime,
    error,
    lastExplanation,
    actions: { createIntent, runAutonomousPay, uploadReceipt, autoReconcile, scanAutoSubmit, refreshBootstrap, refreshRealtime }
  };
}
