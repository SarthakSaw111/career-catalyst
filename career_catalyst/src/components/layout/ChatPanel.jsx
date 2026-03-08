import React, { useState, useRef, useEffect } from "react";
import { X, Send, Trash2, Minimize2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  sendChatMessage,
  resetChatSession,
  isGeminiReady,
} from "../../services/gemini";
import { PROMPTS } from "../../services/prompts";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import LoadingDots from "../shared/LoadingDots";

export default function ChatPanel() {
  const { chatOpen, setChatOpen, geminiReady } = useApp();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Hey Sarthak! 👋 I'm your CareerCatalyst AI. Ask me anything — DSA, ML concepts, interview prep, English practice, career advice. I'm here to help you crack those top tech interviews!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      if (!geminiReady)
        throw new Error("Add your Gemini API key in Settings first!");
      const response = await sendChatMessage(
        "global-chat",
        PROMPTS.GLOBAL_CHAT,
        userMsg,
      );
      setMessages((prev) => [...prev, { role: "ai", content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ ${err.message}` },
      ]);
    }
    setLoading(false);
  };

  const handleClear = () => {
    resetChatSession("global-chat");
    setMessages([
      {
        role: "ai",
        content:
          "Chat cleared! Fresh start. What would you like to learn or practice?",
      },
    ]);
  };

  if (!chatOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-dark-900 border-l border-dark-600/50 z-50 flex flex-col animate-slide-right shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600/50">
        <div>
          <h2 className="text-base font-bold text-white">AI Assistant</h2>
          <p className="text-xs text-dark-200">
            Ask anything — I'm your learning companion
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-700 transition-all"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChatOpen(false)}
            className="p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-700 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
            >
              {msg.role === "ai" ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <p className="text-sm text-white whitespace-pre-wrap">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-dark-600/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask anything..."
            className="input-field text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-primary px-4"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
