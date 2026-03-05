import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Code2,
  Brain,
  Network,
  Mic,
  Languages,
  TrendingUp,
  Zap,
  Target,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { sendPrompt } from "../services/gemini";
import { PROMPTS } from "../services/prompts";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";
import GenerationConfigBar from "../components/shared/GenerationConfigBar";

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    profile,
    geminiReady,
    streak,
    dsaProgress,
    mlProgress,
    sdProgress,
    englishProgress,
    interviewHistory,
  } = useApp();
  const [dailyPlan, setDailyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const generateDailyPlan = useCallback(async () => {
    if (!geminiReady) return;
    setPlanLoading(true);
    try {
      const progressSummary = `
DSA: ${dsaProgress.totalSolved} problems solved, ${Object.values(dsaProgress.topics).filter((t) => t.conceptLearned).length} topics learned
ML: ${mlProgress.conceptsLearned} concepts learned, ${mlProgress.quizzesTaken} quizzes
System Design: ${sdProgress.sessionsCompleted} sessions, ${Object.keys(sdProgress.topics).length} topics
English: ${englishProgress.lessonsCompleted} lessons, ${englishProgress.conversationCount} conversations
Interviews: ${interviewHistory.length} mock interviews done
Streak: ${streak.currentStreak} days current, ${streak.longestStreak} best`;

      const response = await sendPrompt(
        PROMPTS.DAILY_PLAN,
        `Today's date: ${new Date().toLocaleDateString()}.
         My current progress:\n${progressSummary}\n
         Generate my personalized daily learning plan for today.
         Focus on weak areas. Be specific with time blocks and tasks.`,
      );
      setDailyPlan(response);
    } catch (err) {
      setDailyPlan(`⚠️ ${err.message}`);
    }
    setPlanLoading(false);
  }, [
    geminiReady,
    dsaProgress,
    mlProgress,
    sdProgress,
    englishProgress,
    interviewHistory,
    streak,
  ]);

  const moduleCards = [
    {
      title: "DSA & Coding",
      icon: Code2,
      color: "from-blue-500 to-indigo-600",
      stat: `${dsaProgress.totalSolved} solved`,
      path: "/dsa",
      desc: "Practice problems, learn patterns",
    },
    {
      title: "ML & AI",
      icon: Brain,
      color: "from-purple-500 to-pink-600",
      stat: `${mlProgress.conceptsLearned} concepts`,
      path: "/ml",
      desc: "Deep-dive into ML fundamentals",
    },
    {
      title: "System Design",
      icon: Network,
      color: "from-emerald-500 to-teal-600",
      stat: `${sdProgress.sessionsCompleted} sessions`,
      path: "/system-design",
      desc: "Architecture & design patterns",
    },
    {
      title: "Mock Interview",
      icon: Mic,
      color: "from-amber-500 to-orange-600",
      stat: `${interviewHistory.length} interviews`,
      path: "/interview",
      desc: "Practice with AI interviewer",
    },
    {
      title: "English Lab",
      icon: Languages,
      color: "from-cyan-500 to-blue-600",
      stat: `${englishProgress.lessonsCompleted} lessons`,
      path: "/english",
      desc: "Improve communication skills",
    },
    {
      title: "Progress",
      icon: TrendingUp,
      color: "from-rose-500 to-red-600",
      stat: `${streak.currentStreak} day streak`,
      path: "/progress",
      desc: "Track your growth",
    },
  ];

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-1">
          {greeting}, {profile?.name || "Sarthak"} 👋
        </h1>
        <p className="text-dark-200">
          Let's build your knowledge and crack those interviews.
        </p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {streak.currentStreak}
            </p>
            <p className="text-xs text-dark-200">Day Streak</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-indigo/20 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-brand-indigo-light" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {dsaProgress.totalSolved}
            </p>
            <p className="text-xs text-dark-200">Problems Solved</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {mlProgress.conceptsLearned}
            </p>
            <p className="text-xs text-dark-200">ML Concepts</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-emerald/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-brand-emerald-light" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {interviewHistory.length}
            </p>
            <p className="text-xs text-dark-200">Mock Interviews</p>
          </div>
        </motion.div>
      </div>

      {/* Daily Plan */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-amber" />
            <h2 className="text-lg font-bold text-white">Today's Plan</h2>
          </div>
          <button
            onClick={generateDailyPlan}
            disabled={planLoading || !geminiReady}
            className="btn-ghost text-xs flex items-center gap-1"
          >
            {planLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {dailyPlan ? "Regenerate" : "Generate Plan"}
          </button>
        </div>
        <div className="mb-4">
          <GenerationConfigBar compact />
        </div>

        {planLoading && (
          <LoadingDots text="AI is creating your personalized plan" />
        )}
        {dailyPlan && !planLoading && <MarkdownRenderer content={dailyPlan} />}
        {!dailyPlan && !planLoading && (
          <div className="text-center py-6">
            <p className="text-dark-200 text-sm">
              {geminiReady
                ? "Click 'Generate Plan' to get your AI-personalized daily schedule."
                : "Add your Gemini API key in Settings to get AI-powered daily plans."}
            </p>
          </div>
        )}
      </motion.div>

      {/* Module Cards */}
      <h2 className="text-lg font-bold text-white mb-4">Learning Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {moduleCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              onClick={() => navigate(card.path)}
              className="topic-card text-left group"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {card.title}
              </h3>
              <p className="text-xs text-dark-200 mb-2">{card.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dark-300">
                  {card.stat}
                </span>
                <ArrowRight className="w-4 h-4 text-dark-400 group-hover:text-brand-indigo-light transition-all group-hover:translate-x-1" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
