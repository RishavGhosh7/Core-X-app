import { useState } from "react";
import { Sparkles, UtensilsCrossed, Plane, ShoppingBag, Ticket, Clock, ArrowRight } from "lucide-react";
import { offers } from "../data/mockData";

const categoryConfig = {
  dining: { icon: UtensilsCrossed, color: "text-emerald-600", bg: "bg-emerald-50" },
  travel: { icon: Plane, color: "text-sky-600", bg: "bg-sky-50" },
  shopping: { icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-50" },
  entertainment: { icon: Ticket, color: "text-rose-600", bg: "bg-rose-50" }
};

const tabs = ["All", "For You", "Dining", "Travel", "Shopping", "Entertainment"];

export default function OffersPage({ backend }) {
  const [activeTab, setActiveTab] = useState("All");
  const liveOffers = backend?.realtime?.latestOffers || [];
  const sourceOffers = liveOffers.length
    ? liveOffers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        description: `Live reasons: ${offer.reasons.join(", ")}`,
        category: offer.vertical.toLowerCase() === "payment" ? "shopping" : offer.vertical.toLowerCase(),
        discount: `${offer.score} pts`,
        merchant: offer.vertical,
        expires: "Live",
        image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=600",
        isPersonalized: true
      }))
    : offers;

  const filteredOffers = sourceOffers.filter((offer) => {
    if (activeTab === "All") return true;
    if (activeTab === "For You") return offer.isPersonalized;
    return offer.category === activeTab.toLowerCase();
  });

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-40 glass border-b border-gray-100/60">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-surface-900">Offers</h1>
            <div className="flex items-center gap-1 text-xs font-medium text-gold-600 bg-gold-50 px-2.5 py-1 rounded-full">
              <Sparkles size={12} />
              {sourceOffers.filter((o) => o.isPersonalized).length} personalized
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === tab ? "bg-surface-900 text-white" : "bg-white text-surface-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-4 mt-4">
        {filteredOffers.map((offer, index) => {
          const config = categoryConfig[offer.category];
          const CategoryIcon = config?.icon || Ticket;
          return (
            <div
              key={offer.id}
              className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
            >
              <div className="h-40 overflow-hidden relative">
                <img src={offer.image} alt={offer.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-lg">
                  {offer.discount}
                </div>
                {offer.isPersonalized && (
                  <div className="absolute top-3 right-3 bg-gold-500 text-surface-900 text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                    <Sparkles size={10} />
                    FOR YOU
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-md ${config?.bg || "bg-gray-50"} flex items-center justify-center`}>
                    <CategoryIcon size={12} className={config?.color || "text-gray-600"} />
                  </div>
                  <span className="text-white/80 text-xs font-medium capitalize">{offer.category}</span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-surface-900">{offer.title}</h3>
                    <p className="text-xs text-surface-500 mt-1 leading-relaxed">{offer.description}</p>
                  </div>
                  <ArrowRight size={16} className="text-surface-400 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-surface-700">{offer.merchant}</span>
                  <span className="flex items-center gap-1 text-[10px] text-surface-400">
                    <Clock size={10} />
                    Expires {offer.expires}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredOffers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-surface-500 text-sm">No offers found for this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
