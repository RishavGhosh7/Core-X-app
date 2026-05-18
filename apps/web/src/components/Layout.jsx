import BottomNav from "./BottomNav";
import { CreditCard, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Layout({ children, activeTab, onNavigate }) {
  const { dark, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 gradient-mesh">
      <div className="fixed top-3 left-4 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/85 dark:bg-surface-800/85 shadow-card border border-gray-100 dark:border-surface-700">
          <div className="w-6 h-6 rounded-lg bg-primary-600 text-white flex items-center justify-center">
            <CreditCard size={14} />
          </div>
          <span className="text-xs font-semibold tracking-wide text-surface-800 dark:text-surface-100">CORE-X</span>
        </div>
      </div>
      <div className="fixed top-3 right-4 z-50">
        <button
          onClick={toggle}
          className="p-1.5 rounded-xl bg-white/85 dark:bg-surface-800/85 shadow-card border border-gray-100 dark:border-surface-700"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-surface-600" />}
        </button>
      </div>
      <main className="pb-24">{children}</main>
      <BottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}
