import React, { useState, useEffect } from "react";
import { Cpu, Brain, ChevronDown, Zap, FileText } from "lucide-react";
import {
  AVAILABLE_MODELS,
  getModelId,
  setModel,
  getThinkingConfig,
  setThinking,
  getNoteSize,
  setNoteSize as setNoteSizeConfig,
} from "../../services/gemini";

const NOTE_SIZES = [
  { id: "none", label: "Natural", icon: "✨" },
  { id: "quick", label: "Quick", icon: "⚡" },
  { id: "normal", label: "Normal", icon: "📄" },
  { id: "detailed", label: "Detailed", icon: "📚" },
];

export default function GenerationConfigBar({ compact = false }) {
  const [selectedModel, setSelectedModel] = useState(getModelId());
  const [thinkingOn, setThinkingOn] = useState(getThinkingConfig().enabled);
  const [budget, setBudget] = useState(getThinkingConfig().budget);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noteSize, setNoteSize] = useState(getNoteSize());

  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  const supportsThinking = currentModelInfo?.supportsThinking ?? false;

  useEffect(() => {
    setModel(selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    setThinking(supportsThinking ? thinkingOn : false, budget);
  }, [thinkingOn, budget, supportsThinking]);

  useEffect(() => {
    setNoteSizeConfig(noteSize);
  }, [noteSize]);

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    setShowDropdown(false);
    const info = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!info?.supportsThinking) {
      setThinkingOn(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700/80 border border-dark-500/30 text-xs text-dark-100 hover:bg-dark-600 transition-all"
          >
            <Cpu className="w-3 h-3 text-brand-indigo-light" />
            <span className="font-medium">
              {currentModelInfo?.label || selectedModel}
            </span>
            <ChevronDown className="w-3 h-3 text-dark-300" />
          </button>
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[240px] bg-dark-800 border border-dark-500/40 rounded-xl shadow-2xl overflow-hidden">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleModelChange(m.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-dark-700 transition-all border-b border-dark-600/30 last:border-0
                      ${m.id === selectedModel ? "bg-brand-indigo/10 text-brand-indigo-light" : "text-dark-100"}`}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[10px] text-dark-300 mt-0.5">
                      {m.description}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thinking toggle */}
        {supportsThinking && (
          <button
            onClick={() => setThinkingOn(!thinkingOn)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${
                thinkingOn
                  ? "bg-brand-amber/15 border-brand-amber/30 text-brand-amber-light"
                  : "bg-dark-700/80 border-dark-500/30 text-dark-300 hover:text-dark-100"
              }`}
          >
            <Brain className="w-3 h-3" />
            {thinkingOn ? "Thinking ON" : "Thinking OFF"}
          </button>
        )}

        {/* Note size selector - compact */}
        <div className="flex items-center gap-0.5 bg-dark-700/80 rounded-lg border border-dark-500/30 p-0.5">
          {NOTE_SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setNoteSize(s.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all
                ${
                  noteSize === s.id
                    ? "bg-brand-indigo/20 text-brand-indigo-light border border-brand-indigo/30"
                    : "text-dark-300 hover:text-dark-100"
                }`}
              title={`${s.label} notes`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full layout
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/60 border border-dark-600/30 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-dark-300">
        <Zap className="w-3.5 h-3.5" />
        <span>AI Config:</span>
      </div>

      {/* Model selector */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700 border border-dark-500/40 text-sm text-white hover:bg-dark-600 transition-all"
        >
          <Cpu className="w-3.5 h-3.5 text-brand-indigo-light" />
          <span>{currentModelInfo?.label || selectedModel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-dark-300" />
        </button>
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[280px] bg-dark-800 border border-dark-500/40 rounded-xl shadow-2xl overflow-hidden">
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModelChange(m.id)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-dark-700 transition-all border-b border-dark-600/30 last:border-0
                    ${m.id === selectedModel ? "bg-brand-indigo/10 text-brand-indigo-light" : "text-dark-100"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.label}</span>
                    {m.supportsThinking && (
                      <span className="badge bg-brand-amber/10 text-brand-amber text-[10px]">
                        thinking
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-dark-300 mt-0.5">
                    {m.description}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thinking toggle */}
      {supportsThinking && (
        <button
          onClick={() => setThinkingOn(!thinkingOn)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
            ${
              thinkingOn
                ? "bg-brand-amber/15 border-brand-amber/40 text-brand-amber-light"
                : "bg-dark-700 border-dark-500/40 text-dark-300 hover:text-white"
            }`}
        >
          <Brain className="w-4 h-4" />
          {thinkingOn ? "Thinking ON" : "Thinking OFF"}
        </button>
      )}

      {/* Note size selector - full */}
      <div className="flex items-center gap-1 bg-dark-700/60 rounded-lg border border-dark-500/30 p-0.5">
        <FileText className="w-3.5 h-3.5 text-dark-300 ml-2" />
        {NOTE_SIZES.map((s) => (
          <button
            key={s.id}
            onClick={() => setNoteSize(s.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all
              ${
                noteSize === s.id
                  ? "bg-brand-indigo/20 text-brand-indigo-light border border-brand-indigo/30"
                  : "text-dark-300 hover:text-white"
              }`}
            title={`${s.label} notes`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Thinking budget slider */}
      {supportsThinking && thinkingOn && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1024}
            max={24576}
            step={1024}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-20 h-1 accent-brand-amber cursor-pointer"
          />
          <span className="text-[10px] text-dark-300 min-w-[40px]">
            {Math.round(budget / 1024)}k
          </span>
        </div>
      )}
    </div>
  );
}
