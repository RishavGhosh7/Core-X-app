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
  ChevronRight
} from "lucide-react";
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
  { icon: Wallet, label: "Pay", color: "bg-primary-50 text-primary-600", merchant: "City Utility", amount: 132, vertical: "PAYMENT" },
  { icon: Split, label: "Split Bill", color: "bg-accent-50 text-accent-600", merchant: "Blue Bistro", amount: 165, vertical: "DINING" },
  { icon: Plane, label: "Book Travel", color: "bg-sky-50 text-sky-600", merchant: "Air Express", amount: 890, vertical: "TRAVEL" },
  { icon: Plus, label: "Add Expense", color: "bg-amber-50 text-amber-600", merchant: "Ride Daily", amount: 61, vertical: "PAYMENT" },
  { icon: Percent, label: "AI AutoPay", color: "bg-rose-50 text-rose-600", autonomous: true }
];

export default function HomePage({ backend }) {
  const { bootstrap, realtime, actions, error, lastExplanation } = backend || {};
  const totalBalance = bootstrap?.aggregates?.totalSpend
    ? Math.round(bootstrap.aggregates.totalSpend * 100)
    : cards.reduce((sum, c) => sum + c.balance, 0);
  const weeklySpend = (bootstrap?.expenseLines || []).slice(0, 3).reduce((sum, line) => sum + Number(line.amount || 0), 0) * 100;
  const liveTransactions = (bootstrap?.expenseLines || []).slice(0, 6).map((line, idx) => ({
    id: `${line.id}_${idx}`,
    merchant: line.merchant,
    category: line.vertical,
    amount: -Math.round(Number(line.amount || 0) * 100),
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

  async function handleQuickAction(action) {
    if (!actions) return;
    try {
      if (action.autonomous) {
        await actions.runAutonomousPay();
        return;
      }
      await actions.createIntent({
        userId: "user_amex_1",
        merchant: action.merchant,
        amount: action.amount,
        vertical: action.vertical
      });
    } catch (_err) {
      // error shown from backend hook
    }
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

      <div className="max-w-lg mx-auto px-5 space-y-6 mt-4">
        <div className="animate-slide-up stagger-1 bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <IndianRupee size={16} className="text-primary-600" />
              </div>
              <span className="text-sm font-medium text-surface-500">Total Balance</span>
            </div>
              <span className="text-xs font-medium text-accent-600 bg-accent-50 px-2.5 py-1 rounded-full">
                {(bootstrap?.intents || cards).length} active
              </span>
          </div>
          <p className="text-3xl font-bold text-surface-900 tracking-tight">
            {(totalBalance / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-surface-500">
                Spent this week:{" "}
                <span className="font-semibold text-surface-700">
                  {weeklySpend.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-surface-900">Your Cards</h2>
            <button className="text-xs font-medium text-primary-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex-shrink-0 w-[280px] rounded-2xl p-5 card-shine cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                style={{ background: card.gradient }}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-white/80 text-xs font-medium tracking-wider uppercase">{card.name}</span>
                  <CreditCard size={24} className="text-white/60" />
                </div>
                <p className="text-white/50 text-xs font-mono tracking-[0.2em] mb-4">**** **** **** {card.lastFour}</p>
                <p className="text-white text-lg font-semibold">
                  {(card.balance / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-slide-up stagger-3">
          <h2 className="text-base font-semibold text-surface-900 mb-3">Quick Actions</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => handleQuickAction(action)} className="flex flex-col items-center gap-2 flex-shrink-0 group">
                <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center shadow-card`}>
                  <action.icon size={20} />
                </div>
                <span className="text-[11px] font-medium text-surface-600">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="animate-slide-up stagger-4">
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
            {insights.map((insight) => {
              const Icon = iconMap[insight.icon] || TrendingUp;
              return (
                <div key={insight.id} className="bg-white rounded-xl p-3.5 shadow-card flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${insightColors[insight.type]} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{insight.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{insight.description}</p>
                  </div>
                  <ArrowRight size={16} className="text-surface-400 flex-shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="animate-slide-up stagger-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-surface-900">Offers For You</h2>
            <button className="text-xs font-medium text-primary-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
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
            <button className="text-xs font-medium text-primary-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
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
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
