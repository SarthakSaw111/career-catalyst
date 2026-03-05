import React, { useState, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  Code2,
  Lightbulb,
  Play,
  Send,
  RefreshCw,
  CheckCircle2,
  Save,
  Download,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  sendPrompt,
  sendPromptJSON,
  sendChatMessage,
  resetChatSession,
} from "../../services/gemini";
import { PROMPTS } from "../../services/prompts";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import LoadingDots from "../shared/LoadingDots";
import GenerationConfigBar from "../shared/GenerationConfigBar";

const SAVED_CONTENT_KEY = "cc_saved_content";

function getSavedContent(topicId, type) {
  try {
    const all = JSON.parse(localStorage.getItem(SAVED_CONTENT_KEY) || "{}");
    return all[`${topicId}_${type}`] || null;
  } catch {
    return null;
  }
}

function saveContent(topicId, type, content) {
  try {
    const all = JSON.parse(localStorage.getItem(SAVED_CONTENT_KEY) || "{}");
    all[`${topicId}_${type}`] = { content, savedAt: new Date().toISOString() };
    localStorage.setItem(SAVED_CONTENT_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Save error:", e);
  }
}

export default function DSATopicView({ topic, onBack }) {
  const { dsaProgress, updateDSAProgress, geminiReady } = useApp();
  const [activeTab, setActiveTab] = useState("learn"); // learn, practice, chat
  const [learnContent, setLearnContent] = useState("");
  const [learnLoading, setLearnLoading] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [problemLoading, setProblemLoading] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintContent, setHintContent] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [contentSaved, setContentSaved] = useState(false);

  // Load previously saved content when concept changes
  useEffect(() => {
    if (selectedConcept) {
      const saved = getSavedContent(topic.id, `learn_${selectedConcept}`);
      if (saved && !learnContent) {
        setLearnContent(saved.content);
      }
    }
  }, [selectedConcept]);

  const topicProgress = dsaProgress.topics[topic.id] || {
    conceptLearned: false,
    problemsSolved: 0,
    problems: [],
  };

  // Learn a concept
  const handleLearn = useCallback(
    async (concept) => {
      if (!geminiReady) return;
      setSelectedConcept(concept);
      setLearnLoading(true);
      setLearnContent("");
      try {
        const response = await sendPrompt(
          PROMPTS.DSA_TEACH,
          `Teach me about "${concept}" in the context of "${topic.title}". 
         Start from basics, build up to interview-level understanding.
         Include Python code examples and time/space complexity analysis.`,
        );
        setLearnContent(response);

        // Mark concept as learned
        updateDSAProgress((prev) => ({
          ...prev,
          topics: {
            ...prev.topics,
            [topic.id]: {
              ...topicProgress,
              conceptLearned: true,
              lastStudied: new Date().toISOString(),
            },
          },
        }));
      } catch (err) {
        setLearnContent(`⚠️ Error: ${err.message}`);
      }
      setLearnLoading(false);
    },
    [geminiReady, topic, topicProgress, updateDSAProgress],
  );

  // Generate a practice problem
  const handleGenerateProblem = useCallback(async () => {
    if (!geminiReady) return;
    setProblemLoading(true);
    setCurrentProblem(null);
    setUserCode("");
    setEvaluation("");
    setShowHint(false);
    setShowSolution(false);
    setHintContent("");
    try {
      const problem = await sendPromptJSON(
        PROMPTS.DSA_GENERATE_PROBLEM,
        `Generate a ${difficulty} difficulty problem for topic: "${topic.title}".
         Concepts: ${topic.concepts.join(", ")}.
         Make it similar to actual Google/FAANG interview questions.
         Previously solved: ${topicProgress.problems?.map((p) => p.title).join(", ") || "none"}.
         Generate a DIFFERENT problem from the previously solved ones.`,
      );
      setCurrentProblem(problem);
    } catch (err) {
      setCurrentProblem({
        title: "Error",
        description: `Failed to generate problem: ${err.message}. Try again.`,
      });
    }
    setProblemLoading(false);
  }, [geminiReady, difficulty, topic, topicProgress]);

  // Evaluate user's code
  const handleEvaluate = useCallback(async () => {
    if (!geminiReady || !userCode.trim() || !currentProblem) return;
    setEvalLoading(true);
    setEvaluation("");
    try {
      const response = await sendPrompt(
        PROMPTS.DSA_EVALUATE_CODE,
        `Problem: ${currentProblem.title}\n\nDescription: ${currentProblem.description}\n\nUser's Solution:\n\`\`\`python\n${userCode}\n\`\`\`\n\nEvaluate this solution thoroughly.`,
      );
      setEvaluation(response);

      // Record problem as attempted
      updateDSAProgress((prev) => {
        const existing = prev.topics[topic.id] || {
          conceptLearned: false,
          problemsSolved: 0,
          problems: [],
        };
        const alreadySolved = existing.problems?.find(
          (p) => p.title === currentProblem.title,
        );
        return {
          ...prev,
          totalSolved: alreadySolved ? prev.totalSolved : prev.totalSolved + 1,
          topics: {
            ...prev.topics,
            [topic.id]: {
              ...existing,
              problemsSolved: alreadySolved
                ? existing.problemsSolved
                : existing.problemsSolved + 1,
              problems: alreadySolved
                ? existing.problems
                : [
                    ...(existing.problems || []),
                    {
                      title: currentProblem.title,
                      difficulty,
                      solvedAt: new Date().toISOString(),
                    },
                  ],
            },
          },
        };
      });
    } catch (err) {
      setEvaluation(`⚠️ Error: ${err.message}`);
    }
    setEvalLoading(false);
  }, [
    geminiReady,
    userCode,
    currentProblem,
    topic,
    difficulty,
    updateDSAProgress,
  ]);

  // Get hint
  const handleGetHint = useCallback(async () => {
    if (!geminiReady || !currentProblem) return;
    setHintLoading(true);
    setShowHint(true);
    try {
      const response = await sendPrompt(
        PROMPTS.DSA_HINT,
        `Problem: ${currentProblem.title}\n${currentProblem.description}\n\nGive me a progressive hint.`,
      );
      setHintContent(response);
    } catch (err) {
      setHintContent(`⚠️ ${err.message}`);
    }
    setHintLoading(false);
  }, [geminiReady, currentProblem]);

  // Chat about this topic
  const handleChatSend = useCallback(async () => {
    if (!geminiReady || !chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const response = await sendChatMessage(
        `dsa-${topic.id}`,
        `${PROMPTS.DSA_TEACH}\n\nCurrent topic: ${topic.title}. Concepts: ${topic.concepts.join(", ")}. Have a focused discussion about this DSA topic. Answer questions, explain doubts, give examples.`,
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
  }, [geminiReady, chatInput, chatLoading, topic]);

  const tabs = [
    { id: "learn", label: "Learn", icon: BookOpen },
    { id: "practice", label: "Practice", icon: Code2 },
    { id: "chat", label: "Discuss", icon: Lightbulb },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-dark-700 text-dark-200 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{topic.icon}</span>
            <h1 className="text-2xl font-bold text-white">{topic.title}</h1>
          </div>
          <p className="text-sm text-dark-200 mt-1">{topic.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-dark-600/50 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === tab.id
                    ? "bg-brand-indigo/15 text-brand-indigo-light"
                    : "text-dark-200 hover:text-white hover:bg-dark-700"
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* AI Model Config */}
      <div className="mb-4">
        <GenerationConfigBar compact />
      </div>

      {/* Learn Tab */}
      {activeTab === "learn" && (
        <div className="space-y-4">
          <p className="text-sm text-dark-200 mb-4">
            Select a concept to learn in depth:
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {topic.concepts.map((concept) => (
              <button
                key={concept}
                onClick={() => handleLearn(concept)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${
                    selectedConcept === concept
                      ? "bg-brand-indigo text-white"
                      : "bg-dark-700 text-dark-200 hover:bg-dark-600 hover:text-white border border-dark-500/30"
                  }`}
              >
                {concept}
              </button>
            ))}
          </div>

          {learnLoading && <LoadingDots text="Learning" />}
          {learnContent && (
            <div className="animate-fade-in space-y-3">
              <div className="glass-card p-6">
                <MarkdownRenderer content={learnContent} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    saveContent(
                      topic.id,
                      `learn_${selectedConcept}`,
                      learnContent,
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
                  onClick={() => handleLearn(selectedConcept)}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                  disabled={learnLoading}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Practice Tab */}
      {activeTab === "practice" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2">
              {["easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`badge cursor-pointer transition-all ${
                    difficulty === d
                      ? d === "easy"
                        ? "badge-easy ring-1 ring-brand-emerald"
                        : d === "medium"
                          ? "badge-medium ring-1 ring-brand-amber"
                          : "badge-hard ring-1 ring-red-500"
                      : "bg-dark-600 text-dark-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={handleGenerateProblem}
              className="btn-primary flex items-center gap-2"
              disabled={problemLoading}
            >
              {problemLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {currentProblem ? "New Problem" : "Generate Problem"}
            </button>
          </div>

          {problemLoading && <LoadingDots text="Generating problem" />}

          {currentProblem && !problemLoading && (
            <div className="space-y-4 animate-fade-in">
              {/* Problem Description */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">
                    {currentProblem.title}
                  </h3>
                  <span
                    className={`badge ${currentProblem.difficulty === "easy" ? "badge-easy" : currentProblem.difficulty === "medium" ? "badge-medium" : "badge-hard"}`}
                  >
                    {currentProblem.difficulty}
                  </span>
                </div>
                <MarkdownRenderer content={currentProblem.description} />

                {currentProblem.examples && (
                  <div className="mt-4 space-y-2">
                    {currentProblem.examples.map((ex, i) => (
                      <div key={i} className="bg-dark-800 rounded-xl p-3">
                        <p className="text-xs text-dark-200 mb-1">
                          Example {i + 1}:
                        </p>
                        <p className="text-sm font-mono text-brand-emerald-light">
                          Input: {ex.input}
                        </p>
                        <p className="text-sm font-mono text-brand-amber-light">
                          Output: {ex.output}
                        </p>
                        {ex.explanation && (
                          <p className="text-xs text-dark-200 mt-1">
                            {ex.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {currentProblem.constraints && (
                  <div className="mt-3">
                    <p className="text-xs text-dark-300 font-semibold mb-1">
                      Constraints:
                    </p>
                    <ul className="text-xs text-dark-200 space-y-0.5">
                      {currentProblem.constraints.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Code Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">
                    Your Solution (Python)
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGetHint}
                      className="btn-ghost text-xs flex items-center gap-1"
                      disabled={hintLoading}
                    >
                      <Lightbulb className="w-3 h-3" /> Hint
                    </button>
                    <button
                      onClick={() => setShowSolution(!showSolution)}
                      className="btn-ghost text-xs"
                    >
                      {showSolution ? "Hide Solution" : "Show Solution"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="# Write your Python solution here..."
                  className="code-editor min-h-[250px]"
                  spellCheck={false}
                />
                <button
                  onClick={handleEvaluate}
                  disabled={evalLoading || !userCode.trim()}
                  className="btn-success mt-3 flex items-center gap-2"
                >
                  {evalLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Evaluate My Code
                </button>
              </div>

              {/* Hint */}
              {showHint && (
                <div className="glass-card p-4 border-brand-amber/30 animate-fade-in">
                  <h4 className="text-sm font-semibold text-brand-amber-light mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Hint
                  </h4>
                  {hintLoading ? (
                    <LoadingDots />
                  ) : (
                    <MarkdownRenderer content={hintContent} />
                  )}
                </div>
              )}

              {/* Solution */}
              {showSolution && currentProblem.solution && (
                <div className="glass-card p-4 border-brand-emerald/30 animate-fade-in">
                  <h4 className="text-sm font-semibold text-brand-emerald-light mb-2">
                    Solution
                  </h4>
                  <MarkdownRenderer
                    content={`\`\`\`python\n${currentProblem.solution}\n\`\`\``}
                  />
                  {currentProblem.explanation && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold text-white mb-1">
                        Explanation
                      </h4>
                      <MarkdownRenderer content={currentProblem.explanation} />
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-dark-200">
                    <span>Time: {currentProblem.timeComplexity}</span>
                    <span>Space: {currentProblem.spaceComplexity}</span>
                    {currentProblem.pattern && (
                      <span>Pattern: {currentProblem.pattern}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluation */}
              {evalLoading && <LoadingDots text="Evaluating your code" />}
              {evaluation && (
                <div className="glass-card p-6 border-brand-indigo/30 animate-fade-in">
                  <h4 className="text-sm font-semibold text-brand-indigo-light mb-3">
                    AI Evaluation
                  </h4>
                  <MarkdownRenderer content={evaluation} />
                </div>
              )}
            </div>
          )}

          {!currentProblem && !problemLoading && (
            <div className="glass-card p-12 text-center">
              <Code2 className="w-12 h-12 text-dark-400 mx-auto mb-3" />
              <p className="text-dark-200">
                Select a difficulty and generate a problem to start practicing.
              </p>
              <p className="text-xs text-dark-300 mt-1">
                Problems are generated by AI at FAANG interview level.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chat/Discuss Tab */}
      {activeTab === "chat" && (
        <div className="flex flex-col h-[calc(100vh-250px)]">
          <div className="glass-card flex-1 flex flex-col overflow-hidden">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <Lightbulb className="w-10 h-10 text-dark-400 mx-auto mb-3" />
                  <p className="text-dark-200">
                    Ask any doubt about {topic.title}.
                  </p>
                  <p className="text-xs text-dark-300 mt-1">
                    The AI will explain in depth with examples and code.
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

            {/* Chat input */}
            <div className="p-4 border-t border-dark-600/50">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleChatSend()
                  }
                  placeholder={`Ask about ${topic.title}...`}
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
        </div>
      )}
    </div>
  );
}
