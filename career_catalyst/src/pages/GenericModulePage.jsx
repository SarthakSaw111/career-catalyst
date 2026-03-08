import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Timer,
  ClipboardList,
  Trophy,
  Users,
  AlertTriangle,
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

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function makeTeachPrompt(moduleTitle) {
  return `${PROMPTS._USER_CONTEXT || ""}
You are a world-class instructor teaching "${moduleTitle}".
Teach the given concept with DEEP understanding.

rules:
- Mathematical formulation where relevant (use LaTeX with $ for inline, $$ for blocks)
- Visual explanations (ASCII diagrams, tables)
- Use simple language but don't dumb down the content
- Only include code if the topic is specifically about programming
- Be thorough — this builds deep knowledge for any interview/exam preparation or, what the topic and user asks for`;
}

function makeQuizPrompt(moduleTitle) {
  return `You are a quiz generator for "${moduleTitle}".
Generate a SET of quiz questions for the given topic.
The user will specify how many questions they want.

IMPORTANT RULES:
- MIX different question types: mcq, short_answer, true_false, fill_blank
- MIX different difficulty levels across the set
- Questions should test UNDERSTANDING, not memorization
- Include "why", "what happens if", "compare/contrast", and application questions
- Each question must be relevant to the specific topic/subtopics
- Do NOT repeat the same pattern

Return JSON:
{
  "questions": [
    {
      "question": "The question text",
      "type": "mcq|short_answer|true_false|fill_blank",
      "options": ["A", "B", "C", "D"] (for mcq/true_false only),
      "correctAnswer": "The correct answer",
      "explanation": "Detailed explanation",
      "difficulty": "easy|medium|hard",
      "followUp": "A follow-up question"
    }
  ]
}`;
}

function makePracticeExamPrompt(moduleTitle) {
  return `You are a strict exam paper setter for "${moduleTitle}".
Generate a REAL EXAM paper with mixed difficulty. This is a timed test — no hints, no fluff.

RULES:
- Questions MUST span across ALL the topics/subtopics provided
- Mix types: mcq, short_answer, true_false, fill_blank
- 30% easy, 50% medium, 20% hard
- Each question must test genuine understanding
- Include the topic/section each question belongs to
- Make it feel like a real university/certification exam

Return JSON:
{
  "questions": [
    {
      "question": "Clear, exam-style question text",
      "type": "mcq|short_answer|true_false|fill_blank",
      "options": ["A", "B", "C", "D"] (for mcq/true_false only),
      "correctAnswer": "The correct answer",
      "explanation": "Detailed explanation for review after exam",
      "difficulty": "easy|medium|hard",
      "topic": "Which topic/section this belongs to",
      "marks": 1
    }
  ]
}`;
}

const INTERVIEWER_PERSONAS = {
  bro: {
    name: "The Bro",
    emoji: "😎",
    style:
      "Super chill, uses slang, calls you bro/dude, very encouraging, explains things with fun analogies. Keeps it real but hypes you up.",
    greeting: "Yooo what's good bro! Ready to crush this? Let's goooo 🔥",
  },
  chill: {
    name: "Chill Friend",
    emoji: "🧘",
    style:
      "Calm, patient, warm. Like your best study buddy. Never rushes, always says 'no worries' when you're wrong. Makes you feel safe to make mistakes.",
    greeting:
      "Hey! Glad you're here. Take your time, no pressure at all. Let's just have a relaxed chat about this stuff.",
  },
  nerd: {
    name: "The Nerd",
    emoji: "🤓",
    style:
      "Extremely precise, loves going deep. Asks 'but WHY?' a lot. Gets excited about edge cases. Uses proper terminology. Genuinely passionate about the subject.",
    greeting:
      "Oh, fascinating! I've been thinking about this topic. Did you know... actually, let me test your understanding first. This is going to be fun!",
  },
  drill: {
    name: "Drill Sergeant",
    emoji: "🫡",
    style:
      "Strict, no-nonsense, demanding but fair. Expects crisp, clear answers. Calls out vague responses immediately. Tough love — pushes you to your limit because they believe in you.",
    greeting:
      "Alright, listen up. I'm not here to hold your hand. I'm here to make sure you're READY. Let's see what you've got. No excuses.",
  },
};

function makeInterviewPrompt(moduleTitle, persona) {
  const p = INTERVIEWER_PERSONAS[persona];
  return `You are a live interview coach for "${moduleTitle}" with this personality:
Name: ${p.name} ${p.emoji}
Style: ${p.style}

You are conducting a LIVE mock interview session. This is interactive — ask ONE question, wait for their answer, evaluate it, and ask the next.

RULES:
- Stay in character AT ALL TIMES
- Ask questions relevant to the topics the user wants to practice
- After each answer: give feedback IN CHARACTER, then ask the next question
- Track their performance mentally
- Mix difficulty: start easier, get harder based on their answers
- After 5-8 questions (or when user says "done"), give a DETAILED scorecard:
  - Overall rating (1-10)
  - Topic-wise strength/weakness
  - Specific improvements needed
  - Character-appropriate encouragement

Start with your greeting and first question.`;
}

export default function GenericModulePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { allModules, geminiReady } = useApp();
  const isMobile = useIsMobile();
  const [mobileShowContent, setMobileShowContent] = useState(false);

  const moduleData = allModules.find((m) => m.slug === slug);

  const [activeMode, setActiveMode] = useState("learn");
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lastSubtopic, setLastSubtopic] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  // Quiz state — multi-question
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
  const [progress, setProgress] = useState({ topics: {}, stats: {} });

  // Practice exam state
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceTimer, setPracticeTimer] = useState(0);
  const [practiceTimeLimit, setPracticeTimeLimit] = useState(15); // minutes
  const [practiceQuestionCount, setPracticeQuestionCount] = useState(10);
  const [practiceReport, setPracticeReport] = useState(null);
  const practiceTimerRef = useRef(null);

  // Interview mode state
  const [interviewPersona, setInterviewPersona] = useState(null);
  const [interviewMessages, setInterviewMessages] = useState([]);
  const [interviewInput, setInterviewInput] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewTopic, setInterviewTopic] = useState(null);

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
      setMobileShowContent(true);

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
          `Teach me about "${subtopic}" under the topic "${topic.title}" (section: ${section.title}).`,
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
      setLoading(true);
      setMobileShowContent(true);
      try {
        const topicContext = subtopic
          ? `Generate ${quizCount} quiz questions specifically about "${subtopic}" under "${topic.title}" (${section.title}).`
          : `Generate ${quizCount} quiz questions for topic: "${topic.title}" (${section.title}).
Subtopics: ${topic.subtopics?.join(", ") || "general"}.`;
        const data = await sendPromptJSON(
          makeQuizPrompt(moduleData?.title || slug),
          `${topicContext}
Generate exactly ${quizCount} questions with a MIX of types (mcq, short_answer, true_false, fill_blank) and difficulties (easy, medium, hard).
Test UNDERSTANDING, not memorization.`,
        );
        const questions =
          data.questions || (Array.isArray(data) ? data : [data]);
        setQuizQuestions(questions);
      } catch (err) {
        setContent(`⚠️ Error: ${err.message}`);
      }
      setLoading(false);
    },
    [geminiReady, slug, moduleData, quizCount],
  );

  const submitQuizAnswer = useCallback(() => {
    const currentQ = quizQuestions[quizIndex];
    if (!currentQ || !quizAnswer.trim()) return;
    // Compare locally — no LLM call
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
  }, [quizQuestions, quizIndex, quizAnswer]);

  // Detailed evaluation at the end — single LLM call for all Q&A
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
        "You are a thorough quiz evaluator. Analyze all answers together. Be encouraging but honest.",
        `Here are all quiz responses:\n\n${summary}\n\nGive:\n1. Overall assessment\n2. Specific feedback on wrong answers\n3. Knowledge gaps identified\n4. What to study next`,
      );
      setDetailedFeedback(feedback);
    } catch (err) {
      setDetailedFeedback(`⚠️ ${err.message}`);
    }
    setFeedbackLoading(false);
  }, [quizAnswers, feedbackLoading]);

  const nextQuestion = useCallback(() => {
    // Record the answer
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

  // ─── Practice Exam ───
  const startPracticeExam = useCallback(async () => {
    if (!geminiReady) return;
    setActiveMode("practice");
    setPracticeQuestions([]);
    setPracticeIndex(0);
    setPracticeAnswers({});
    setPracticeSubmitted(false);
    setPracticeReport(null);
    setPracticeTimer(0);
    setMobileShowContent(true);
    setLoading(true);
    try {
      const allTopics = (moduleData?.roadmap || [])
        .flatMap((s) =>
          (s.topics || []).map(
            (t) =>
              `${s.title} > ${t.title}: ${t.subtopics?.join(", ") || "general"}`,
          ),
        )
        .join("\n");
      const data = await sendPromptJSON(
        makePracticeExamPrompt(moduleData?.title || slug),
        `Generate exactly ${practiceQuestionCount} exam questions spanning these topics:\n${allTopics}\n\nMix types and difficulties. This is a ${practiceTimeLimit}-minute timed exam.`,
      );
      const questions = data.questions || (Array.isArray(data) ? data : [data]);
      setPracticeQuestions(questions);
      // Start timer
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
      practiceTimerRef.current = setInterval(() => {
        setPracticeTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setContent(`⚠️ Error: ${err.message}`);
    }
    setLoading(false);
  }, [geminiReady, slug, moduleData, practiceQuestionCount, practiceTimeLimit]);

  const submitPracticeExam = useCallback(() => {
    if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    let correct = 0;
    let totalMarks = 0;
    const topicScores = {};
    const results = practiceQuestions.map((q, i) => {
      const userAns = (practiceAnswers[i] || "").toLowerCase().trim();
      const correctAns = (q.correctAnswer || "").toLowerCase().trim();
      const isCorrect =
        userAns === correctAns ||
        correctAns.includes(userAns) ||
        userAns.includes(correctAns);
      const marks = q.marks || 1;
      totalMarks += marks;
      if (isCorrect) correct += marks;
      const topic = q.topic || "General";
      if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 };
      topicScores[topic].total += marks;
      if (isCorrect) topicScores[topic].correct += marks;
      return { ...q, userAnswer: practiceAnswers[i] || "", isCorrect };
    });
    setPracticeReport({
      results,
      correct,
      totalMarks,
      topicScores,
      timeTaken: practiceTimer,
    });
    setPracticeSubmitted(true);
  }, [practiceQuestions, practiceAnswers, practiceTimer]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (
      activeMode === "practice" &&
      practiceQuestions.length > 0 &&
      !practiceSubmitted
    ) {
      if (practiceTimer >= practiceTimeLimit * 60) {
        submitPracticeExam();
      }
    }
  }, [
    practiceTimer,
    practiceTimeLimit,
    activeMode,
    practiceQuestions.length,
    practiceSubmitted,
    submitPracticeExam,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    };
  }, []);

  // ─── Live Interview ───
  const startInterview = useCallback(
    async (persona, topic = null) => {
      if (!geminiReady) return;
      setActiveMode("interview");
      setInterviewPersona(persona);
      setInterviewTopic(topic);
      setInterviewMessages([]);
      setInterviewInput("");
      setMobileShowContent(true);
      setInterviewLoading(true);
      try {
        const topicCtx = topic
          ? `Topic to interview on: ${topic.title}. Subtopics: ${topic.subtopics?.join(", ") || "general"}.`
          : `Interview across all topics in ${moduleData?.title || slug}.`;
        const sessionId = `interview-${slug}-${persona}-${Date.now()}`;
        resetChatSession(sessionId);
        const response = await sendChatMessage(
          sessionId,
          makeInterviewPrompt(moduleData?.title || slug, persona),
          `Start the interview. ${topicCtx}`,
        );
        setInterviewMessages([{ role: "ai", content: response }]);
      } catch (err) {
        setInterviewMessages([{ role: "ai", content: `⚠️ ${err.message}` }]);
      }
      setInterviewLoading(false);
    },
    [geminiReady, slug, moduleData],
  );

  const sendInterviewMessage = useCallback(async () => {
    if (!geminiReady || !interviewInput.trim() || interviewLoading) return;
    const msg = interviewInput.trim();
    setInterviewInput("");
    setInterviewMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInterviewLoading(true);
    try {
      const sessionId = `interview-${slug}-${interviewPersona}-${interviewMessages.length}`;
      // Reuse chat session via sessionId that includes persona
      const actualSessionId = `interview-${slug}-${interviewPersona}`;
      const response = await sendChatMessage(
        actualSessionId,
        makeInterviewPrompt(moduleData?.title || slug, interviewPersona),
        msg,
      );
      setInterviewMessages((prev) => [
        ...prev,
        { role: "ai", content: response },
      ]);
    } catch (err) {
      setInterviewMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ ${err.message}` },
      ]);
    }
    setInterviewLoading(false);
  }, [
    geminiReady,
    interviewInput,
    interviewLoading,
    slug,
    interviewPersona,
    interviewMessages.length,
    moduleData,
  ]);

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

  // On mobile: show either topic tree or content, not both
  const showTopicTree = !isMobile || !mobileShowContent;
  const showContentArea = !isMobile || mobileShowContent;

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left: Topic Tree */}
        {showTopicTree && (
          <div className="w-full md:w-80 md:flex-shrink-0">
            <div className="md:sticky md:top-6">
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
                                    setMobileShowContent(true);
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

              {/* Practice & Interview buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setActiveMode("practice");
                    setMobileShowContent(true);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    activeMode === "practice"
                      ? "border-brand-amber bg-brand-amber/15 text-brand-amber-light"
                      : "border-dark-500/30 bg-dark-700/30 text-dark-300 hover:border-brand-amber/50 hover:text-brand-amber-light"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Practice Exam
                </button>
                <button
                  onClick={() => {
                    setActiveMode("interview");
                    setInterviewPersona(null);
                    setMobileShowContent(true);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    activeMode === "interview"
                      ? "border-brand-indigo bg-brand-indigo/15 text-brand-indigo-light"
                      : "border-dark-500/30 bg-dark-700/30 text-dark-300 hover:border-brand-indigo/50 hover:text-brand-indigo-light"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Live Interview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right: Content Area */}
        {showContentArea && (
          <div className="flex-1 min-w-0">
            {/* Mobile back button */}
            {isMobile && mobileShowContent && (
              <button
                onClick={() => setMobileShowContent(false)}
                className="flex items-center gap-2 text-sm text-dark-200 hover:text-white mb-4 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to topics
              </button>
            )}
            {/* Learn Mode */}
            {activeMode === "learn" && (
              <>
                {loading && <LoadingDots text="Generating deep explanation" />}
                {content && !loading && (
                  <div className="animate-fade-in space-y-3">
                    <div className="glass-card p-4 md:p-6">
                      <MarkdownRenderer content={content} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      <span className="text-dark-500 text-xs">|</span>
                      <button
                        onClick={() =>
                          handleQuiz(
                            selectedSection,
                            selectedTopic,
                            lastSubtopic,
                          )
                        }
                        className="text-xs px-3 py-1.5 rounded-lg bg-brand-amber/10 text-brand-amber-light hover:bg-brand-amber/20 transition-all flex items-center gap-1.5"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Quiz This Topic
                      </button>
                      <button
                        onClick={() => {
                          setActiveMode("discuss");
                          setChatMessages([]);
                          setMobileShowContent(true);
                          resetChatSession(
                            `${slug}-${selectedSection?.id}-${selectedTopic?.id}`,
                          );
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-brand-indigo/10 text-brand-indigo-light hover:bg-brand-indigo/20 transition-all flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Discuss
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
                {/* Quiz config bar — shown before quiz starts */}
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

                {/* Quiz finished — show score */}
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
                      {!detailedFeedback && (
                        <button
                          onClick={requestDetailedFeedback}
                          disabled={feedbackLoading}
                          className="btn-secondary flex items-center gap-2"
                        >
                          {feedbackLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : null}
                          {feedbackLoading
                            ? "Analyzing..."
                            : "Get AI Feedback on All Answers"}
                        </button>
                      )}
                    </div>
                    {detailedFeedback && (
                      <div className="mt-4 text-left p-4 rounded-xl bg-dark-800 border border-dark-500/30">
                        <MarkdownRenderer content={detailedFeedback} />
                      </div>
                    )}
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
                        {/* Progress bar */}
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
                            placeholder={
                              currentQ.type === "fill_blank"
                                ? "Fill in the blank..."
                                : "Type your answer..."
                            }
                            className="textarea-field mt-4 min-h-[100px]"
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
                              className="btn-primary flex items-center gap-2"
                            >
                              {quizIndex + 1 < quizQuestions.length
                                ? "Next Question →"
                                : "See Results"}
                            </button>
                          )}
                        </div>

                        {quizResult && (
                          <div
                            className={`mt-4 p-4 rounded-xl border animate-fade-in ${quizResult.isCorrect ? "bg-brand-emerald/5 border-brand-emerald/20" : "bg-red-500/5 border-red-500/20"}`}
                          >
                            <p className="font-semibold text-sm mb-2">
                              {quizResult.isCorrect
                                ? "✅ Correct!"
                                : "❌ Incorrect"}
                            </p>
                            <p className="text-sm text-dark-200 mb-1">
                              <span className="font-medium text-white">
                                Answer:{" "}
                              </span>
                              {quizResult.correctAnswer}
                            </p>
                            <p className="text-sm text-dark-300 mt-2">
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

            {/* Practice Exam Mode */}
            {activeMode === "practice" && (
              <div className="space-y-4">
                {/* Exam config */}
                {practiceQuestions.length === 0 &&
                  !loading &&
                  !practiceSubmitted && (
                    <div className="glass-card p-4 md:p-6 animate-fade-in">
                      <div className="flex items-center gap-3 mb-4">
                        <ClipboardList className="w-6 h-6 text-brand-amber" />
                        <h3 className="text-lg font-bold text-white">
                          Practice Exam
                        </h3>
                      </div>
                      <p className="text-sm text-dark-200 mb-4">
                        Timed exam covering all topics. No hints, no
                        explanations during the test. Just like a real exam.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs text-dark-300 mb-1 block">
                            Questions
                          </label>
                          <div className="flex gap-2">
                            {[5, 10, 15, 20].map((n) => (
                              <button
                                key={n}
                                onClick={() => setPracticeQuestionCount(n)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                  practiceQuestionCount === n
                                    ? "border-brand-amber bg-brand-amber/15 text-brand-amber-light"
                                    : "border-dark-500/30 bg-dark-700/30 text-dark-300 hover:border-dark-400"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-dark-300 mb-1 block">
                            Time Limit
                          </label>
                          <div className="flex gap-2">
                            {[10, 15, 20, 30].map((m) => (
                              <button
                                key={m}
                                onClick={() => setPracticeTimeLimit(m)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                  practiceTimeLimit === m
                                    ? "border-brand-amber bg-brand-amber/15 text-brand-amber-light"
                                    : "border-dark-500/30 bg-dark-700/30 text-dark-300 hover:border-dark-400"
                                }`}
                              >
                                {m}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={startPracticeExam}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Timer className="w-4 h-4" /> Start Exam
                      </button>
                    </div>
                  )}

                {loading && practiceQuestions.length === 0 && (
                  <LoadingDots
                    text={`Preparing ${practiceQuestionCount}-question exam`}
                  />
                )}

                {/* Active exam */}
                {practiceQuestions.length > 0 && !practiceSubmitted && (
                  <div className="space-y-4">
                    {/* Timer bar */}
                    <div className="glass-card p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer
                          className={`w-4 h-4 ${practiceTimer >= practiceTimeLimit * 60 * 0.8 ? "text-red-400 animate-pulse" : "text-brand-amber"}`}
                        />
                        <span className="text-sm font-mono text-white">
                          {Math.floor(practiceTimer / 60)
                            .toString()
                            .padStart(2, "0")}
                          :{(practiceTimer % 60).toString().padStart(2, "0")}
                        </span>
                        <span className="text-[10px] text-dark-400">
                          / {practiceTimeLimit}:00
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-dark-300">
                          {Object.keys(practiceAnswers).length}/
                          {practiceQuestions.length} answered
                        </span>
                        <button
                          onClick={submitPracticeExam}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all"
                        >
                          Submit Exam
                        </button>
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="w-full bg-dark-700 rounded-full h-1.5">
                      <div
                        className="bg-brand-amber h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(practiceTimer / (practiceTimeLimit * 60)) * 100}%`,
                        }}
                      />
                    </div>
                    {/* Question navigation */}
                    <div className="flex flex-wrap gap-1.5">
                      {practiceQuestions.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPracticeIndex(i)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                            practiceIndex === i
                              ? "bg-brand-indigo text-white"
                              : practiceAnswers[i]
                                ? "bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/30"
                                : "bg-dark-700/50 text-dark-300 border border-dark-500/30 hover:border-dark-400"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    {/* Current question */}
                    {(() => {
                      const q = practiceQuestions[practiceIndex];
                      if (!q) return null;
                      return (
                        <div className="glass-card p-4 md:p-6 animate-fade-in">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-dark-300">
                              Q{practiceIndex + 1} of {practiceQuestions.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  q.difficulty === "hard"
                                    ? "bg-red-500/15 text-red-400"
                                    : q.difficulty === "easy"
                                      ? "bg-brand-emerald/15 text-brand-emerald"
                                      : "bg-brand-amber/15 text-brand-amber-light"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                              {q.topic && (
                                <span className="text-[10px] text-dark-400">
                                  {q.topic}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-white font-medium mb-4">
                            {q.question}
                          </p>
                          {(q.type === "mcq" || q.type === "true_false") &&
                          q.options ? (
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => (
                                <button
                                  key={oi}
                                  onClick={() =>
                                    setPracticeAnswers((prev) => ({
                                      ...prev,
                                      [practiceIndex]: opt,
                                    }))
                                  }
                                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                                    practiceAnswers[practiceIndex] === opt
                                      ? "border-brand-indigo bg-brand-indigo/10 text-white"
                                      : "border-dark-500/30 bg-dark-700/30 text-dark-200 hover:border-dark-400"
                                  }`}
                                >
                                  {String.fromCharCode(65 + oi)}. {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <textarea
                              value={practiceAnswers[practiceIndex] || ""}
                              onChange={(e) =>
                                setPracticeAnswers((prev) => ({
                                  ...prev,
                                  [practiceIndex]: e.target.value,
                                }))
                              }
                              placeholder="Type your answer..."
                              className="textarea-field min-h-[100px]"
                            />
                          )}
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() =>
                                setPracticeIndex((i) => Math.max(0, i - 1))
                              }
                              disabled={practiceIndex === 0}
                              className="btn-ghost text-xs"
                            >
                              ← Prev
                            </button>
                            <button
                              onClick={() =>
                                setPracticeIndex((i) =>
                                  Math.min(practiceQuestions.length - 1, i + 1),
                                )
                              }
                              disabled={
                                practiceIndex === practiceQuestions.length - 1
                              }
                              className="btn-ghost text-xs"
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Exam results */}
                {practiceSubmitted && practiceReport && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="glass-card p-4 md:p-6 text-center">
                      <Trophy className="w-10 h-10 text-brand-amber mx-auto mb-3" />
                      <h3 className="text-xl font-bold text-white mb-2">
                        Exam Results
                      </h3>
                      <p className="text-3xl font-bold mb-1">
                        <span className="text-brand-emerald">
                          {practiceReport.correct}
                        </span>
                        <span className="text-dark-300"> / </span>
                        <span className="text-white">
                          {practiceReport.totalMarks}
                        </span>
                      </p>
                      <p className="text-sm text-dark-200 mb-1">
                        {Math.round(
                          (practiceReport.correct / practiceReport.totalMarks) *
                            100,
                        )}
                        % score
                      </p>
                      <p className="text-xs text-dark-400">
                        Completed in {Math.floor(practiceReport.timeTaken / 60)}
                        m {practiceReport.timeTaken % 60}s
                      </p>
                    </div>

                    {/* Topic-wise breakdown */}
                    <div className="glass-card p-4 md:p-6">
                      <h4 className="text-sm font-bold text-white mb-3">
                        Topic Breakdown
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(practiceReport.topicScores).map(
                          ([topic, score]) => (
                            <div key={topic}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-dark-200">{topic}</span>
                                <span
                                  className={`font-medium ${score.correct / score.total >= 0.7 ? "text-brand-emerald" : "text-red-400"}`}
                                >
                                  {score.correct}/{score.total}
                                </span>
                              </div>
                              <div className="w-full bg-dark-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${score.correct / score.total >= 0.7 ? "bg-brand-emerald" : "bg-red-400"}`}
                                  style={{
                                    width: `${(score.correct / score.total) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Detailed question review */}
                    <div className="glass-card p-4 md:p-6">
                      <h4 className="text-sm font-bold text-white mb-3">
                        Question Review
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {practiceReport.results.map((r, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border ${r.isCorrect ? "border-brand-emerald/20 bg-brand-emerald/5" : "border-red-500/20 bg-red-500/5"}`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-medium text-white">
                                Q{i + 1}. {r.question}
                              </span>
                              <span className="text-sm ml-2 flex-shrink-0">
                                {r.isCorrect ? "✅" : "❌"}
                              </span>
                            </div>
                            {!r.isCorrect && (
                              <>
                                <p className="text-[11px] text-dark-300 mt-1">
                                  Your answer: {r.userAnswer || "(blank)"}
                                </p>
                                <p className="text-[11px] text-brand-emerald mt-0.5">
                                  Correct: {r.correctAnswer}
                                </p>
                              </>
                            )}
                            <p className="text-[11px] text-dark-400 mt-1">
                              {r.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setPracticeQuestions([]);
                        setPracticeSubmitted(false);
                        setPracticeReport(null);
                        setPracticeAnswers({});
                      }}
                      className="btn-primary"
                    >
                      Take Another Exam
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Live Interview Mode */}
            {activeMode === "interview" && (
              <div className="space-y-4">
                {/* Persona selection */}
                {!interviewPersona && (
                  <div className="glass-card p-4 md:p-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="w-6 h-6 text-brand-indigo" />
                      <h3 className="text-lg font-bold text-white">
                        Choose Your Interviewer
                      </h3>
                    </div>
                    <p className="text-sm text-dark-200 mb-4">
                      Each interviewer has a unique personality. Pick one and
                      practice like it's a real interview.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(INTERVIEWER_PERSONAS).map(
                        ([key, persona]) => (
                          <button
                            key={key}
                            onClick={() => startInterview(key, selectedTopic)}
                            className="text-left p-4 rounded-xl border border-dark-500/30 bg-dark-700/30 hover:border-brand-indigo/50 hover:bg-dark-700/50 transition-all group"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{persona.emoji}</span>
                              <span className="text-sm font-bold text-white group-hover:text-brand-indigo-light transition-colors">
                                {persona.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-dark-300 line-clamp-2">
                              {persona.style}
                            </p>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Active interview chat */}
                {interviewPersona && (
                  <div className="glass-card flex flex-col h-[calc(100vh-200px)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-dark-600/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {INTERVIEWER_PERSONAS[interviewPersona]?.emoji}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {INTERVIEWER_PERSONAS[interviewPersona]?.name}
                          </h3>
                          <p className="text-[10px] text-dark-400">
                            {interviewTopic
                              ? `Topic: ${interviewTopic.title}`
                              : moduleData?.title}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setInterviewPersona(null);
                          setInterviewMessages([]);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-dark-600/50 text-dark-300 hover:text-white transition-all"
                      >
                        End Interview
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {interviewMessages.map((msg, i) => (
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
                      {interviewLoading && (
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
                          value={interviewInput}
                          onChange={(e) => setInterviewInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            sendInterviewMessage()
                          }
                          placeholder="Answer the question..."
                          className="input-field text-sm"
                          disabled={interviewLoading}
                        />
                        <button
                          onClick={sendInterviewMessage}
                          disabled={interviewLoading || !interviewInput.trim()}
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
        )}
      </div>
    </div>
  );
}
