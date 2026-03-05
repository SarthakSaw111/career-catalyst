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
  Cpu,
  Brain,
  Database,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  isGeminiReady,
  AVAILABLE_MODELS,
  getModelId,
  setModel,
  getThinkingConfig,
  setThinking,
} from "../services/gemini";

export default function SettingsPage() {
  const { profile, updateProfile, settings, updateSettings, geminiReady } =
    useApp();
  const [name, setName] = useState(profile?.name || "Sarthak");
  const [apiKey, setApiKey] = useState(profile?.apiKey || "");
  const [dailyGoal, setDailyGoal] = useState(settings.dailyGoalMinutes);
  const [dailyProblems, setDailyProblems] = useState(settings.dailyProblems);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState(getModelId());
  const [thinkingOn, setThinkingOn] = useState(getThinkingConfig().enabled);
  const [thinkingBudgetVal, setThinkingBudgetVal] = useState(
    getThinkingConfig().budget,
  );
  const [supabaseUrl, setSupabaseUrl] = useState(profile?.supabaseUrl || "");
  const [supabaseKey, setSupabaseKey] = useState(profile?.supabaseKey || "");

  const handleSave = () => {
    updateProfile({ name, apiKey, supabaseUrl, supabaseKey });
    updateSettings({
      ...settings,
      dailyGoalMinutes: dailyGoal,
      dailyProblems: dailyProblems,
    });
    // Apply model + thinking settings
    setModel(selectedModel);
    const modelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
    setThinking(
      modelInfo?.supportsThinking ? thinkingOn : false,
      thinkingBudgetVal,
    );
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

        {/* Model Selection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-brand-indigo-light" />
            <h2 className="text-base font-bold text-white">AI Model</h2>
          </div>
          <p className="text-xs text-dark-200 mb-3">
            Select which Gemini model to use. You can also change this
            per-generation from the config bar on each page.
          </p>
          <div className="space-y-2">
            {AVAILABLE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                  ${
                    selectedModel === m.id
                      ? "border-brand-indigo bg-brand-indigo/10"
                      : "border-dark-500/30 bg-dark-700/30 hover:border-dark-400"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${selectedModel === m.id ? "text-brand-indigo-light" : "text-white"}`}
                  >
                    {m.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {m.supportsThinking && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-amber/10 text-brand-amber">
                        thinking
                      </span>
                    )}
                    {selectedModel === m.id && (
                      <CheckCircle2 className="w-4 h-4 text-brand-indigo" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-dark-300 mt-0.5">{m.description}</p>
              </button>
            ))}
          </div>

          {/* Thinking Config */}
          {AVAILABLE_MODELS.find((m) => m.id === selectedModel)
            ?.supportsThinking && (
            <div className="mt-4 p-4 rounded-xl bg-dark-800/60 border border-dark-600/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-brand-amber" />
                  <span className="text-sm font-medium text-white">
                    Thinking Mode
                  </span>
                </div>
                <button
                  onClick={() => setThinkingOn(!thinkingOn)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border
                    ${
                      thinkingOn
                        ? "bg-brand-amber/15 border-brand-amber/30 text-brand-amber-light"
                        : "bg-dark-700 border-dark-500/30 text-dark-300"
                    }`}
                >
                  {thinkingOn ? "ON" : "OFF"}
                </button>
              </div>
              {thinkingOn && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-dark-300">Budget:</span>
                  <input
                    type="range"
                    min={1024}
                    max={24576}
                    step={1024}
                    value={thinkingBudgetVal}
                    onChange={(e) =>
                      setThinkingBudgetVal(Number(e.target.value))
                    }
                    className="flex-1 h-1.5 accent-brand-amber cursor-pointer"
                  />
                  <span className="text-xs text-dark-200 min-w-[50px] text-right">
                    {Math.round(thinkingBudgetVal / 1024)}k tokens
                  </span>
                </div>
              )}
            </div>
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

        {/* Supabase (Cloud Sync) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-brand-emerald" />
            <h2 className="text-base font-bold text-white">
              Cloud Sync (Supabase)
            </h2>
            {supabaseUrl && supabaseKey ? (
              <span className="badge badge-easy ml-2">Configured</span>
            ) : (
              <span className="badge bg-dark-600 text-dark-300 ml-2">
                Optional
              </span>
            )}
          </div>
          <p className="text-xs text-dark-200 mb-3">
            Connect to Supabase to sync your data across devices. Create a free
            project at{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-brand-indigo-light hover:underline"
            >
              supabase.com
            </a>
            , then paste your project URL and anon key below. Without this, data
            is stored locally only.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-dark-200 mb-1">
                Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-200 mb-1">
                Anon Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="Enter your Supabase anon key..."
                className="input-field"
              />
            </div>
          </div>
          <p className="text-[10px] text-dark-300 mt-2">
            Run the SQL schema (supabase_schema.sql) in your Supabase dashboard
            first.
          </p>
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
