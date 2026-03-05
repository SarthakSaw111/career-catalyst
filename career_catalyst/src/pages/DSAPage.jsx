import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Lock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { DSA_ROADMAP } from "../data/roadmaps";
import DSATopicView from "../components/dsa/DSATopicView";

export default function DSAPage() {
  const { dsaProgress } = useApp();
  const [selectedTopic, setSelectedTopic] = useState(null);

  if (selectedTopic) {
    return (
      <DSATopicView
        topic={selectedTopic}
        onBack={() => setSelectedTopic(null)}
      />
    );
  }

  const getTopicStatus = (topicId) => {
    const progress = dsaProgress.topics[topicId];
    if (!progress) return "not-started";
    if (progress.completed) return "completed";
    if (progress.problemsSolved > 0 || progress.conceptLearned)
      return "in-progress";
    return "not-started";
  };

  const isUnlocked = (topic) => {
    if (!topic.prerequisite) return true;
    const prereqStatus = getTopicStatus(topic.prerequisite);
    return prereqStatus === "completed" || prereqStatus === "in-progress";
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">DSA & Coding</h1>
        <p className="text-dark-200">
          Master data structures & algorithms from fundamentals to Google-level.
          Each topic includes AI-powered teaching, practice problems, and code
          evaluation.
        </p>
        <div className="flex gap-4 mt-4">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
            <span className="text-sm text-white font-medium">
              {dsaProgress.totalSolved} solved
            </span>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-indigo-light" />
            <span className="text-sm text-white font-medium">
              {
                Object.values(dsaProgress.topics).filter(
                  (t) => t.conceptLearned,
                ).length
              }
              /{DSA_ROADMAP.length} topics learned
            </span>
          </div>
        </div>
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DSA_ROADMAP.map((topic, index) => {
          const status = getTopicStatus(topic.id);
          const unlocked = isUnlocked(topic);
          const progress = dsaProgress.topics[topic.id];

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => unlocked && setSelectedTopic(topic)}
                disabled={!unlocked}
                className={`topic-card w-full text-left relative overflow-hidden
                  ${!unlocked ? "opacity-50 cursor-not-allowed" : ""}
                  ${status === "completed" ? "border-brand-emerald/30" : ""}
                  ${status === "in-progress" ? "border-brand-indigo/30" : ""}`}
              >
                {/* Status indicator */}
                {status === "completed" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-emerald" />
                  </div>
                )}
                {!unlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-dark-300" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span className="text-2xl">{topic.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-1">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-dark-200 line-clamp-2 mb-2">
                      {topic.description}
                    </p>

                    {/* Difficulty badge */}
                    <span
                      className={`badge ${topic.difficulty === "easy" ? "badge-easy" : topic.difficulty === "medium" ? "badge-medium" : "badge-hard"}`}
                    >
                      {topic.difficulty}
                    </span>

                    {/* Progress bar */}
                    {progress && progress.problemsSolved > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-dark-200 mb-1">
                          <span>{progress.problemsSolved} solved</span>
                          <span>{topic.estimatedProblems} total</span>
                        </div>
                        <div className="w-full h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-indigo to-brand-emerald rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (progress.problemsSolved / topic.estimatedProblems) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Concepts preview */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {topic.concepts.slice(0, 3).map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-dark-200"
                        >
                          {c}
                        </span>
                      ))}
                      {topic.concepts.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-dark-300">
                          +{topic.concepts.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {unlocked && status !== "completed" && (
                  <div className="flex items-center justify-end mt-3 text-brand-indigo-light">
                    <span className="text-xs font-medium">
                      {status === "in-progress" ? "Continue" : "Start Learning"}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
