function toCategory(vertical = "", merchant = "") {
  const v = String(vertical || "").toLowerCase();
  const m = String(merchant || "").toLowerCase();
  if (v.includes("travel") || m.includes("air") || m.includes("flight")) return "travel";
  if (v.includes("dining") || m.includes("bistro") || m.includes("restaurant")) return "dining";
  if (v.includes("payment") || m.includes("utility") || m.includes("bill")) return "payments";
  return "other";
}

function computeScores(records = []) {
  return records.reduce(
    (acc, item) => {
      const amount = Math.max(0, Number(item.amount || 0));
      const category = toCategory(item.vertical, item.merchant);
      acc.total += amount;
      acc.count += 1;
      acc.byCategory[category] = (acc.byCategory[category] || 0) + amount;
      return acc;
    },
    { total: 0, count: 0, byCategory: { travel: 0, dining: 0, payments: 0, other: 0 } }
  );
}

export function generatePersonalizedInsights({ userName = "Member", intents = [], expenseLines = [], cards = [] } = {}) {
  const recentIntents = intents.slice(0, 6);
  const recentExpenses = expenseLines.slice(0, 12);
  const currentWindow = recentExpenses.slice(0, 6);
  const previousWindow = recentExpenses.slice(6, 12);

  const currentStats = computeScores(currentWindow);
  const previousStats = computeScores(previousWindow);
  const overallStats = computeScores(recentExpenses);

  const topCategory = Object.entries(currentStats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "payments";
  const categoryLabel = { travel: "travel", dining: "dining", payments: "payments", other: "other spending" }[topCategory];

  const spendDelta = currentStats.total - previousStats.total;
  const spendDeltaPct = previousStats.total > 0 ? Math.round((spendDelta / previousStats.total) * 100) : 0;
  const avgTicket = currentStats.count > 0 ? Math.round(currentStats.total / currentStats.count) : 0;

  const cardBalances = cards.map((card) => Number(card.balance || 0) / 100);
  const minBalance = cardBalances.length ? Math.min(...cardBalances) : 0;

  const advice = [];

  advice.push({
    id: "ins_ml_top_category",
    type: "tip",
    icon: "Lightbulb",
    title: `Most active category: ${categoryLabel[0].toUpperCase()}${categoryLabel.slice(1)}`,
    description:
      topCategory === "travel"
        ? `${userName}, your recent behavior indicates frequent travel spend. You can maximize value by prioritizing flight/hotel redemptions this week.`
        : topCategory === "dining"
          ? `${userName}, dining is your strongest pattern. Use dining-linked offers first to improve your rewards yield.`
          : `${userName}, utility and bill payments are dominant. Scheduling AutoPay can reduce missed due-date risk.`,
    confidence: Math.min(0.95, 0.55 + currentStats.count * 0.04)
  });

  advice.push({
    id: "ins_ml_trend",
    type: spendDelta > 0 ? "alert" : "savings",
    icon: spendDelta > 0 ? "AlertCircle" : "TrendingUp",
    title: spendDelta > 0 ? `Spending trend up ${Math.max(spendDeltaPct, 1)}%` : "Spending trend stable or improving",
    description:
      spendDelta > 0
        ? `Your recent 6 transactions are higher than the previous window. Consider a soft cap around ${Math.max(avgTicket * 8, 25000).toLocaleString("en-IN")} INR this cycle.`
        : "Your recent spending pace is controlled versus the previous window. Keep routing transactions through the highest-benefit card.",
    confidence: 0.72
  });

  advice.push({
    id: "ins_ml_card_health",
    type: "spending",
    icon: "TrendingUp",
    title: "Card health recommendation",
    description:
      minBalance > 0
        ? `Lowest card balance is about ${Math.round(minBalance).toLocaleString("en-IN")} INR. Split larger payments to preserve available credit headroom.`
        : "No card balance trend available yet. Start with 2-3 transactions to unlock stronger recommendations.",
    confidence: 0.68
  });

  return {
    model: "behavioral-pattern-v1",
    generatedAt: new Date().toISOString(),
    stats: {
      sampleSize: overallStats.count,
      totalObservedSpend: overallStats.total
    },
    insights: advice
  };
}
