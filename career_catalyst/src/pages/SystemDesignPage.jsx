import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Network,
  BookOpen,
  Play,
  Send,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { SD_ROADMAP } from "../data/roadmaps";
import {
  sendPrompt,
  sendChatMessage,
  resetChatSession,
} from "../services/gemini";
import { PROMPTS } from "../services/prompts";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";

export default function SystemDesignPage() {
  const { sdProgress, updateSDProgress, geminiReady } = useApp();
  const [activeMode, setActiveMode] = useState("learn"); // learn, design-session
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [sessionInput, setSessionInput] = useState("");
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  // Learn a topic
  const handleLearn = useCallback(
    async (section, topic) => {
      if (!geminiReady) return;
      setSelectedSection(section);
      setSelectedTopic(topic);
      setActiveMode("learn");
      setContent("");
      setLoading(true);
      try {
        const response = await sendPrompt(
          PROMPTS.SD_TEACH,
          `Teach me about "${topic}" in the context of "${section.title}".
         I have experience building: graph-DB recommendation engines, RAG pipelines, multi-agent systems, job recommendation with Typesense.
         Go deep — architecture diagrams (ASCII), trade-offs, scaling strategies, interview follow-ups.
         If this is a design problem, walk me through the full design process.`,
        );
        setContent(response);
        updateSDProgress((prev) => ({
          ...prev,
          topics: {
            ...prev.topics,
            [topic]: { learned: true, lastStudied: new Date().toISOString() },
          },
        }));
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady, updateSDProgress],
  );

  // Start a design session
  const startDesignSession = useCallback(
    async (section, topic) => {
      if (!geminiReady) return;
      setSelectedSection(section);
      setSelectedTopic(topic);
      setActiveMode("design-session");
      setSessionMessages([]);
      setSessionActive(true);
      resetChatSession(`sd-session-${topic}`);
      setSessionLoading(true);
      try {
        const response = await sendChatMessage(
          `sd-session-${topic}`,
          PROMPTS.SD_SESSION,
          `Start a system design interview session for: "${topic}". Present the problem and let me drive the design.`,
        );
        setSessionMessages([{ role: "ai", content: response }]);
        updateSDProgress((prev) => ({
          ...prev,
          sessionsCompleted: prev.sessionsCompleted + 1,
        }));
      } catch (err) {
        setSessionMessages([{ role: "ai", content: `⚠️ ${err.message}` }]);
      }
      setSessionLoading(false);
    },
    [geminiReady, updateSDProgress],
  );

  const handleSessionChat = useCallback(async () => {
    if (!sessionInput.trim() || sessionLoading) return;
    const msg = sessionInput.trim();
    setSessionInput("");
    setSessionMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSessionLoading(true);
    try {
      const response = await sendChatMessage(
        `sd-session-${selectedTopic}`,
        PROMPTS.SD_SESSION,
        msg,
      );
      setSessionMessages((prev) => [
        ...prev,
        { role: "ai", content: response },
      ]);
    } catch (err) {
      setSessionMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ ${err.message}` },
      ]);
    }
    setSessionLoading(false);
  }, [sessionInput, sessionLoading, selectedTopic]);

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">System Design</h1>
        <p className="text-dark-200">
          Master distributed systems, ML system design, and LLM architecture
          design.
        </p>
        <div className="flex gap-4 mt-4">
          <div className="glass-card px-4 py-2 text-sm">
            <span className="text-dark-200">Topics covered: </span>
            <span className="text-white font-semibold">
              {Object.keys(sdProgress.topics).length}
            </span>
          </div>
          <div className="glass-card px-4 py-2 text-sm">
            <span className="text-dark-200">Design sessions: </span>
            <span className="text-white font-semibold">
              {sdProgress.sessionsCompleted}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Topic sections */}
        <div className="lg:col-span-1 space-y-4">
          {SD_ROADMAP.map((section) => (
            <div key={section.id} className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-600/30">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{section.icon}</span>
                  <h3 className="text-sm font-bold text-white">
                    {section.title}
                  </h3>
                </div>
              </div>
              <div className="p-3 space-y-1">
                {section.topics.map((topic) => (
                  <div key={topic} className="flex items-center gap-2">
                    <button
                      onClick={() => handleLearn(section, topic)}
                      className="flex-1 text-left text-xs text-dark-200 hover:text-brand-indigo-light px-2 py-1.5 rounded hover:bg-dark-600/30 transition-all"
                    >
                      {topic}
                    </button>
                    <button
                      onClick={() => startDesignSession(section, topic)}
                      className="p-1 rounded text-dark-400 hover:text-brand-emerald hover:bg-dark-600/30 transition-all"
                      title="Start design session"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Content */}
        <div className="lg:col-span-2">
          {activeMode === "learn" && (
            <>
              {loading && <LoadingDots text="Generating design explanation" />}
              {content && (
                <div className="glass-card p-6 animate-fade-in">
                  <MarkdownRenderer content={content} />
                </div>
              )}
              {!content && !loading && (
                <div className="glass-card p-16 text-center">
                  <Network className="w-14 h-14 text-dark-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Select a topic to learn
                  </h3>
                  <p className="text-sm text-dark-200">
                    Or click the ▶ button to start a mock design session with
                    AI.
                  </p>
                </div>
              )}
            </>
          )}

          {activeMode === "design-session" && (
            <div className="glass-card flex flex-col h-[calc(100vh-250px)] overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-600/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-brand-emerald" />
                    Design Session: {selectedTopic}
                  </h3>
                  <p className="text-xs text-dark-300">
                    You're being interviewed. Drive the design!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveMode("learn");
                    setSessionActive(false);
                  }}
                  className="btn-ghost text-xs"
                >
                  End Session
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sessionMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
                    >
                      {msg.role === "ai" ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {sessionLoading && (
                  <div className="flex justify-start">
                    <div className="chat-bubble-ai">
                      <LoadingDots />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-dark-600/50">
                <div className="flex gap-2">
                  <input
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSessionChat()
                    }
                    placeholder="Describe your design approach..."
                    className="input-field text-sm"
                    disabled={sessionLoading}
                  />
                  <button
                    onClick={handleSessionChat}
                    disabled={sessionLoading || !sessionInput.trim()}
                    className="btn-primary px-4"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
