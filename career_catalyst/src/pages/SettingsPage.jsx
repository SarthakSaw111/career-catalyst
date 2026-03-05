import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Key,
  User,
  Target,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { isGeminiReady } from "../services/gemini";

export default function SettingsPage() {
  const { profile, updateProfile, settings, updateSettings, geminiReady } =
    useApp();
  const [name, setName] = useState(profile?.name || "Sarthak");
  const [apiKey, setApiKey] = useState(profile?.apiKey || "");
  const [dailyGoal, setDailyGoal] = useState(settings.dailyGoalMinutes);
  const [dailyProblems, setDailyProblems] = useState(settings.dailyProblems);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = () => {
    updateProfile({ name, apiKey });
    updateSettings({
      ...settings,
      dailyGoalMinutes: dailyGoal,
      dailyProblems: dailyProblems,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClearData = () => {
    if (
      window.confirm(
        "Are you sure? This will delete ALL your progress data. This cannot be undone.",
      )
    ) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("cc_"))
        .forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-dark-200">Configure your learning environment.</p>
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-brand-amber" />
            <h2 className="text-base font-bold text-white">Gemini API Key</h2>
            {geminiReady ? (
              <span className="badge badge-easy ml-2">Connected</span>
            ) : (
              <span className="badge bg-red-500/20 text-red-400 ml-2">
                Not connected
              </span>
            )}
          </div>
          <p className="text-xs text-dark-200 mb-3">
            Get your free API key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-brand-indigo-light hover:underline"
            >
              Google AI Studio
            </a>
            . The key is stored locally in your browser.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key..."
            className="input-field mb-2"
          />
          {!geminiReady && apiKey && (
            <p className="text-xs text-brand-amber flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> Click Save to connect
            </p>
          )}
        </motion.div>

        {/* Profile */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-brand-indigo-light" />
            <h2 className="text-base font-bold text-white">Profile</h2>
          </div>
          <label className="block text-xs text-dark-200 mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className="input-field"
          />
        </motion.div>

        {/* Goals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-emerald" />
            <h2 className="text-base font-bold text-white">Daily Goals</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-200 mb-1">
                Study Time (minutes)
              </label>
              <input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                min={15}
                max={480}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-200 mb-1">
                Problems per day
              </label>
              <input
                type="number"
                value={dailyProblems}
                onChange={(e) => setDailyProblems(Number(e.target.value))}
                min={1}
                max={20}
                className="input-field"
              />
            </div>
          </div>
        </motion.div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
          >
            {saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 border-red-500/20"
        >
          <h2 className="text-base font-bold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-xs text-dark-200 mb-3">
            Clear all stored data and start fresh.
          </p>
          <button
            onClick={handleClearData}
            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear All Data
          </button>
        </motion.div>
      </div>
    </div>
  );
}
