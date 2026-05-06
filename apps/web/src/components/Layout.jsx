import BottomNav from "./BottomNav";
import { CreditCard } from "lucide-react";

export default function Layout({ children, activeTab, onNavigate }) {
  return (
    <div className="min-h-screen bg-surface-50 gradient-mesh">
      <div className="fixed top-3 left-4 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/85 shadow-card border border-gray-100">
          <div className="w-6 h-6 rounded-lg bg-primary-600 text-white flex items-center justify-center">
            <CreditCard size={14} />
          </div>
          <span className="text-xs font-semibold tracking-wide text-surface-800">CORE-X</span>
        </div>
      </div>
      <main className="pb-24">{children}</main>
      <BottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}
