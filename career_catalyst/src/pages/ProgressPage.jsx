import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Flame,
  Code2,
  Brain,
  Network,
  Mic,
  Languages,
  Calendar,
  Target,
  Award,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { sendPrompt } from "../services/gemini";
import { DSA_ROADMAP } from "../data/roadmaps";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";

export default function ProgressPage() {
  const {
    streak,
    dsaProgress,
    mlProgress,
    sdProgress,
    englishProgress,
    interviewHistory,
    geminiReady,
  } = useApp();
  const [weeklyReport, setWeeklyReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const generateReport = useCallback(async () => {
    if (!geminiReady) return;
    setReportLoading(true);
    try {
      const response = await sendPrompt(
        `You are a career coach generating a detailed weekly progress report.
         Be honest, specific, and encouraging. Identify weak areas and suggest concrete next steps.
         Include a score/grade for each module and an overall readiness assessment.`,
        `Generate my weekly progress report:

Streak: ${streak.currentStreak} days (best: ${streak.longestStreak})
Active Days: ${streak.activeDays.slice(-7).join(", ") || "none recently"}

DSA: ${dsaProgress.totalSolved} problems solved, ${Object.values(dsaProgress.topics).filter((t) => t.conceptLearned).length}/${DSA_ROADMAP.length} topics covered
ML/AI: ${mlProgress.conceptsLearned} concepts learned, ${mlProgress.quizzesTaken} quizzes taken
System Design: ${sdProgress.sessionsCompleted} design sessions, ${Object.keys(sdProgress.topics).length} topics covered
English: ${englishProgress.lessonsCompleted} lessons, ${englishProgress.conversationCount} conversation practices
Mock Interviews: ${interviewHistory.length} completed

Recent interviews: ${JSON.stringify(interviewHistory.slice(-3).map((i) => ({ type: i.title, date: i.date, duration: i.duration })))}

Give me:
1. Module-by-module assessment
2. What I've done well
3. Weak areas
4. Overall interview readiness score (1-10)
5. Specific plan for next week
6. Motivational closing`,
      );
      setWeeklyReport(response);
    } catch (err) {
      setWeeklyReport(`⚠️ ${err.message}`);
    }
    setReportLoading(false);
  }, [
    geminiReady,
    streak,
    dsaProgress,
    mlProgress,
    sdProgress,
    englishProgress,
    interviewHistory,
  ]);

  const totalTopicsLearned = Object.values(dsaProgress.topics).filter(
    (t) => t.conceptLearned,
  ).length;

  // Streak calendar (last 28 days)
  const renderStreakCalendar = () => {
    const days = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const isActive = streak.activeDays.includes(dateStr);
      const isToday = i === 0;
      days.push(
        <div
          key={dateStr}
          className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-medium transition-all
            ${isActive ? "bg-brand-emerald text-white" : "bg-dark-700 text-dark-300"}
            ${isToday ? "ring-2 ring-brand-indigo" : ""}`}
          title={dateStr}
        >
          {date.getDate()}
        </div>,
      );
    }
    return days;
  };

  const statCards = [
    {
      label: "Current Streak",
      value: streak.currentStreak,
      unit: "days",
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/20",
    },
    {
      label: "Best Streak",
      value: streak.longestStreak,
      unit: "days",
      icon: Award,
      color: "text-brand-amber",
      bg: "bg-brand-amber/20",
    },
    {
      label: "DSA Solved",
      value: dsaProgress.totalSolved,
      unit: "problems",
      icon: Code2,
      color: "text-brand-indigo-light",
      bg: "bg-brand-indigo/20",
    },
    {
      label: "ML Concepts",
      value: mlProgress.conceptsLearned,
      unit: "learned",
      icon: Brain,
      color: "text-purple-400",
      bg: "bg-purple-500/20",
    },
    {
      label: "Design Sessions",
      value: sdProgress.sessionsCompleted,
      unit: "completed",
      icon: Network,
      color: "text-brand-emerald",
      bg: "bg-brand-emerald/20",
    },
    {
      label: "Interviews",
      value: interviewHistory.length,
      unit: "practiced",
      icon: Mic,
      color: "text-brand-amber",
      bg: "bg-brand-amber/20",
    },
    {
      label: "English Lessons",
      value: englishProgress.lessonsCompleted,
      unit: "completed",
      icon: Languages,
      color: "text-cyan-400",
      bg: "bg-cyan-500/20",
    },
    {
      label: "Conversations",
      value: englishProgress.conversationCount,
      unit: "practiced",
      icon: Languages,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
    },
  ];

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Progress</h1>
        <p className="text-dark-200">
          Track your learning journey. Consistency beats intensity.
        </p>
      </div>

      {/* Streak Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-brand-emerald" />
          <h2 className="text-base font-bold text-white">
            Activity Calendar (Last 28 Days)
          </h2>
        </div>
        <div className="grid grid-cols-7 gap-2">{renderStreakCalendar()}</div>
        <div className="flex items-center gap-4 mt-3 text-xs text-dark-300">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-brand-emerald" /> Active
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-dark-700" /> Inactive
          </span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-dark-200">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* DSA Progress Detail */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 mb-6"
      >
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-brand-indigo-light" /> DSA Topic
          Progress
        </h2>
        <div className="space-y-2">
          {DSA_ROADMAP.map((topic) => {
            const progress = dsaProgress.topics[topic.id];
            const solved = progress?.problemsSolved || 0;
            const pct = Math.min(100, (solved / topic.estimatedProblems) * 100);
            return (
              <div key={topic.id} className="flex items-center gap-3">
                <span className="text-sm w-6 text-center">{topic.icon}</span>
                <span className="text-xs text-dark-200 w-40 truncate">
                  {topic.title}
                </span>
                <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-indigo to-brand-emerald rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-dark-300 w-16 text-right">
                  {solved}/{topic.estimatedProblems}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* AI Weekly Report */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-amber" />
            <h2 className="text-base font-bold text-white">AI Weekly Report</h2>
          </div>
          <button
            onClick={generateReport}
            disabled={reportLoading || !geminiReady}
            className="btn-ghost text-xs flex items-center gap-1"
          >
            {reportLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Generate Report
          </button>
        </div>
        {reportLoading && <LoadingDots text="AI is analyzing your progress" />}
        {weeklyReport && !reportLoading && (
          <MarkdownRenderer content={weeklyReport} />
        )}
        {!weeklyReport && !reportLoading && (
          <p className="text-sm text-dark-200 text-center py-4">
            {geminiReady
              ? "Click 'Generate Report' to get AI-powered insights on your progress."
              : "Add your Gemini API key in Settings first."}
          </p>
        )}
      </motion.div>
    </div>
  );
}
