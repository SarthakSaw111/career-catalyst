import React, { useState, useEffect } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { getTokenUsage, onTokenUsageUpdate } from "../../services/gemini";

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function TokenTracker() {
  const [usage, setUsage] = useState(getTokenUsage());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    return onTokenUsageUpdate((data) => {
      setUsage(getTokenUsage());
    });
  }, []);

  if (usage.total === 0) return null;

  return (
    <div className="glass-card p-3 mx-3 mb-2 animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <Activity className="w-3.5 h-3.5 text-brand-amber flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-dark-200">
              Tokens: {formatNumber(usage.total)}
            </span>
            <span className="text-[10px] text-dark-400">
              ({usage.calls.length} calls)
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-dark-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-dark-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-dark-600/30 space-y-1.5 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-dark-400">Prompt</span>
              <p className="text-dark-200 font-medium">
                {formatNumber(usage.prompt)}
              </p>
            </div>
            <div>
              <span className="text-dark-400">Completion</span>
              <p className="text-dark-200 font-medium">
                {formatNumber(usage.completion)}
              </p>
            </div>
            {usage.thinking > 0 && (
              <div>
                <span className="text-dark-400">Thinking</span>
                <p className="text-dark-200 font-medium">
                  {formatNumber(usage.thinking)}
                </p>
              </div>
            )}
            <div>
              <span className="text-dark-400">Total</span>
              <p className="text-white font-semibold">
                {formatNumber(usage.total)}
              </p>
            </div>
          </div>

          {/* Last 5 calls */}
          {usage.calls.length > 0 && (
            <div className="mt-2">
              <p className="text-[9px] text-dark-400 uppercase tracking-wider mb-1">
                Recent calls
              </p>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {usage.calls
                  .slice(-5)
                  .reverse()
                  .map((call, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <span className="text-dark-300 truncate">
                        {call.model
                          .replace("gemini-", "")
                          .replace("-preview-06-17", "")}
                      </span>
                      <span className="text-dark-200 tabular-nums">
                        {formatNumber(call.total)} tok
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
