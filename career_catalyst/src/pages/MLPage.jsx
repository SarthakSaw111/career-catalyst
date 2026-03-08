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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}
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
  const isMobile = useIsMobile();
  const [mobileShowContent, setMobileShowContent] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [activeMode, setActiveMode] = useState("learn"); // learn, quiz, discuss
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  // Quiz — multi-question
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizCount, setQuizCount] = useState(5);
  const [quizFinished, setQuizFinished] = useState(false);
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

      if (isMobile) setMobileShowContent(true);
      setContent("");
      setLoading(true);
      try {
        const response = await sendPrompt(
          PROMPTS.ML_TEACH,
          `Teach me about "${subtopic}" under the topic "${topic.title}" (section: ${section.title}).`,
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
    async (section, topic, subtopic = null) => {
      if (!geminiReady) return;
      setSelectedSection(section);
      setSelectedTopic(topic);
      setActiveMode("quiz");
      setQuizQuestions([]);
      setQuizIndex(0);
      setQuizAnswer("");
      setQuizResult(null);
      setQuizScore({ correct: 0, total: 0 });
      setQuizFinished(false);
      if (isMobile) setMobileShowContent(true);
      setLoading(true);
      try {
        const topicContext = subtopic
          ? `Generate ${quizCount} quiz questions specifically about "${subtopic}" under "${topic.title}" (${section.title}).`
          : `Generate ${quizCount} quiz questions for topic: "${topic.title}" (${section.title}).
         Subtopics: ${topic.subtopics.join(", ")}.`;
        const data = await sendPromptJSON(
          PROMPTS.ML_QUIZ,
          `${topicContext}
Generate exactly ${quizCount} questions with MIX of types (mcq, short_answer, true_false, fill_blank, code) and difficulties. Test UNDERSTANDING.`,
        );
        const questions =
          data.questions || (Array.isArray(data) ? data : [data]);
        setQuizQuestions(questions);
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady, quizCount, isMobile],
  );

  const submitQuizAnswer = useCallback(() => {
    const currentQ = quizQuestions[quizIndex];
    if (!currentQ || !quizAnswer.trim()) return;
    const correct = currentQ.correctAnswer?.toLowerCase().trim();
    const answer = quizAnswer.toLowerCase().trim();
    const isCorrect =
      answer === correct ||
      correct.includes(answer) ||
      answer.includes(correct);
    setQuizResult({
      isCorrect,
      explanation: currentQ.explanation || "No explanation provided.",
      correctAnswer: currentQ.correctAnswer,
    });
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    updateMLProgress((prev) => ({
      ...prev,
      quizzesTaken: prev.quizzesTaken + 1,
    }));
  }, [quizQuestions, quizIndex, quizAnswer, updateMLProgress]);

  const [detailedFeedback, setDetailedFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState([]);

  const requestDetailedFeedback = useCallback(async () => {
    if (feedbackLoading || !quizAnswers.length) return;
    setFeedbackLoading(true);
    try {
      const summary = quizAnswers
        .map(
          (qa, i) =>
            `Q${i + 1} [${qa.difficulty}]: ${qa.question}\nUser's answer: ${qa.userAnswer}\nCorrect: ${qa.correctAnswer}\nWas correct: ${qa.isCorrect ? "Yes" : "No"}`,
        )
        .join("\n\n");
      const feedback = await sendPrompt(
        "You are a thorough ML quiz evaluator. Analyze all answers together.",
        `Here are all quiz responses:\n\n${summary}\n\nGive:\n1. Overall assessment\n2. Feedback on wrong answers\n3. Knowledge gaps\n4. What to study next`,
      );
      setDetailedFeedback(feedback);
    } catch (err) {
      setDetailedFeedback(`⚠️ ${err.message}`);
    }
    setFeedbackLoading(false);
  }, [quizAnswers, feedbackLoading]);

  const nextQuestion = useCallback(() => {
    const currentQ = quizQuestions[quizIndex];
    if (currentQ && quizResult) {
      setQuizAnswers((prev) => [
        ...prev,
        {
          question: currentQ.question,
          userAnswer: quizAnswer,
          correctAnswer: currentQ.correctAnswer,
          isCorrect: quizResult.isCorrect,
          difficulty: currentQ.difficulty,
        },
      ]);
    }
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex((i) => i + 1);
      setQuizAnswer("");
      setQuizResult(null);
    }
  }, [quizIndex, quizQuestions, quizResult, quizAnswer]);

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
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left: Topic Tree */}
        {(!isMobile || !mobileShowContent) && (
          <div className="w-full md:w-80 md:flex-shrink-0">
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
                    <div
                      key={section.id}
                      className="glass-card overflow-hidden"
                    >
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
                                  <div
                                    key={sub}
                                    className="group flex items-center gap-1"
                                  >
                                    <button
                                      onClick={() =>
                                        handleLearn(section, topic, sub)
                                      }
                                      className="flex-1 text-left text-[11px] text-dark-300 hover:text-brand-indigo-light px-2 py-1 rounded hover:bg-dark-600/30 transition-all"
                                    >
                                      {sub}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleQuiz(section, topic, sub)
                                      }
                                      className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded bg-brand-amber/10 text-brand-amber-light hover:bg-brand-amber/20 transition-all flex-shrink-0"
                                      title={`Quiz: ${sub}`}
                                    >
                                      Q
                                    </button>
                                  </div>
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
                                      if (isMobile) setMobileShowContent(true);
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
        )}

        {/* Right: Content Area */}
        {(!isMobile || mobileShowContent) && (
          <div className="flex-1 min-w-0">
            {/* Mobile back button */}
            {isMobile && (
              <button
                onClick={() => setMobileShowContent(false)}
                className="flex items-center gap-2 text-sm text-dark-200 hover:text-white mb-3 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to topics
              </button>
            )}
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
                    <div className="glass-card p-4 md:p-6">
                      <MarkdownRenderer content={content} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      <div className="border-l border-dark-500/30 h-4 mx-1" />
                      <button
                        onClick={() =>
                          lastSubtopic &&
                          handleQuiz(
                            selectedSection,
                            selectedTopic,
                            lastSubtopic,
                          )
                        }
                        className="btn-ghost text-xs flex items-center gap-1.5"
                        disabled={loading}
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Quiz This Topic
                      </button>
                      <button
                        onClick={() => {
                          setActiveMode("discuss");
                          setChatMessages([]);
                          resetChatSession();
                        }}
                        className="btn-ghost text-xs flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Discuss
                      </button>
                    </div>
                  </div>
                )}
                {!content && !loading && (
                  <div className="glass-card p-8 md:p-16 text-center">
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
                {/* Quiz config */}
                {quizQuestions.length === 0 && !loading && (
                  <div className="glass-card p-4 md:p-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-white mb-3">
                      Quiz Settings
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <label className="text-sm text-dark-200">
                        Questions:
                      </label>
                      {[3, 5, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setQuizCount(n)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            quizCount === n
                              ? "border-brand-indigo bg-brand-indigo/15 text-brand-indigo-light"
                              : "border-dark-500/30 bg-dark-700/30 text-dark-300 hover:border-dark-400"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleQuiz(selectedSection, selectedTopic)}
                      className="btn-primary"
                    >
                      Start Quiz
                    </button>
                  </div>
                )}

                {loading && quizQuestions.length === 0 && (
                  <LoadingDots text={`Generating ${quizCount} questions`} />
                )}

                {/* Quiz finished */}
                {quizFinished && (
                  <div className="glass-card p-4 md:p-6 animate-fade-in text-center">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Quiz Complete!
                    </h3>
                    <p className="text-3xl font-bold mb-1">
                      <span className="text-brand-emerald">
                        {quizScore.correct}
                      </span>
                      <span className="text-dark-300"> / </span>
                      <span className="text-white">{quizScore.total}</span>
                    </p>
                    <p className="text-sm text-dark-200 mb-4">
                      {quizScore.correct === quizScore.total
                        ? "Perfect score! 🎉"
                        : quizScore.correct >= quizScore.total * 0.7
                          ? "Great job! 💪"
                          : "Keep practicing! 📚"}
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      {!detailedFeedback && (
                        <button
                          onClick={requestDetailedFeedback}
                          disabled={feedbackLoading}
                          className="btn-ghost text-sm flex items-center gap-2"
                        >
                          {feedbackLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                          {feedbackLoading
                            ? "Analyzing..."
                            : "Get AI Feedback on All Answers"}
                        </button>
                      )}
                      {detailedFeedback && (
                        <div className="w-full text-left mt-2 p-4 rounded-xl bg-dark-800 border border-dark-500/30">
                          <MarkdownRenderer content={detailedFeedback} />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setQuizQuestions([]);
                          setQuizFinished(false);
                          setQuizIndex(0);
                          setQuizResult(null);
                          setQuizAnswer("");
                          setQuizAnswers([]);
                          setDetailedFeedback("");
                        }}
                        className="btn-primary"
                      >
                        New Quiz
                      </button>
                    </div>
                  </div>
                )}

                {/* Current question */}
                {quizQuestions.length > 0 &&
                  !quizFinished &&
                  (() => {
                    const currentQ = quizQuestions[quizIndex];
                    if (!currentQ) return null;
                    const diffColor =
                      currentQ.difficulty === "easy"
                        ? "badge-easy"
                        : currentQ.difficulty === "hard"
                          ? "badge-hard"
                          : "badge-medium";
                    const typeLabel =
                      {
                        mcq: "Multiple Choice",
                        short_answer: "Short Answer",
                        true_false: "True/False",
                        fill_blank: "Fill in Blank",
                        code: "Code",
                      }[currentQ.type] || currentQ.type;
                    return (
                      <div className="glass-card p-4 md:p-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-dark-300">
                            Question {quizIndex + 1} of {quizQuestions.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`badge ${diffColor}`}>
                              {currentQ.difficulty}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-600/50 text-dark-200">
                              {typeLabel}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-dark-700 rounded-full h-1.5 mb-4">
                          <div
                            className="bg-brand-indigo h-1.5 rounded-full transition-all"
                            style={{
                              width: `${((quizIndex + 1) / quizQuestions.length) * 100}%`,
                            }}
                          />
                        </div>

                        <MarkdownRenderer content={currentQ.question} />

                        {(currentQ.type === "mcq" ||
                          currentQ.type === "true_false") &&
                        currentQ.options ? (
                          <div className="mt-4 space-y-2">
                            {currentQ.options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => setQuizAnswer(opt)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
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
                            placeholder={
                              currentQ.type === "fill_blank"
                                ? "Fill in the blank..."
                                : currentQ.type === "code"
                                  ? "Write your code..."
                                  : "Type your answer..."
                            }
                            className={`textarea-field mt-4 ${currentQ.type === "code" ? "font-mono min-h-[150px]" : "min-h-[100px]"}`}
                          />
                        )}

                        <div className="flex gap-3 mt-4">
                          {!quizResult ? (
                            <button
                              onClick={submitQuizAnswer}
                              disabled={!quizAnswer.trim()}
                              className="btn-primary flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Submit
                            </button>
                          ) : (
                            <button
                              onClick={nextQuestion}
                              className="btn-primary"
                            >
                              {quizIndex + 1 < quizQuestions.length
                                ? "Next Question →"
                                : "See Results"}
                            </button>
                          )}
                        </div>

                        {quizResult && (
                          <div
                            className={`mt-4 p-4 rounded-xl border animate-fade-in ${
                              quizResult.isCorrect
                                ? "bg-brand-emerald/10 border-brand-emerald/30"
                                : "bg-red-500/10 border-red-500/30"
                            }`}
                          >
                            <p className="text-sm font-semibold mb-2">
                              {quizResult.isCorrect
                                ? "✅ Correct!"
                                : `❌ Incorrect — Answer: ${quizResult.correctAnswer}`}
                            </p>
                            <p className="text-sm text-dark-200">
                              {quizResult.explanation}
                            </p>
                            {currentQ.followUp && (
                              <div className="mt-3 p-3 rounded-lg bg-brand-indigo/10 border border-brand-indigo/20">
                                <p className="text-xs text-brand-indigo-light font-semibold mb-1">
                                  Think about:
                                </p>
                                <p className="text-sm text-dark-200">
                                  {currentQ.followUp}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
        )}
      </div>
    </div>
  );
}
