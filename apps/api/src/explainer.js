import { policies } from "./data.js";

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const violationDetails = {
  MAX_INTENT_AMOUNT_EXCEEDED: {
    severity: "high",
    reason: "the expense amount is above your allowed single-transaction limit",
    suggestion: "reduce the amount or split the payment into policy-compliant parts"
  },
  BLOCKED_MERCHANT: {
    severity: "high",
    reason: "this merchant is blocked by your policy",
    suggestion: "use an approved merchant or request a temporary policy exception"
  },
  MISSING_RECEIPT: {
    severity: "medium",
    reason: "a receipt is required for this amount",
    suggestion: "upload a receipt to continue automated submission"
  },
  RISK_REVIEW_REQUIRED: {
    severity: "medium",
    reason: "this transaction triggered risk-review rules",
    suggestion: "confirm merchant details or wait for manual review"
  },
  NO_POLICY: {
    severity: "high",
    reason: "no active policy was found for this user",
    suggestion: "assign a policy profile before retrying"
  }
};

function buildTemplateExplanation({ intent, decision }) {
  const policy = policies.find((item) => item.userId === intent.userId);
  const violations = decision.violations || [];
  const primaryViolation = violations[0];
  const mapped = violationDetails[primaryViolation];

  if (!violations.length) {
    return {
      text: `Approved. This expense passed policy and risk checks for ${intent.merchant}.`,
      severity: "low",
      reason: "policy and risk checks passed",
      suggestion: "expense is auto-submitted to the report"
    };
  }

  if (primaryViolation === "MISSING_RECEIPT" && policy) {
    return {
      text: `Held because a receipt is required above ${policy.requiresReceiptAbove} ${intent.currency}. This expense at ${intent.merchant} needs a receipt before auto-submit.`,
      severity: "medium",
      reason: `receipt required above ${policy.requiresReceiptAbove} ${intent.currency}`,
      suggestion: "upload receipt to continue"
    };
  }

  return {
    text: `This expense violates policy because ${mapped?.reason || "one or more policy checks failed"}.`,
    severity: mapped?.severity || "medium",
    reason: mapped?.reason || violations.join(", "),
    suggestion: mapped?.suggestion || "review policy rules and retry"
  };
}

export async function explainDecision({ intent, decision, offers = [] }) {
  const fallback = buildTemplateExplanation({ intent, decision });
  const isEnabled = String(process.env.ENABLE_LLM_EXPLAINER || "false").toLowerCase() === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!isEnabled || !apiKey) {
    return {
      source: "template",
      text: fallback.text,
      severity: fallback.severity,
      reason: fallback.reason,
      suggestion: fallback.suggestion
    };
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You explain expense policy outcomes for end users. Return strict JSON with keys: text, severity, reason, suggestion. severity must be one of low|medium|high."
          },
          {
            role: "user",
            content: JSON.stringify({
              intent: {
                merchant: intent.merchant,
                amount: intent.amount,
                currency: intent.currency,
                vertical: intent.vertical
              },
              decision: {
                status: decision.status,
                violations: decision.violations,
                risk: decision.risk
              },
              topOffers: offers.slice(0, 2).map((offer) => offer.title)
            })
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      return { source: "template", text: fallback.text, severity: fallback.severity, reason: fallback.reason, suggestion: fallback.suggestion };
    }
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      source: "gpt",
      text: parsed?.text || fallback.text,
      severity: parsed?.severity || fallback.severity,
      reason: parsed?.reason || fallback.reason,
      suggestion: parsed?.suggestion || fallback.suggestion
    };
  } catch {
    return { source: "template", text: fallback.text, severity: fallback.severity, reason: fallback.reason, suggestion: fallback.suggestion };
  }
}
