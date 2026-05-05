import BottomNav from "./BottomNav";

export default function Layout({ children, activeTab, onNavigate }) {
  return (
    <div className="min-h-screen bg-surface-50 gradient-mesh">
      <main className="pb-24">{children}</main>
      <BottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}
