import { useState } from "react";
import { Search, Plane, UtensilsCrossed, ShoppingBag, Ticket, MapPin, ArrowRight, Sparkles, Filter } from "lucide-react";
import { offers, exploreCategories, aiSuggestions } from "../data/mockData";

const categoryIcons = {
  Plane,
  UtensilsCrossed,
  ShoppingBag,
  Ticket
};

const categoryColors = {
  travel: "bg-sky-50 text-sky-600 border-sky-100",
  dining: "bg-emerald-50 text-emerald-600 border-emerald-100",
  shopping: "bg-amber-50 text-amber-600 border-amber-100",
  entertainment: "bg-rose-50 text-rose-600 border-rose-100"
};

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  void searchQuery;

  const filteredOffers = offers.filter((o) => !activeCategory || o.category === activeCategory);

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-40 glass border-b border-gray-100/60">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-semibold text-surface-900 mb-3">Explore</h1>
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search restaurants, flights, hotels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-gray-200 text-sm placeholder:text-surface-400 focus:outline-none"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-surface-50">
              <Filter size={14} className="text-surface-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-6 mt-4">
        <div className="animate-slide-up stagger-1">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={16} className="text-gold-500" />
            <h2 className="text-base font-semibold text-surface-900">AI Suggestions</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex-shrink-0 w-[240px] rounded-2xl overflow-hidden bg-white shadow-card">
                <div className="h-28 overflow-hidden relative">
                  <img src={suggestion.image} alt={suggestion.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white text-sm font-semibold leading-tight">{suggestion.title}</p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-xs text-surface-500">{suggestion.description}</p>
                  <ArrowRight size={14} className="text-surface-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-slide-up stagger-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium ${!activeCategory ? "bg-surface-900 text-white" : "bg-white text-surface-600 border border-gray-200"}`}
            >
              All
            </button>
            {exploreCategories.map((cat) => {
              const Icon = categoryIcons[cat.icon] || Plane;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium ${activeCategory === cat.id ? "bg-surface-900 text-white" : "bg-white text-surface-600 border border-gray-200"}`}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <section className="animate-slide-up stagger-3">
          <div className="space-y-2.5">
            {filteredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} categoryColors={categoryColors} />
            ))}
          </div>
        </section>

        <div className="flex items-center justify-center py-4">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl shadow-card text-sm font-medium text-surface-700">
            <MapPin size={16} className="text-primary-600" />
            View on Map
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer, categoryColors }) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden flex cursor-pointer group">
      <div className="w-24 h-24 flex-shrink-0 overflow-hidden relative">
        <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${categoryColors[offer.category]}`}>
              {offer.discount}
            </span>
          </div>
          <p className="text-sm font-semibold text-surface-900 truncate">{offer.title}</p>
          <p className="text-xs text-surface-500 truncate">{offer.merchant}</p>
        </div>
        <p className="text-[10px] text-surface-400">Expires {offer.expires}</p>
      </div>
    </div>
  );
}
