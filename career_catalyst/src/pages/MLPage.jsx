import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Save,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ML_ROADMAP } from "../data/roadmaps";
import {
  sendPrompt,
  sendPromptJSON,
  sendChatMessage,
  resetChatSession,
} from "../services/gemini";
import { PROMPTS } from "../services/prompts";
import * as storage from "../store/storage";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";
import GenerationConfigBar from "../components/shared/GenerationConfigBar";
import RoadmapEditor from "../components/shared/RoadmapEditor";

export default function MLPage() {
  const { mlProgress, updateMLProgress, geminiReady } = useApp();
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [activeMode, setActiveMode] = useState("learn"); // learn, quiz, discuss
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [contentSaved, setContentSaved] = useState(false);
  const [lastSubtopic, setLastSubtopic] = useState(null);
  const [editingRoadmap, setEditingRoadmap] = useState(false);
  const [customRoadmap, setCustomRoadmap] = useState(null);

  // Load custom roadmap on mount
  useEffect(() => {
    const saved = storage.getCustomRoadmap("ml");
    if (saved) setCustomRoadmap(saved);
  }, []);

  // Use custom roadmap if available, else default
  const activeRoadmap = customRoadmap || ML_ROADMAP;

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const isTopicLearned = (sectionId, topicId) => {
    return mlProgress.topics[`${sectionId}/${topicId}`]?.learned;
  };

  // Learn a subtopic
  const handleLearn = useCallback(
    async (section, topic, subtopic, forceRegenerate = false) => {
      if (!geminiReady) return;
      setSelectedSection(section);
      setSelectedTopic(topic);
      setLastSubtopic(subtopic);
      setActiveMode("learn");
      setContentSaved(false);

      const cacheKey = `ml:${section.id}:${topic.id}:${subtopic}`;

      // Check cache first (unless regenerating)
      if (!forceRegenerate) {
        const cached = await storage.getCachedContent(cacheKey);
        if (cached) {
          setContent(cached.content);
          return;
        }
      }

      setContent("");
      setLoading(true);
      try {
        const response = await sendPrompt(
          PROMPTS.ML_TEACH,
          `Teach me about "${subtopic}" under the topic "${topic.title}" (section: ${section.title}).
         I work with LLMs, RAG pipelines, and multi-agent systems at a startup.
         Go deep — mathematical formulation, intuition, code examples (PyTorch/Python), interview angles.
         Don't hold back on the math but explain each step.`,
        );
        setContent(response);

        // Cache the content
        await storage.setCachedContent(cacheKey, response, "ml", subtopic);

        updateMLProgress((prev) => ({
          ...prev,
          conceptsLearned: prev.conceptsLearned + 1,
          topics: {
            ...prev.topics,
            [`${section.id}/${topic.id}`]: {
              ...(prev.topics[`${section.id}/${topic.id}`] || {}),
              learned: true,
              lastStudied: new Date().toISOString(),
            },
          },
        }));
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady, updateMLProgress],
  );

  // Quiz on a topic
  const handleQuiz = useCallback(
    async (section, topic) => {
      if (!geminiReady) return;
      setSelectedSection(section);
      setSelectedTopic(topic);
      setActiveMode("quiz");
      setQuizData(null);
      setQuizAnswer("");
      setQuizResult(null);
      setLoading(true);
      try {
        const quiz = await sendPromptJSON(
          PROMPTS.ML_QUIZ,
          `Generate a quiz question for topic: "${topic.title}" (${section.title}).
         Subtopics: ${topic.subtopics.join(", ")}.
         Make it test UNDERSTANDING, not memorization. Include "why" questions.`,
        );
        setQuizData(quiz);
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady],
  );

  const submitQuizAnswer = useCallback(async () => {
    if (!quizData || !quizAnswer.trim()) return;
    setLoading(true);
    try {
      const evaluation = await sendPrompt(
        `You are an ML quiz evaluator. Be thorough but encouraging.`,
        `Question: ${quizData.question}\nCorrect Answer: ${quizData.correctAnswer}\nUser's Answer: ${quizAnswer}\n\nEvaluate the user's answer. Is it correct? What's missing? Give detailed explanation.`,
      );
      setQuizResult(evaluation);
      updateMLProgress((prev) => ({
        ...prev,
        quizzesTaken: prev.quizzesTaken + 1,
      }));
    } catch (err) {
      setQuizResult(`⚠️ ${err.message}`);
    }
    setLoading(false);
  }, [quizData, quizAnswer, updateMLProgress]);

  // Discussion about a topic
  const handleChat = useCallback(async () => {
    if (!geminiReady || !chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const sessionId = selectedTopic
        ? `ml-${selectedSection.id}-${selectedTopic.id}`
        : "ml-general";
      const context = selectedTopic
        ? `Topic: ${selectedTopic.title} under ${selectedSection.title}. Subtopics: ${selectedTopic.subtopics.join(", ")}.`
        : "General ML/AI discussion.";
      const response = await sendChatMessage(
        sessionId,
        `${PROMPTS.ML_TEACH}\n\n${context}`,
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
  }, [geminiReady, chatInput, chatLoading, selectedSection, selectedTopic]);

  return (
    <div className="page-container">
      <div className="flex gap-6">
        {/* Left: Topic Tree */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6">
            <h1 className="text-2xl font-bold text-white mb-2">ML & AI</h1>
            <p className="text-sm text-dark-200 mb-3">
              Deep knowledge that builds your foundation for any interview.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setEditingRoadmap(!editingRoadmap)}
                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all border
                  ${
                    editingRoadmap
                      ? "bg-brand-amber/15 border-brand-amber/30 text-brand-amber"
                      : "bg-dark-700/50 border-dark-500/30 text-dark-300 hover:text-white"
                  }`}
              >
                <Edit3 className="w-3 h-3" />{" "}
                {editingRoadmap ? "Stop Editing" : "Edit Roadmap"}
              </button>
              {customRoadmap && (
                <button
                  onClick={() => {
                    storage.resetRoadmapToDefault("ml");
                    setCustomRoadmap(null);
                    setEditingRoadmap(false);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-300 hover:text-white flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Default
                </button>
              )}
            </div>

            {editingRoadmap ? (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                <RoadmapEditor
                  roadmap={activeRoadmap}
                  onChange={(updated) => setCustomRoadmap(updated)}
                  moduleTitle="ML & AI"
                  format="nested"
                  onSave={() => {
                    storage.saveCustomRoadmap(
                      "ml",
                      customRoadmap || activeRoadmap,
                    );
                    setEditingRoadmap(false);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {activeRoadmap.map((section) => (
                  <div key={section.id} className="glass-card overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-600/30 transition-all"
                    >
                      <span className="text-lg">{section.icon}</span>
                      <span className="text-sm font-semibold text-white flex-1 text-left">
                        {section.title}
                      </span>
                      {expandedSections[section.id] ? (
                        <ChevronDown className="w-4 h-4 text-dark-300" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-dark-300" />
                      )}
                    </button>

                    {expandedSections[section.id] && (
                      <div className="px-3 pb-3 space-y-1 animate-fade-in">
                        {section.topics.map((topic) => (
                          <div key={topic.id}>
                            <div className="flex items-center gap-2 px-3 py-2">
                              {isTopicLearned(section.id, topic.id) ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald flex-shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-dark-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-medium text-dark-200">
                                {topic.title}
                              </span>
                            </div>
                            <div className="ml-8 space-y-0.5">
                              {topic.subtopics.map((sub) => (
                                <button
                                  key={sub}
                                  onClick={() =>
                                    handleLearn(section, topic, sub)
                                  }
                                  className="w-full text-left text-[11px] text-dark-300 hover:text-brand-indigo-light px-2 py-1 rounded hover:bg-dark-600/30 transition-all"
                                >
                                  {sub}
                                </button>
                              ))}
                              <div className="flex gap-1 mt-1 px-2">
                                <button
                                  onClick={() => handleQuiz(section, topic)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-brand-amber/10 text-brand-amber-light hover:bg-brand-amber/20 transition-all"
                                >
                                  Quiz
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSection(section);
                                    setSelectedTopic(topic);
                                    setActiveMode("discuss");
                                    setChatMessages([]);
                                    resetChatSession(
                                      `ml-${section.id}-${topic.id}`,
                                    );
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-brand-indigo/10 text-brand-indigo-light hover:bg-brand-indigo/20 transition-all"
                                >
                                  Discuss
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="glass-card p-4 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-200">Concepts learned</span>
                <span className="text-white font-semibold">
                  {mlProgress.conceptsLearned}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-dark-200">Quizzes taken</span>
                <span className="text-white font-semibold">
                  {mlProgress.quizzesTaken}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 min-w-0">
          {/* AI Config */}
          <div className="mb-4">
            <GenerationConfigBar compact />
          </div>

          {/* Learn Mode */}
          {activeMode === "learn" && (
            <>
              {loading && <LoadingDots text="Generating deep explanation" />}
              {content && (
                <div className="animate-fade-in space-y-3">
                  <div className="glass-card p-6">
                    <MarkdownRenderer content={content} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const cacheKey = `ml:${selectedSection?.id}:${selectedTopic?.id}:${lastSubtopic}`;
                        storage.setCachedContent(
                          cacheKey,
                          content,
                          "ml",
                          lastSubtopic,
                        );
                        setContentSaved(true);
                        setTimeout(() => setContentSaved(false), 2000);
                      }}
                      className="btn-ghost text-xs flex items-center gap-1.5"
                    >
                      {contentSaved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {contentSaved ? "Saved!" : "Save"}
                    </button>
                    <button
                      onClick={() =>
                        lastSubtopic &&
                        handleLearn(
                          selectedSection,
                          selectedTopic,
                          lastSubtopic,
                          true,
                        )
                      }
                      className="btn-ghost text-xs flex items-center gap-1.5"
                      disabled={loading}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                  </div>
                </div>
              )}
              {!content && !loading && (
                <div className="glass-card p-16 text-center">
                  <BookOpen className="w-14 h-14 text-dark-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Select a topic from the left
                  </h3>
                  <p className="text-sm text-dark-200">
                    Click any subtopic to get an in-depth AI explanation with
                    math, code, and interview angles.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Quiz Mode */}
          {activeMode === "quiz" && (
            <div className="space-y-4">
              {loading && !quizData && <LoadingDots text="Generating quiz" />}
              {quizData && (
                <div className="glass-card p-6 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-brand-amber" />
                    <h3 className="text-lg font-bold text-white">
                      Quiz: {selectedTopic?.title}
                    </h3>
                    <span
                      className={`badge ${quizData.difficulty === "easy" ? "badge-easy" : quizData.difficulty === "medium" ? "badge-medium" : "badge-hard"}`}
                    >
                      {quizData.difficulty}
                    </span>
                  </div>

                  <MarkdownRenderer content={quizData.question} />

                  {quizData.type === "mcq" && quizData.options ? (
                    <div className="mt-4 space-y-2">
                      {quizData.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => setQuizAnswer(opt)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm
                            ${
                              quizAnswer === opt
                                ? "border-brand-indigo bg-brand-indigo/10 text-white"
                                : "border-dark-500/30 bg-dark-700/30 text-dark-200 hover:border-dark-400"
                            }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={quizAnswer}
                      onChange={(e) => setQuizAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="textarea-field mt-4 min-h-[120px]"
                    />
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={submitQuizAnswer}
                      disabled={loading || !quizAnswer.trim()}
                      className="btn-primary flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Submit Answer
                    </button>
                    <button
                      onClick={() => handleQuiz(selectedSection, selectedTopic)}
                      className="btn-secondary"
                    >
                      New Question
                    </button>
                  </div>

                  {quizResult && (
                    <div className="mt-4 p-4 rounded-xl bg-dark-800 border border-dark-500/30 animate-fade-in">
                      <MarkdownRenderer content={quizResult} />
                      {quizData.followUp && (
                        <div className="mt-3 p-3 rounded-lg bg-brand-indigo/10 border border-brand-indigo/20">
                          <p className="text-xs text-brand-indigo-light font-semibold mb-1">
                            Follow-up to think about:
                          </p>
                          <p className="text-sm text-dark-200">
                            {quizData.followUp}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Discuss Mode */}
          {activeMode === "discuss" && (
            <div className="glass-card flex flex-col h-[calc(100vh-200px)] overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-600/50">
                <h3 className="text-sm font-bold text-white">
                  Discussing: {selectedTopic?.title || "General ML/AI"}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-10 h-10 text-dark-400 mx-auto mb-3" />
                    <p className="text-dark-200">
                      Ask any doubt about {selectedTopic?.title}.
                    </p>
                    <p className="text-xs text-dark-300 mt-1">
                      Get in-depth explanations with math and code.
                    </p>
                  </div>
                )}
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
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
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
              </div>
              <div className="p-4 border-t border-dark-600/50">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleChat()
                    }
                    placeholder="Ask your doubt..."
                    className="input-field text-sm"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={handleChat}
                    disabled={chatLoading || !chatInput.trim()}
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
