import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  User,
  Bot,
  Play,
  Square,
  Send,
  Timer,
  Star,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { sendChatMessage, resetChatSession } from "../services/gemini";
import { PROMPTS } from "../services/prompts";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";
import GenerationConfigBar from "../components/shared/GenerationConfigBar";

const INTERVIEW_TYPES = [
  {
    id: "behavioral",
    title: "Behavioral",
    icon: "🗣️",
    description: "STAR method, leadership, conflict resolution, teamwork",
    prompt: PROMPTS.INTERVIEW_BEHAVIORAL,
    color: "brand-indigo",
  },
  {
    id: "technical_ml",
    title: "Technical (ML/AI)",
    icon: "🤖",
    description: "ML concepts, deep learning, LLMs, system design for ML",
    prompt: PROMPTS.INTERVIEW_TECHNICAL,
    color: "brand-emerald",
  },
  {
    id: "coding",
    title: "Coding",
    icon: "💻",
    description: "Live coding interview with DSA problems",
    prompt: PROMPTS.INTERVIEW_CODING,
    color: "brand-amber",
  },
];

export default function InterviewPage() {
  const { geminiReady, addInterviewRecord, interviewHistory } = useApp();
  const [selectedType, setSelectedType] = useState(null);
  const [interviewActive, setInterviewActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startInterview = useCallback(
    async (type) => {
      if (!geminiReady) return;
      setSelectedType(type);
      setInterviewActive(true);
      setMessages([]);
      setTimer(0);
      setTimerActive(true);
      resetChatSession(`interview-${type.id}`);
      setLoading(true);
      try {
        const response = await sendChatMessage(
          `interview-${type.id}`,
          type.prompt,
          `Start the ${type.title} interview now. Begin with a brief introduction as the interviewer and ask the first question.`,
        );
        setMessages([{ role: "ai", content: response }]);
      } catch (err) {
        setMessages([{ role: "ai", content: `⚠️ ${err.message}` }]);
      }
      setLoading(false);
    },
    [geminiReady],
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !selectedType) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const response = await sendChatMessage(
        `interview-${selectedType.id}`,
        selectedType.prompt,
        msg,
      );
      setMessages((prev) => [...prev, { role: "ai", content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ ${err.message}` },
      ]);
    }
    setLoading(false);
  }, [input, loading, selectedType]);

  const endInterview = useCallback(async () => {
    setTimerActive(false);
    clearInterval(timerRef.current);
    setLoading(true);
    try {
      const response = await sendChatMessage(
        `interview-${selectedType.id}`,
        selectedType.prompt,
        "The interview is now over. Please provide a detailed scorecard with: 1) Overall score out of 10, 2) Strengths, 3) Areas for improvement, 4) Specific feedback on communication and English, 5) Would you hire this candidate? 6) Actionable next steps for improvement.",
      );
      setMessages((prev) => [...prev, { role: "ai", content: response }]);

      addInterviewRecord({
        type: selectedType.id,
        title: selectedType.title,
        duration: timer,
        date: new Date().toISOString(),
        messageCount: messages.length + 2,
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ ${err.message}` },
      ]);
    }
    setLoading(false);
    setInterviewActive(false);
  }, [selectedType, timer, messages, addInterviewRecord]);

  // Interview Selection Screen
  if (!interviewActive) {
    return (
      <div className="page-container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mock Interview</h1>
          <p className="text-dark-200">
            Realistic AI-powered interview simulations. Practice until you're
            confident.
          </p>
          <div className="mt-3">
            <GenerationConfigBar compact />
          </div>
        </div>

        {/* Interview Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {INTERVIEW_TYPES.map((type, i) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => startInterview(type)}
                className="topic-card w-full text-left"
              >
                <span className="text-3xl mb-3 block">{type.icon}</span>
                <h3 className="text-base font-bold text-white mb-1">
                  {type.title}
                </h3>
                <p className="text-xs text-dark-200 mb-3">{type.description}</p>
                <div className="flex items-center gap-2 text-brand-indigo-light">
                  <Play className="w-4 h-4" />
                  <span className="text-xs font-medium">Start Interview</span>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* History */}
        {interviewHistory.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">
              Interview History
            </h2>
            <div className="space-y-2">
              {[...interviewHistory]
                .reverse()
                .slice(0, 10)
                .map((record, i) => (
                  <div
                    key={i}
                    className="glass-card p-4 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-medium text-white">
                        {record.title}
                      </span>
                      <span className="text-xs text-dark-300 ml-3">
                        {new Date(record.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-dark-200">
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {formatTime(record.duration)}
                      </span>
                      <span>{record.messageCount} exchanges</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Interview Screen
  return (
    <div className="page-container flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">{selectedType.icon}</span>
          <div>
            <h2 className="text-base font-bold text-white">
              {selectedType.title} Interview
            </h2>
            <p className="text-xs text-dark-300">
              Respond naturally. Take your time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700 border border-dark-500/30">
            <Timer className="w-4 h-4 text-brand-amber" />
            <span className="text-sm font-mono text-white">
              {formatTime(timer)}
            </span>
          </div>
          <button
            onClick={endInterview}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all flex items-center gap-2"
          >
            <Square className="w-3 h-3" /> End Interview
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-brand-indigo/20" : "bg-dark-600"}`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-brand-indigo-light" />
                ) : (
                  <Bot className="w-4 h-4 text-brand-emerald" />
                )}
              </div>
              <div
                className={`max-w-[80%] ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
              >
                {msg.role === "ai" ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-brand-emerald" />
              </div>
              <div className="chat-bubble-ai">
                <LoadingDots text="Interviewer is thinking" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-dark-600/50">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Your response..."
              className="textarea-field text-sm min-h-[60px] max-h-[120px] font-sans"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 self-end"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
