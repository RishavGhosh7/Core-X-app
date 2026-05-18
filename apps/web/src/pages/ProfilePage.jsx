import {
  CreditCard,
  Shield,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  MessageCircle,
  Bell,
  Eye,
  Smartphone,
  Globe,
  User,
  TrendingUp,
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { cards } from "../data/mockData";

const menuSections = [
  {
    title: "Cards & Limits",
    items: [
      { icon: CreditCard, label: "Manage Cards", detail: `${cards.length} cards`, color: "bg-primary-50 text-primary-600" },
      { icon: Eye, label: "Spending Limits", detail: "Set per-category limits", color: "bg-emerald-50 text-emerald-600" }
    ]
  },
  {
    title: "Security",
    items: [
      { icon: Shield, label: "Security Settings", detail: "2FA enabled", color: "bg-sky-50 text-sky-600" },
      { icon: Smartphone, label: "Device Management", detail: "2 devices", color: "bg-amber-50 text-amber-600" },
      { icon: Bell, label: "Notifications", detail: "Customize alerts", color: "bg-rose-50 text-rose-600" }
    ]
  },
  {
    title: "Preferences",
    items: [
      { icon: Globe, label: "Language & Region", detail: "English, India", color: "bg-teal-50 text-teal-600" },
      { icon: Settings, label: "App Settings", detail: "", color: "bg-surface-100 text-surface-600 dark:text-surface-300" },
      { icon: HelpCircle, label: "Help & Support", detail: "", color: "bg-orange-50 text-orange-600" }
    ]
  }
];

const insightIconMap = {
  TrendingUp,
  AlertCircle,
  Lightbulb
};

export default function ProfilePage({ backend }) {
  const personalizedInsights = Array.isArray(backend?.personalizedInsights) ? backend.personalizedInsights : [];
  const hasPersonalizedInsights = personalizedInsights.length > 0;
  const topInsight = hasPersonalizedInsights ? personalizedInsights[0] : null;

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-40 glass border-b border-gray-100 dark:border-surface-700/60">
        <div className="max-w-[1200px] mx-auto px-5 py-4">
          <h1 className="text-xl font-semibold text-surface-900 dark:text-white">Profile</h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 mt-4 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="animate-slide-up stagger-1 bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <User size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Rishav Ghosh</h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 dark:text-surface-500">Platinum Member since 2021</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-accent-500" />
                <span className="text-xs font-medium text-accent-600">Verified Account</span>
              </div>
            </div>
          </div>
          </div>

          <div className="animate-slide-up stagger-2">
            <button className="w-full bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <MessageCircle size={20} className="text-primary-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-surface-900 dark:text-white">AI Assistant</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 dark:text-surface-500">
                  {topInsight?.title || "Ask about spending, offers, or travel"}
                </p>
              </div>
              <ChevronRight size={16} className="text-surface-400 dark:text-surface-500" />
            </div>
            </button>
          </div>

          {hasPersonalizedInsights && (
            <div className="animate-slide-up stagger-2 bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-card space-y-2.5">
              <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 dark:text-surface-500 uppercase tracking-wider">AI Assistant Insights</p>
              {personalizedInsights.slice(0, 3).map((insight) => {
                const Icon = insightIconMap[insight.icon] || TrendingUp;
                return (
                  <div key={insight.id} className="rounded-xl border border-gray-100 dark:border-surface-700 p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white">{insight.title}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 dark:text-surface-500 mt-0.5">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {menuSections.map((section, sectionIndex) => (
            <div key={section.title} className={`animate-slide-up stagger-${sectionIndex + 3}`}>
              <h3 className="text-xs font-semibold text-surface-500 dark:text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
              <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-card overflow-hidden divide-y divide-gray-50 dark:divide-surface-700">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 dark:hover:bg-surface-700/50">
                      <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white">{item.label}</p>
                        {item.detail && <p className="text-xs text-surface-500 dark:text-surface-400 dark:text-surface-500 mt-0.5">{item.detail}</p>}
                      </div>
                      <ChevronRight size={16} className="text-surface-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="animate-slide-up pt-2 pb-4">
            <button className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:text-red-600 transition-colors">
              <LogOut size={16} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
