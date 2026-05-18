import { useMemo, useState } from "react";
import { Camera, Upload, CheckCircle2, Clock, AlertTriangle, FileQuestion } from "lucide-react";
import { expenseCategories, monthlySpending, recentTransactions } from "../data/mockData";

const statusConfig = {
  approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Approved" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Pending" },
  flagged: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Flagged" },
  missing_receipt: { icon: FileQuestion, color: "text-orange-600", bg: "bg-orange-50", label: "Missing Receipt" }
};

export default function ExpensesPage({ backend }) {
  const [filterStatus, setFilterStatus] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const explanation = backend?.lastExplanation;

  const expenseLines = backend?.bootstrap?.expenseLines || [];
  const mappedExpenses = useMemo(() => {
    const liveExpenses = expenseLines.map((line) => ({
      id: line.id,
      merchant: line.merchant,
      category: line.vertical,
      amount: Math.round(Number(line.amount || 0)),
      date: "Live",
      status: line.status === "SUBMITTED" ? "approved" : "pending",
      intentId: line.intentId
    }));
    if (liveExpenses.length) return liveExpenses;
    return recentTransactions.map((tx) => ({
      id: `fallback_${tx.id}`,
      merchant: tx.merchant,
      category: tx.category,
      amount: Math.abs(Math.round(Number(tx.amount || 0))),
      date: tx.date || "Recent",
      status: "approved",
      intentId: null
    }));
  }, [expenseLines]);
  const totalExpenses = mappedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const flaggedCount = mappedExpenses.filter((e) => e.status === "flagged").length;
  const missingCount = mappedExpenses.filter((e) => e.status === "missing_receipt").length;
  const filteredExpenses = mappedExpenses.filter((e) => !filterStatus || e.status === filterStatus);
  void expenseCategories;
  void monthlySpending;

  async function onUpload(intentId = "") {
    if (!receiptFile || !backend?.actions) return;
    await backend.actions.uploadReceipt({ file: receiptFile, intentId });
    setReceiptFile(null);
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-40 glass border-b border-gray-100 dark:border-surface-700/60">
        <div className="max-w-[1200px] mx-auto px-5 py-4">
          <h1 className="text-xl font-semibold text-surface-900 dark:text-white">Expenses</h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 space-y-5 mt-4">
        <div className="grid grid-cols-3 gap-2.5 animate-slide-up stagger-1">
          <div className="bg-white dark:bg-surface-800 rounded-xl p-3 shadow-card">
            <p className="text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider font-medium">Total</p>
            <p className="text-lg font-bold text-surface-900 dark:text-white mt-0.5">
              {totalExpenses.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-xl p-3 shadow-card">
            <p className="text-[10px] text-red-500 uppercase tracking-wider font-medium">Flagged</p>
            <p className="text-lg font-bold text-red-600 mt-0.5">{flaggedCount}</p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-xl p-3 shadow-card">
            <p className="text-[10px] text-orange-500 uppercase tracking-wider font-medium">No Receipt</p>
            <p className="text-lg font-bold text-orange-600 mt-0.5">{missingCount}</p>
          </div>
        </div>

        <div className="animate-slide-up stagger-2">
          {explanation?.text && (
            <div className="mb-3 bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-card border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Expense Decision Explanation · {String(explanation.severity || "medium").toUpperCase()}
              </p>
              <p className="text-sm text-surface-800 mt-1">{explanation.text}</p>
              {explanation.reason && <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Reason: {explanation.reason}</p>}
              {explanation.suggestion && <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Suggestion: {explanation.suggestion}</p>}
            </div>
          )}
          <button onClick={() => setShowScanner(!showScanner)} className="w-full bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <Camera size={24} className="text-primary-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-surface-900 dark:text-white">Scan Receipt</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Auto-extract amount, merchant & category</p>
              </div>
              <Upload size={18} className="text-surface-400" />
            </div>
          </button>
          {showScanner && (
            <div className="mt-3 bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-card animate-slide-up">
              <div className="border-2 border-dashed border-primary-200 rounded-xl p-8 flex flex-col items-center gap-3 bg-primary-50/30">
                <Camera size={32} className="text-primary-400" />
                <p className="text-sm text-surface-600 dark:text-surface-300 font-medium">Upload image or PDF receipt</p>
                <input type="file" accept="image/*,.pdf,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                <button
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                  onClick={() => onUpload("")}
                  disabled={!receiptFile}
                >
                  Upload and automate
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="animate-slide-up stagger-3 flex flex-wrap gap-2">
          <button onClick={() => setFilterStatus(null)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${!filterStatus ? "bg-surface-900 text-white" : "bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300 border border-gray-200 dark:border-surface-600"}`}>
            All
          </button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? null : key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${filterStatus === key ? "bg-surface-900 text-white" : `${config.bg} ${config.color} border border-transparent`}`}
            >
              <config.icon size={12} />
              {config.label}
            </button>
          ))}
        </div>

        <div className="animate-slide-up stagger-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredExpenses.map((expense) => {
            const config = statusConfig[expense.status];
            const StatusIcon = config.icon;
            return (
              <div key={expense.id} className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-50 dark:bg-surface-700 flex items-center justify-center text-lg flex-shrink-0">🧾</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{expense.merchant}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{expense.category} · {expense.date}</p>
                      </div>
                      <p className="text-sm font-bold text-surface-900 dark:text-white flex-shrink-0">
                        {expense.amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                        <StatusIcon size={10} />
                        {config.label}
                      </span>
                      {expense.status !== "approved" && (
                        <>
                          <button className="text-[10px] px-2 py-0.5 rounded-md border border-amber-200 text-amber-700" onClick={() => backend?.actions?.autoReconcile(expense.intentId)}>
                            Verify policy
                          </button>
                          <button
                            className="text-[10px] px-2 py-0.5 rounded-md border border-primary-200 text-primary-700"
                            onClick={() =>
                              receiptFile
                                ? onUpload(expense.intentId)
                                : backend?.actions?.scanAutoSubmit(expense.intentId, {
                                    merchant: expense.merchant,
                                    amount: Number(expense.amount || 0),
                                    vertical: expense.category
                                  })
                            }
                          >
                            Scan + auto-submit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!filteredExpenses.length && <p className="text-sm text-surface-500 dark:text-surface-400">No live expenses yet. Trigger an intent from Home.</p>}
        </div>
      </div>
    </div>
  );
}
