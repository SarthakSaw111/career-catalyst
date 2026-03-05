import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Languages,
  BookOpen,
  MessageSquare,
  Send,
  RefreshCw,
  PenTool,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ENGLISH_TRACKS } from "../data/roadmaps";
import {
  sendPrompt,
  sendChatMessage,
  resetChatSession,
} from "../services/gemini";
import { PROMPTS } from "../services/prompts";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";

export default function EnglishPage() {
  const { englishProgress, updateEnglishProgress, geminiReady } = useApp();
  const [activeMode, setActiveMode] = useState("tracks"); // tracks, lesson, conversation, writing
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [writingPrompt, setWritingPrompt] = useState("");
  const [writingText, setWritingText] = useState("");
  const [writingFeedback, setWritingFeedback] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Learn a topic
  const handleLearn = useCallback(
    async (track, topic) => {
      if (!geminiReady) return;
      setSelectedTrack(track);
      setSelectedTopic(topic);
      setActiveMode("lesson");
      setContent("");
      setLoading(true);
      try {
        const response = await sendPrompt(
          PROMPTS.ENGLISH_TEACH,
          `Teach me about "${topic}" from the "${track.title}" track.
         I'm an Indian tech professional preparing for interviews at top companies.
         Include: clear explanation, examples (tech context), common mistakes, practice exercises.
         Keep language simple but don't oversimplify — I want to actually learn.`,
        );
        setContent(response);
        updateEnglishProgress((prev) => ({
          ...prev,
          lessonsCompleted: prev.lessonsCompleted + 1,
        }));
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady, updateEnglishProgress],
  );

  // Start conversation practice
  const startConversation = useCallback(
    async (topic) => {
      if (!geminiReady) return;
      setActiveMode("conversation");
      setChatMessages([]);
      resetChatSession("english-conversation");
      setChatLoading(true);
      try {
        const response = await sendChatMessage(
          "english-conversation",
          PROMPTS.ENGLISH_CONVERSATION,
          `Let's practice English conversation! Topic: "${topic || "Tell me about your work experience and what you're building at your startup."}". Start with an open-ended question.`,
        );
        setChatMessages([{ role: "ai", content: response }]);
        updateEnglishProgress((prev) => ({
          ...prev,
          conversationCount: prev.conversationCount + 1,
        }));
      } catch (err) {
        setChatMessages([{ role: "ai", content: `⚠️ ${err.message}` }]);
      }
      setChatLoading(false);
    },
    [geminiReady, updateEnglishProgress],
  );

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const response = await sendChatMessage(
        "english-conversation",
        PROMPTS.ENGLISH_CONVERSATION,
        msg,
      );
      setChatMessages((prev) => [...prev, { role: "ai", content: response }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ ${err.message}` },
      ]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading]);

  // Writing practice
  const generateWritingPrompt = useCallback(async () => {
    if (!geminiReady) return;
    setActiveMode("writing");
    setWritingText("");
    setWritingFeedback("");
    setLoading(true);
    try {
      const response = await sendPrompt(
        "You generate professional writing prompts for tech professionals preparing for interviews. Return ONLY the writing prompt, nothing else.",
        "Generate a writing prompt. It could be: a professional email, a LinkedIn post, a self-introduction, explaining a technical concept, or a cover letter paragraph. Vary the type each time.",
      );
      setWritingPrompt(response);
    } catch (err) {
      setWritingPrompt(
        "Write a professional email to a hiring manager introducing yourself and expressing interest in an AI/ML Engineer position.",
      );
    }
    setLoading(false);
  }, [geminiReady]);

  const submitWriting = useCallback(async () => {
    if (!writingText.trim()) return;
    setLoading(true);
    try {
      const response = await sendPrompt(
        `You are a professional English writing coach for tech professionals. 
         Evaluate the writing for: Grammar, Vocabulary, Clarity, Professionalism, and Impact.
         Provide: corrected version, specific feedback on each error, score out of 10, tips for improvement.
         Format: Show "Original → Corrected" for each error.`,
        `Writing Prompt: ${writingPrompt}\n\nUser's Writing:\n${writingText}`,
      );
      setWritingFeedback(response);
    } catch (err) {
      setWritingFeedback(`⚠️ ${err.message}`);
    }
    setLoading(false);
  }, [writingText, writingPrompt]);

  // Tracks view (default)
  if (activeMode === "tracks") {
    return (
      <div className="page-container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">English Lab</h1>
          <p className="text-dark-200">
            Build confidence in professional English. Every interaction here
            improves your communication.
          </p>
          <div className="flex gap-4 mt-4">
            <div className="glass-card px-4 py-2 text-sm">
              <span className="text-dark-200">Lessons: </span>
              <span className="text-white font-semibold">
                {englishProgress.lessonsCompleted}
              </span>
            </div>
            <div className="glass-card px-4 py-2 text-sm">
              <span className="text-dark-200">Conversations: </span>
              <span className="text-white font-semibold">
                {englishProgress.conversationCount}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => startConversation()}
            className="btn-primary flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Start Conversation
          </button>
          <button
            onClick={generateWritingPrompt}
            className="btn-secondary flex items-center gap-2"
          >
            <PenTool className="w-4 h-4" /> Writing Practice
          </button>
        </div>

        {/* Topic Tracks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENGLISH_TRACKS.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{track.icon}</span>
                <h3 className="text-base font-bold text-white">
                  {track.title}
                </h3>
              </div>
              <div className="space-y-1">
                {track.topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleLearn(track, topic)}
                    className="w-full text-left text-xs text-dark-200 hover:text-brand-indigo-light px-3 py-2 rounded-lg hover:bg-dark-600/30 transition-all"
                  >
                    {topic}
                  </button>
                ))}
              </div>
              {track.id === "conversation" && (
                <button
                  onClick={() => startConversation(track.topics[0])}
                  className="mt-3 text-xs text-brand-indigo-light hover:text-brand-indigo font-medium"
                >
                  → Start practice conversation
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button
        onClick={() => setActiveMode("tracks")}
        className="btn-ghost text-sm mb-4"
      >
        ← Back to tracks
      </button>

      {/* Lesson */}
      {activeMode === "lesson" && (
        <>
          <h2 className="text-xl font-bold text-white mb-4">{selectedTopic}</h2>
          {loading ? (
            <LoadingDots text="Preparing lesson" />
          ) : (
            content && (
              <div className="glass-card p-6 animate-fade-in">
                <MarkdownRenderer content={content} />
              </div>
            )
          )}
        </>
      )}

      {/* Conversation */}
      {activeMode === "conversation" && (
        <div className="glass-card flex flex-col h-[calc(100vh-200px)] overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-600/50">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-indigo-light" />
              Conversation Practice
            </h3>
            <p className="text-xs text-dark-300">
              The AI will gently correct your English as you chat.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, i) => (
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="chat-bubble-ai">
                  <LoadingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-dark-600/50">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleChatSend()
                }
                placeholder="Type in English..."
                className="input-field text-sm"
                disabled={chatLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="btn-primary px-4"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Writing Practice */}
      {activeMode === "writing" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Writing Practice</h2>

          {loading && !writingPrompt ? (
            <LoadingDots text="Generating prompt" />
          ) : (
            <>
              <div className="glass-card p-4 border-brand-amber/20">
                <p className="text-xs text-brand-amber-light font-semibold mb-1">
                  Writing Prompt:
                </p>
                <p className="text-sm text-white">{writingPrompt}</p>
              </div>

              <textarea
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                placeholder="Write your response here..."
                className="textarea-field min-h-[200px] font-sans"
              />

              <div className="flex gap-3">
                <button
                  onClick={submitWriting}
                  disabled={loading || !writingText.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Get Feedback
                </button>
                <button
                  onClick={generateWritingPrompt}
                  className="btn-secondary"
                >
                  New Prompt
                </button>
              </div>

              {writingFeedback && (
                <div className="glass-card p-6 animate-fade-in">
                  <MarkdownRenderer content={writingFeedback} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
