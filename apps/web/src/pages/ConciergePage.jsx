import { ArrowLeft, MessageCircle, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function ConciergePage({ backend, onNavigate }) {
  const session = backend?.conciergeSession;
  const suggestions = session?.suggestedPrompts || [
    "Book my airport transfer and lounge",
    "What is the best way to redeem points for travel?",
    "Find premium dining experiences this weekend"
  ];
  const [promptInput, setPromptInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!session?.openingMessage || messages.length > 0) return;
    setMessages((current) => {
      if (current.some((message) => message.role === "assistant" && message.text === session.openingMessage)) {
        return current;
      }
      return [{ id: `assistant_${Date.now()}`, role: "assistant", text: session.openingMessage }, ...current];
    });
  }, [session?.openingMessage, messages.length]);

  async function handlePrompt(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return;
    const userMessage = { id: `user_${Date.now()}`, role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setIsSending(true);
    try {
      const data = await backend?.actions?.startConciergeChat?.(text);
      const assistantText = data?.replyMessage || data?.openingMessage || "Concierge is reviewing your request and will respond shortly.";
      setMessages((current) => [...current, { id: `assistant_${Date.now()}_${Math.random()}`, role: "assistant", text: assistantText }]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: `assistant_error_${Date.now()}`, role: "assistant", text: "Unable to send right now. Please try again in a moment." }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function submitCurrentPrompt() {
    if (!promptInput.trim()) return;
    const text = promptInput;
    setPromptInput("");
    await handlePrompt(text);
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-40 glass border-b border-gray-100 dark:border-surface-700/60">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate?.("home")}
            className="p-2 rounded-xl bg-white dark:bg-surface-800 shadow-card text-surface-600 dark:text-surface-300"
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400 dark:text-surface-500">American Express</p>
            <h1 className="text-lg font-semibold text-surface-900 dark:text-white">Concierge Chat</h1>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-4 space-y-4">
        <div className="bg-surface-900 text-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-300" />
            <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Premium service</p>
          </div>
          <p className="text-sm mt-2 leading-relaxed">
            {session?.openingMessage || "Welcome. Your concierge specialist is ready to help with travel, rewards, and reservations."}
          </p>
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-card p-4">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <MessageCircle size={16} className="text-primary-600" />
            Suggested prompts
          </h2>
          <div className="mt-3 space-y-2">
            {suggestions.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePrompt(prompt)}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-700 hover:bg-primary-50 transition-colors"
              >
                <p className="text-sm text-surface-800">{prompt}</p>
              </button>
            ))}
          </div>
        </div>

        {messages.length > 0 && (
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-card p-4">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Conversation</h2>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    message.role === "user" ? "bg-primary-600 text-white ml-8" : "bg-surface-50 dark:bg-surface-700 text-surface-800 mr-8"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-card p-3 flex items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="Ask concierge anything..."
            value={promptInput}
            onChange={(event) => setPromptInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitCurrentPrompt();
              }
            }}
            className="flex-1 bg-transparent text-sm px-2 py-2 outline-none text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500"
            disabled={isSending}
          />
          <button
            type="button"
            onClick={submitCurrentPrompt}
            disabled={isSending || !promptInput.trim()}
            className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

