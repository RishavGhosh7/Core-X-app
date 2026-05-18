import { Home, Compass, Receipt, Gift, User } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "offers", label: "Offers", icon: Gift },
  { id: "profile", label: "Profile", icon: User }
];

export default function BottomNav({ activeTab, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/60 dark:border-surface-700/60">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
              }`}
            >
              <div className={`relative p-1 rounded-lg transition-all duration-200 ${isActive ? "bg-primary-50 dark:bg-primary-900/50" : ""}`}>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`transition-all duration-200 ${isActive ? "scale-110" : ""}`}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-600 dark:bg-primary-400 rounded-full" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium transition-all duration-200 ${isActive ? "opacity-100" : "opacity-60"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
