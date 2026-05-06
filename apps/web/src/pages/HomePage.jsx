import {
  Bell,
  CreditCard,
  IndianRupee,
  TrendingUp,
  Plane,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Wallet,
  Split,
  MapPin,
  Plus,
  Percent,
  ChevronRight,
  Sparkles,
  Gift,
  MessageCircle,
  ScanLine,
  Star,
  Pencil,
  Trash2,
  X,
  Check
} from "lucide-react";
import { useMemo, useState } from "react";
import { cards, recentTransactions, insights, offers } from "../data/mockData";

const iconMap = {
  TrendingUp,
  Plane,
  AlertCircle,
  Lightbulb
};

const insightColors = {
  spending: "bg-red-50 text-red-600",
  savings: "bg-emerald-50 text-emerald-600",
  alert: "bg-amber-50 text-amber-600",
  tip: "bg-blue-50 text-blue-600"
};

const quickActions = [
  { id: "pay", icon: Wallet, label: "Pay", color: "bg-primary-50 text-primary-600", merchant: "City Utility", amount: 132, vertical: "PAYMENT" },
  { id: "split", icon: Split, label: "Split Bill", color: "bg-accent-50 text-accent-600", merchant: "Blue Bistro", amount: 165, vertical: "DINING" },
  { id: "travel", icon: Plane, label: "Book Travel", color: "bg-sky-50 text-sky-600", merchant: "Air Express", amount: 6800, vertical: "TRAVEL" },
  { id: "expense", icon: Plus, label: "Add Expense", color: "bg-amber-50 text-amber-600", merchant: "Ride Daily", amount: 61, vertical: "PAYMENT", simulatesScan: true },
  { id: "autopay", icon: Percent, label: "AI AutoPay", color: "bg-rose-50 text-rose-600", autonomous: true }
];
const formatInr = (value) => value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const defaultUserId = "user_amex_1";

function normalizeCategory(rawCategory = "") {
  const value = String(rawCategory).toLowerCase();
  if (value.includes("dining") || value.includes("restaurant")) return "Dining";
  if (value.includes("travel") || value.includes("flight") || value.includes("transport")) return "Travel";
  if (value.includes("payment") || value.includes("bill") || value.includes("utility")) return "Payments";
  if (value.includes("shopping")) return "Shopping";
  return "Other";
}

function inferInsightCategory(insight) {
  const text = `${insight.title} ${insight.description}`.toLowerCase();
  if (text.includes("dining")) return "Dining";
  if (text.includes("travel") || text.includes("flight")) return "Travel";
  if (text.includes("payment") || text.includes("bill")) return "Payments";
  if (text.includes("shopping")) return "Shopping";
  return "All";
}

export default function HomePage({ backend, onNavigate }) {
  const { bootstrap, realtime, actions, error, lastExplanation, cards: backendCards, personalizedInsights } = backend || {};
  const liveTransactions = (bootstrap?.expenseLines || []).slice(0, 6).map((line, idx) => ({
    id: `${line.id}_${idx}`,
    merchant: line.merchant,
    category: line.vertical,
    amount: -Math.round(Number(line.amount || 0)),
    date: "Live"
  }));
  const feedTransactions = liveTransactions.length ? liveTransactions : recentTransactions;
  const liveOffers = realtime?.latestOffers?.length
    ? realtime.latestOffers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        merchant: offer.vertical,
        discount: `Score ${offer.score}`,
        image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=600"
      }))
    : offers.slice(0, 4);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [autoPayPercent, setAutoPayPercent] = useState(65);
  const [autoPayCap, setAutoPayCap] = useState(1200000);
  const [todaySpend, setTodaySpend] = useState(0);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newCard, setNewCard] = useState({ name: "", lastFour: "", balanceInr: "" });
  const [editingCardId, setEditingCardId] = useState("");
  const [editCard, setEditCard] = useState({ name: "", lastFour: "", balanceInr: "" });
  const [activeInsightId, setActiveInsightId] = useState("");
  const [selectedPaymentCardId, setSelectedPaymentCardId] = useState("");
  const cardList = Array.isArray(backendCards) && backendCards.length ? backendCards : cards;
  const totalBalance = cardList.reduce((sum, c) => sum + c.balance, 0);

  function resolveBackendCardId(cardId) {
    if (!cardId) return null;
    const id = String(cardId);
    if (id.startsWith(`${defaultUserId}_`) || id.startsWith("card_")) return id;
    return `${defaultUserId}_${id}`;
  }

  function handleNewCardInput(field, value) {
    setNewCard((current) => ({ ...current, [field]: value }));
  }

  async function handleAddCard(event) {
    event.preventDefault();
    const safeLastFour = String(newCard.lastFour || "").replace(/\D/g, "").slice(-4);
    const parsedBalance = Number(String(newCard.balanceInr || "").replace(/[^\d.]/g, ""));
    if (!newCard.name.trim() || safeLastFour.length !== 4 || !parsedBalance) return;

    try {
      await actions?.createCard?.({
        name: newCard.name.trim(),
        lastFour: safeLastFour,
        balance: Math.round(parsedBalance * 100),
        limit: Math.round(parsedBalance * 150),
        type: "custom"
      });
      await actions?.refreshCards?.();
      setNewCard({ name: "", lastFour: "", balanceInr: "" });
      setShowAddCardForm(false);
    } catch {
      // error surfaced through backend error banner if needed
    }
  }

  function beginEditCard(card) {
    setEditingCardId(card.id);
    setEditCard({
      name: card.name || "",
      lastFour: card.lastFour || "",
      balanceInr: String(Math.round(Number(card.balance || 0) / 100))
    });
  }

  async function saveEditCard(cardId) {
    const safeLastFour = String(editCard.lastFour || "").replace(/\D/g, "").slice(-4);
    const parsedBalance = Number(String(editCard.balanceInr || "").replace(/[^\d.]/g, ""));
    if (!editCard.name.trim() || safeLastFour.length !== 4 || !parsedBalance) return;
    try {
      await actions?.updateCard?.(cardId, {
        name: editCard.name.trim(),
        lastFour: safeLastFour,
        balance: Math.round(parsedBalance * 100),
        limit: Math.round(parsedBalance * 150)
      });
      await actions?.refreshCards?.();
      setEditingCardId("");
      setEditCard({ name: "", lastFour: "", balanceInr: "" });
    } catch {
      // error surfaced through backend error banner if needed
    }
  }

  async function removeCard(cardId) {
    try {
      await actions?.deleteCard?.(cardId);
      await actions?.refreshCards?.();
    } catch {
      // error surfaced through backend error banner if needed
    }
  }

  const suggestedActionId = useMemo(() => {
    const txs = feedTransactions.slice(0, 6);
    const scores = txs.reduce((acc, tx) => {
      const category = String(tx.category || "").toLowerCase();
      const amount = Math.abs(Number(tx.amount || 0));
      if (category.includes("travel") || category.includes("transport")) acc.travel = (acc.travel || 0) + amount;
      if (category.includes("dining") || category.includes("restaurant")) acc.split = (acc.split || 0) + amount;
      if (category.includes("payment") || category.includes("bill") || category.includes("utility")) acc.pay = (acc.pay || 0) + amount;
      return acc;
    }, {});

    if ((scores.travel || 0) >= Math.max(scores.split || 0, scores.pay || 0)) return "travel";
    if ((scores.split || 0) > 0) return "split";
    if ((scores.pay || 0) > 0) return "pay";
    return "pay";
  }, [feedTransactions]);

  const insightsFeed = Array.isArray(personalizedInsights) && personalizedInsights.length ? personalizedInsights : insights;
  const selectedInsight = insightsFeed.find((insight) => insight.id === activeInsightId) || null;
  const selectedInsightCategory = selectedInsight ? inferInsightCategory(selectedInsight) : "All";
  const spendingBreakdown = useMemo(() => {
    const mapped = feedTransactions.map((tx) => ({
      category: normalizeCategory(tx.category),
      amount: Math.abs(Number(tx.amount || 0))
    }));
    const filtered = selectedInsightCategory === "All" ? mapped : mapped.filter((item) => item.category === selectedInsightCategory);
    const aggregate = filtered.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});
    const rows = Object.entries(aggregate)
      .map(([category, amount]) => ({ category, amount: Number(amount) }))
      .sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    return { rows, total };
  }, [feedTransactions, selectedInsightCategory]);
  const payFromCard = useMemo(() => {
    if (!cardList.length) return null;
    if (cardList.length === 1) return cardList[0];
    return cardList.find((card) => card.id === selectedPaymentCardId) || cardList[0];
  }, [cardList, selectedPaymentCardId]);

  async function handleQuickAction(action, cardContext = null) {
    if (!actions) return;
    try {
      if (action.simulatesScan) {
        setScanFeedback(true);
        setTimeout(() => setScanFeedback(false), 1600);
      }
      const selectedCardContext = cardContext || payFromCard;
      if (action.autonomous) {
        const result = await actions.runAutonomousPay({
          sourceCardId: resolveBackendCardId(selectedCardContext?.id),
          sourceCardName: selectedCardContext?.name || null,
          sourceCardLastFour: selectedCardContext?.lastFour || null
        });
        if (result?.intent?.amount) {
          const delta = Math.round(Number(result.intent.amount || 0) * 100);
          setTodaySpend((current) => current + delta);
        }
        return;
      }
      await actions.createIntent({
        userId: defaultUserId,
        merchant: selectedCardContext ? `${selectedCardContext.name} • ${action.label}` : action.merchant,
        amount: action.amount,
        vertical: action.vertical,
        sourceCardId: resolveBackendCardId(selectedCardContext?.id)
      });
      const delta = Math.round(Number(action.amount || 0) * 100);
      setTodaySpend((current) => current + delta);
    } catch {
      // error shown from backend hook
    }
  }

  async function handleRedeemRewards() {
    try {
      await actions?.redeemRewards?.("TRAVEL");
    } catch {
      // fall through to navigation to keep flow smooth
    }
    onNavigate?.("offers");
  }

  async function handleConciergeChat() {
    try {
      await actions?.startConciergeChat?.("premium_travel_assistance");
    } catch {
      // fall through to navigation to keep flow smooth
    }
    onNavigate?.("concierge");
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-40 glass border-b border-gray-100/60">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500 font-medium">Good morning</p>
            <h1 className="text-xl font-semibold text-surface-900">Rishav Ghosh</h1>
          </div>
          <button className="relative p-2.5 rounded-xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 active:scale-95">
            <Bell size={20} className="text-surface-700" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 space-y-6 mt-4">
        <div className="animate-slide-up stagger-1 bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <IndianRupee size={16} className="text-primary-600" />
              </div>
              <span className="text-sm font-medium text-surface-500">Total Balance</span>
            </div>
              <span className="text-xs font-medium text-accent-600 bg-accent-50 px-2.5 py-1 rounded-full">
                {(bootstrap?.intents || cardList).length} active
              </span>
          </div>
          <p className="text-3xl font-bold text-surface-900 tracking-tight balance-pop-in">
            {(totalBalance / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-surface-500">
                Spent today:{" "}
                <span className="font-semibold text-surface-700">
                  {todaySpend.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-surface-900">Quick Actions</h2>
            <span className="text-[11px] font-medium text-surface-500 flex items-center gap-1">
              <Sparkles size={13} className="text-primary-600" />
              Drag a card to launch
            </span>
          </div>
          {cardList.length > 1 ? (
            <div className="mb-3 bg-white rounded-xl p-2.5 shadow-card border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-surface-700 uppercase tracking-wide">Pay from</p>
                <span className="text-[10px] text-surface-500">Used for all quick-action transactions</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {cardList.map((card) => {
                  const isSelected = payFromCard?.id === card.id;
                  return (
                    <button
                      key={`pay_source_${card.id}`}
                      type="button"
                      onClick={() => setSelectedPaymentCardId(card.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        isSelected
                          ? "bg-primary-50 text-primary-700 border-primary-200"
                          : "bg-white text-surface-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {card.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            payFromCard && (
              <div className="mb-3 bg-primary-50 text-primary-700 text-xs font-medium rounded-xl px-3 py-2 border border-primary-100">
                Primary card for quick-action transactions: <span className="font-semibold">{payFromCard.name}</span>
              </div>
            )
          )}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget(action.id);
                }}
                onDragLeave={() => setDropTarget((current) => (current === action.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  let parsedCard = draggedCard;
                  try {
                    parsedCard = JSON.parse(event.dataTransfer.getData("application/json"));
                  } catch {
                    // use fallback from state
                  }
                  setDropTarget(null);
                  handleQuickAction(action, parsedCard);
                }}
                className="flex flex-col items-center gap-2 flex-shrink-0 group quick-action-target"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center shadow-card transition-all duration-200 ${
                    dropTarget === action.id ? "ring-2 ring-primary-400 scale-105" : ""
                  } ${suggestedActionId === action.id ? "quick-action-suggested" : ""}`}
                >
                  <action.icon size={20} />
                </div>
                <span className="text-[11px] font-medium text-surface-600">{action.label}</span>
                {suggestedActionId === action.id && (
                  <span className="text-[10px] font-semibold text-primary-600 -mt-1">AI pick</span>
                )}
              </button>
            ))}
          </div>
          {draggedCard && (
            <div className="mt-3 bg-primary-50 text-primary-700 text-xs font-medium rounded-xl px-3 py-2 border border-primary-100 animate-slide-in-right">
              Drop <span className="font-semibold">{draggedCard.name}</span> on any Quick Action.
            </div>
          )}
          {scanFeedback && (
            <div className="mt-3 bg-white rounded-xl p-3 shadow-card border border-emerald-100 animate-slide-in-right">
              <div className="flex items-center gap-2 text-emerald-700">
                <ScanLine size={14} />
                <span className="text-xs font-semibold uppercase tracking-wide">Receipt scanning in progress</span>
              </div>
              <div className="scan-loader mt-2">
                <span />
              </div>
            </div>
          )}
        </div>

            <div className="animate-slide-up stagger-4 bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-surface-900">AutoPay Controls</h2>
            <button
              type="button"
              onClick={() => setAutoPayEnabled((value) => !value)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${autoPayEnabled ? "bg-primary-500" : "bg-surface-200"}`}
              aria-label="Toggle autopay"
              aria-pressed={autoPayEnabled}
            >
              <span
                className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  autoPayEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className={`mt-4 space-y-4 ${autoPayEnabled ? "" : "opacity-60"}`}>
            <label className="block">
              <div className="flex items-center justify-between text-xs font-medium text-surface-500">
                <span>Coverage target</span>
                <span className="text-surface-700">{autoPayPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={autoPayPercent}
                onChange={(event) => setAutoPayPercent(Number(event.target.value))}
                className="w-full mt-2 accent-primary-600"
                disabled={!autoPayEnabled}
              />
              <div className="mt-1 flex justify-between text-[10px] text-surface-400">
                <span>10%</span>
                <span>100%</span>
              </div>
            </label>
            <label className="block">
              <div className="flex items-center justify-between text-xs font-medium text-surface-500">
                <span>Monthly cap</span>
                <span className="text-surface-700">{formatInr(autoPayCap)}</span>
              </div>
              <input
                type="range"
                min="100000"
                max="2500000"
                step="50000"
                value={autoPayCap}
                onChange={(event) => setAutoPayCap(Number(event.target.value))}
                className="w-full mt-2 accent-accent-600"
                disabled={!autoPayEnabled}
              />
              <div className="mt-1 flex justify-between text-[10px] text-surface-400">
                <span>{formatInr(100000)}</span>
                <span>{formatInr(2500000)}</span>
              </div>
            </label>
          </div>
        </div>

            <div className="animate-slide-up stagger-4 bg-surface-900 rounded-2xl p-4 text-white shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">American Express Premium</h2>
            <span className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">Platinum</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="bg-white/10 rounded-xl p-2.5 text-left premium-action">
              <Star size={15} className="text-amber-300" />
              <p className="text-[11px] mt-1 font-medium">198,240 points</p>
            </button>
            <button
              onClick={handleRedeemRewards}
              className="bg-white/10 rounded-xl p-2.5 text-left premium-action"
            >
              <Gift size={15} className="text-primary-300" />
              <p className="text-[11px] mt-1 font-medium">Redeem rewards</p>
            </button>
            <button
              onClick={handleConciergeChat}
              className="bg-white/10 rounded-xl p-2.5 text-left premium-action"
            >
              <MessageCircle size={15} className="text-emerald-300" />
              <p className="text-[11px] mt-1 font-medium">Concierge chat</p>
            </button>
          </div>
          <p className="text-[11px] text-white/70 mt-2">
            Personalized privileges are surfaced first based on your card usage and upcoming travel.
          </p>
        </div>

            <div className="animate-slide-up stagger-5">
          {lastExplanation?.text && (
            <div className="mb-3 bg-white rounded-xl p-3.5 shadow-card border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                AI Policy Explanation · {String(lastExplanation.severity || "medium").toUpperCase()}
              </p>
              <p className="text-sm text-surface-800 mt-1">{lastExplanation.text}</p>
              {lastExplanation.suggestion && <p className="text-xs text-surface-500 mt-1">Suggestion: {lastExplanation.suggestion}</p>}
            </div>
          )}
          <h2 className="text-base font-semibold text-surface-900 mb-3">Smart Insights</h2>
          <div className="space-y-2.5">
            {insightsFeed.map((insight) => {
              const Icon = iconMap[insight.icon] || TrendingUp;
              const isActive = activeInsightId === insight.id;
              return (
                <button
                  type="button"
                  key={insight.id}
                  onClick={() => setActiveInsightId((current) => (current === insight.id ? "" : insight.id))}
                  className={`w-full text-left bg-white rounded-xl p-3.5 shadow-card flex items-start gap-3 transition-all ${
                    isActive ? "ring-2 ring-primary-200 shadow-card-hover" : ""
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${insightColors[insight.type]} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{insight.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{insight.description}</p>
                  </div>
                  <ArrowRight size={16} className={`text-surface-400 flex-shrink-0 mt-1 transition-transform ${isActive ? "translate-x-1" : ""}`} />
                </button>
              );
            })}
          </div>
          {selectedInsight && (
            <div className="mt-3 bg-white rounded-xl p-3.5 shadow-card border border-primary-100 animate-slide-up">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                  {selectedInsightCategory === "All" ? "Category spending breakdown" : `${selectedInsightCategory} spending breakdown`}
                </p>
                <button type="button" onClick={() => setActiveInsightId("")} className="text-[11px] text-surface-500 hover:text-surface-700">
                  Close
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {spendingBreakdown.rows.length ? (
                  spendingBreakdown.rows.map((row) => {
                    const width = spendingBreakdown.total ? Math.max(10, Math.round((row.amount / spendingBreakdown.total) * 100)) : 0;
                    return (
                      <div key={row.category}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-surface-700">{row.category}</span>
                          <span className="text-surface-500">{formatInr(row.amount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-surface-500">No matching transactions in recent activity yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

            <div className="animate-slide-up stagger-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-surface-900">Offers For You</h2>
            <button
              type="button"
              onClick={() => onNavigate?.("offers")}
              className="text-xs font-medium text-primary-600 flex items-center gap-0.5 hover:gap-1.5 transition-all"
            >
              See all <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
            {liveOffers.slice(0, 4).map((offer) => (
              <div key={offer.id} className="flex-shrink-0 w-[200px] bg-white rounded-xl overflow-hidden shadow-card">
                <div className="h-24 overflow-hidden relative">
                  <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {offer.discount}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-surface-900 leading-tight">{offer.title}</p>
                  <p className="text-[10px] text-surface-500 mt-1">{offer.merchant}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

            <div className="animate-slide-up stagger-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-surface-900">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigate?.("expenses")}
              className="text-xs font-medium text-primary-600 flex items-center gap-0.5 hover:gap-1.5 transition-all"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-50">
            {feedTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-surface-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{tx.merchant}</p>
                  <p className="text-xs text-surface-500">{tx.category} · {tx.date}</p>
                </div>
                <p className="text-sm font-semibold text-surface-900">
                  {tx.amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        </div>
          </div>

          <div className="animate-slide-up stagger-2 order-1 lg:order-2 lg:sticky lg:top-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-surface-900">Your Cards</h2>
              <button
                type="button"
                onClick={() => setShowAddCardForm((value) => !value)}
                className="text-xs font-medium text-primary-600 flex items-center gap-1 transition-all"
              >
                <Plus size={13} /> Add card
              </button>
            </div>
            {showAddCardForm && (
              <form onSubmit={handleAddCard} className="mb-3 bg-white rounded-xl p-3 shadow-card border border-gray-100 space-y-2">
                <input
                  value={newCard.name}
                  onChange={(event) => handleNewCardInput("name", event.target.value)}
                  placeholder="Card name (e.g. Platinum Reserve)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newCard.lastFour}
                    onChange={(event) => handleNewCardInput("lastFour", event.target.value)}
                    placeholder="Last 4 digits"
                    maxLength={4}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <input
                    value={newCard.balanceInr}
                    onChange={(event) => handleNewCardInput("balanceInr", event.target.value)}
                    placeholder="Balance (INR)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <button type="submit" className="w-full bg-primary-600 text-white text-xs font-semibold py-2 rounded-lg">
                  Save
                </button>
              </form>
            )}
            <div className="space-y-3 pb-2">
              {cardList.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(event) => {
                    setDraggedCard(card);
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("application/json", JSON.stringify(card));
                  }}
                  onDragEnd={() => {
                    setDraggedCard(null);
                    setDropTarget(null);
                  }}
                  className="w-full rounded-xl p-5 card-shine cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform duration-200 min-h-[150px]"
                  style={{ background: card.gradient }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/80 text-xs font-medium tracking-wider uppercase">{card.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginEditCard(card);
                        }}
                        className="p-1 rounded-md bg-white/10 text-white/90 hover:bg-white/20"
                        aria-label="Edit card"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeCard(card.id);
                        }}
                        className="p-1 rounded-md bg-white/10 text-white/90 hover:bg-white/20"
                        aria-label="Delete card"
                      >
                        <Trash2 size={13} />
                      </button>
                      <CreditCard size={18} className="text-white/60 ml-1" />
                    </div>
                  </div>
                  {editingCardId === card.id ? (
                    <div className="space-y-2">
                      <input
                        value={editCard.name}
                        onChange={(event) => setEditCard((current) => ({ ...current, name: event.target.value }))}
                        className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/60"
                        placeholder="Card name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editCard.lastFour}
                          onChange={(event) => setEditCard((current) => ({ ...current, lastFour: event.target.value }))}
                          maxLength={4}
                          className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/60"
                          placeholder="Last four"
                        />
                        <input
                          value={editCard.balanceInr}
                          onChange={(event) => setEditCard((current) => ({ ...current, balanceInr: event.target.value }))}
                          className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/60"
                          placeholder="INR balance"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            saveEditCard(card.id);
                          }}
                          className="px-2 py-1 rounded-md bg-white/20 text-white text-xs font-semibold"
                        >
                          <Check size={12} className="inline mr-1" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingCardId("");
                            setEditCard({ name: "", lastFour: "", balanceInr: "" });
                          }}
                          className="px-2 py-1 rounded-md bg-white/10 text-white text-xs font-semibold"
                        >
                          <X size={12} className="inline mr-1" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-white/50 text-xs font-mono tracking-[0.2em] mb-4">**** **** **** {card.lastFour}</p>
                      <p className="text-white text-lg font-semibold">
                        {(card.balance / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
