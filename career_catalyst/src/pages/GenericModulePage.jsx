import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  MessageSquare,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Save,
  ArrowLeft,
  Edit3,
} from "lucide-react";
import { useApp } from "../context/AppContext";
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

function makeTeachPrompt(moduleTitle) {
  return `${PROMPTS._USER_CONTEXT || ""}
You are a world-class instructor teaching "${moduleTitle}".
Teach the given concept with DEEP understanding.

Rules:
- Start with intuition and motivation (WHY does this exist?)
- Mathematical formulation where relevant (use LaTeX with $ for inline, $$ for blocks)
- Visual explanations (ASCII diagrams, tables)
- MANDATORY: Include REAL, RUNNABLE code examples where applicable
- Common interview questions about this topic
- Real-world applications and when to use/not use
- Common pitfalls and misconceptions
- Use simple English but don't dumb down the content
- Be thorough — this builds deep knowledge for any interview`;
}

function makeQuizPrompt(moduleTitle) {
  return `You are a quiz question generator for "${moduleTitle}".
Generate a quiz question for the given topic.

Return JSON:
{
  "question": "The question text",
  "type": "mcq|short_answer",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The correct answer",
  "explanation": "Detailed explanation",
  "difficulty": "easy|medium|hard",
  "followUp": "A follow-up question"
}

Questions should test UNDERSTANDING, not memorization.`;
}

export default function GenericModulePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { allModules, geminiReady } = useApp();

  const moduleData = allModules.find((m) => m.slug === slug);

  const [activeMode, setActiveMode] = useState("learn");
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lastSubtopic, setLastSubtopic] = useState(null);
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
  const [progress, setProgress] = useState({ topics: {}, stats: {} });

  // Load progress
  useEffect(() => {
    if (slug) {
      setProgress(storage.getModuleProgress(slug));
    }
  }, [slug]);

  // Save progress helper
  const updateProgress = useCallback(
    (update) => {
      setProgress((prev) => {
        const next =
          typeof update === "function" ? update(prev) : { ...prev, ...update };
        storage.saveModuleProgress(slug, next);
        storage.recordActivity();
        return next;
      });
    },
    [slug],
  );

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isTopicLearned = (sectionId, topicId) => {
    return progress.topics[`${sectionId}/${topicId}`]?.learned;
  };

  // ─── Content cache key ───
  const cacheKey = (sub) =>
    `${slug}:${selectedSection?.id}:${selectedTopic?.id}:${sub}`;

  // ─── Learn ───
  const handleLearn = useCallback(
    async (section, topic, subtopic, forceRegenerate = false) => {
      if (!geminiReady) return;
      setSelectedSection(section);
      setSelectedTopic(topic);
      setLastSubtopic(subtopic);
      setActiveMode("learn");
      setContentSaved(false);

      const key = `${slug}:${section.id}:${topic.id}:${subtopic}`;

      // Check cache first (unless regenerating)
      if (!forceRegenerate) {
        const cached = await storage.getCachedContent(key);
        if (cached) {
          setContent(cached.content);
          return;
        }
      }

      setContent("");
      setLoading(true);
      try {
        const response = await sendPrompt(
          makeTeachPrompt(moduleData?.title || slug),
          `Teach me about "${subtopic}" under the topic "${topic.title}" (section: ${section.title}).
Go deep — include code examples, intuition, interview angles. Don't hold back.`,
        );
        setContent(response);

        // Cache the content
        await storage.setCachedContent(key, response, slug, subtopic);

        // Mark as learned
        updateProgress((prev) => ({
          ...prev,
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
    [geminiReady, slug, moduleData, updateProgress],
  );

  // ─── Quiz ───
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
          makeQuizPrompt(moduleData?.title || slug),
          `Generate a quiz for topic: "${topic.title}" (${section.title}).
Subtopics: ${topic.subtopics?.join(", ") || "general"}.
Test UNDERSTANDING, not memorization.`,
        );
        setQuizData(quiz);
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady, slug, moduleData],
  );

  const submitQuizAnswer = useCallback(async () => {
    if (!quizData || !quizAnswer.trim()) return;
    setLoading(true);
    try {
      const evaluation = await sendPrompt(
        "You are a quiz evaluator. Be thorough but encouraging.",
        `Question: ${quizData.question}\nCorrect Answer: ${quizData.correctAnswer}\nUser's Answer: ${quizAnswer}\n\nEvaluate the answer.`,
      );
      setQuizResult(evaluation);
    } catch (err) {
      setQuizResult(`⚠️ ${err.message}`);
    }
    setLoading(false);
  }, [quizData, quizAnswer]);

  // ─── Discuss ───
  const handleChat = useCallback(async () => {
    if (!geminiReady || !chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const sessionId = `${slug}-${selectedSection?.id}-${selectedTopic?.id}`;
      const context = `Module: ${moduleData?.title}. Topic: ${selectedTopic?.title || "General"}.`;
      const response = await sendChatMessage(
        sessionId,
        `${makeTeachPrompt(moduleData?.title || slug)}\n\n${context}`,
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
  }, [
    geminiReady,
    chatInput,
    chatLoading,
    slug,
    moduleData,
    selectedSection,
    selectedTopic,
  ]);

  if (!moduleData) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-dark-200">Module not found.</p>
        <button
          onClick={() => navigate("/modules")}
          className="btn-primary mt-4"
        >
          Back to Modules
        </button>
      </div>
    );
  }

  const roadmap = moduleData.roadmap || [];

  return (
    <div className="page-container">
      <div className="flex gap-6">
        {/* Left: Topic Tree */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{moduleData.icon}</span>
              <h1 className="text-2xl font-bold text-white">
                {moduleData.title}
              </h1>
            </div>
            <p className="text-sm text-dark-200 mb-4">
              {moduleData.description}
            </p>

            <div className="mb-3">
              <GenerationConfigBar compact />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {roadmap.map((section) => (
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
                      {section.topics?.map((topic) => (
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
                            {topic.subtopics?.map((sub) => (
                              <button
                                key={sub}
                                onClick={() => handleLearn(section, topic, sub)}
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
                                    `${slug}-${section.id}-${topic.id}`,
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

            {/* Progress stats */}
            <div className="glass-card p-4 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-200">Topics learned</span>
                <span className="text-white font-semibold">
                  {
                    Object.values(progress.topics).filter((t) => t.learned)
                      .length
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 min-w-0">
          {/* Learn Mode */}
          {activeMode === "learn" && (
            <>
              {loading && <LoadingDots text="Generating deep explanation" />}
              {content && !loading && (
                <div className="animate-fade-in space-y-3">
                  <div className="glass-card p-6">
                    <MarkdownRenderer content={content} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const key = cacheKey(lastSubtopic);
                        storage.setCachedContent(
                          key,
                          content,
                          slug,
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
                    Click any subtopic to get an in-depth AI explanation.
                    Previously generated content loads instantly from cache.
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
                      placeholder="Type your answer..."
                      className="textarea-field mt-4 min-h-[120px]"
                    />
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={submitQuizAnswer}
                      disabled={loading || !quizAnswer.trim()}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Submit
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
                  Discussing: {selectedTopic?.title || moduleData.title}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-10 h-10 text-dark-400 mx-auto mb-3" />
                    <p className="text-dark-200">
                      Ask any doubt. Get in-depth explanations.
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
