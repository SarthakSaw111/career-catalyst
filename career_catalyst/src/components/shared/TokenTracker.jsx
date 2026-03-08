import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar,
  Zap,
} from "lucide-react";
import {
  getTokenUsage,
  getTokenUsageHistory,
  onTokenUsageUpdate,
} from "../../services/gemini";

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function MiniBar({ value, max, color = "bg-brand-indigo" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-dark-700 rounded-full h-1.5">
      <div
        className={`${color} h-1.5 rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function TokenTracker() {
  const [usage, setUsage] = useState(getTokenUsage());
  const [expanded, setExpanded] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    return onTokenUsageUpdate(() => {
      setUsage(getTokenUsage());
    });
  }, []);

  // Auto-load history on mount so we can show data even after refresh
  useEffect(() => {
    let cancelled = false;
    getTokenUsageHistory(30)
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
          setHistoryLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (history.length > 0) {
      setShowDashboard(!showDashboard);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await getTokenUsageHistory(30);
      setHistory(data);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
    setShowDashboard(true);
  }, [history.length]);

  // Aggregate history by date
  const dailyTotals = React.useMemo(() => {
    const map = {};
    for (const row of history) {
      if (!map[row.date])
        map[row.date] = {
          date: row.date,
          total: 0,
          prompt: 0,
          completion: 0,
          thinking: 0,
          calls: 0,
          models: {},
        };
      map[row.date].total += row.total_tokens || 0;
      map[row.date].prompt += row.prompt_tokens || 0;
      map[row.date].completion += row.completion_tokens || 0;
      map[row.date].thinking += row.thinking_tokens || 0;
      map[row.date].calls += row.call_count || 0;
      const m = (row.model || "")
        .replace("gemini-", "")
        .replace("-preview-06-17", "");
      map[row.date].models[m] =
        (map[row.date].models[m] || 0) + (row.total_tokens || 0);
    }
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [history]);

  const allTimeTotal = dailyTotals.reduce((s, d) => s + d.total, 0);
  const allTimeCalls = dailyTotals.reduce((s, d) => s + d.calls, 0);
  const maxDayTokens = Math.max(...dailyTotals.map((d) => d.total), 1);

  if (usage.total === 0 && dailyTotals.length === 0 && historyLoaded)
    return null;
  if (usage.total === 0 && !historyLoaded) return null;

  const displayTotal = usage.total > 0 ? usage.total : allTimeTotal;
  const displayCalls =
    usage.calls.length > 0 ? usage.calls.length : allTimeCalls;

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
              Tokens: {formatNumber(displayTotal)}
            </span>
            <span className="text-[10px] text-dark-400">
              ({displayCalls} calls
              {usage.total === 0 && allTimeTotal > 0 ? " total" : ""})
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
          {/* Session stats */}
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
              <span className="text-dark-400">Session Total</span>
              <p className="text-white font-semibold">
                {formatNumber(usage.total)}
              </p>
            </div>
          </div>

          {/* Recent calls */}
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

          {/* Dashboard toggle */}
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="w-full mt-2 py-1.5 px-3 rounded-lg text-[10px] font-medium bg-dark-700/50 border border-dark-500/30 text-dark-200 hover:text-white hover:border-dark-400 transition-all flex items-center justify-center gap-1.5"
          >
            {historyLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : showDashboard ? (
              <>
                <ChevronUp className="w-3 h-3" /> Hide Dashboard
              </>
            ) : (
              <>
                <BarChart3 className="w-3 h-3" /> Usage Dashboard
              </>
            )}
          </button>

          {/* Full Dashboard */}
          {showDashboard && !historyLoading && (
            <div className="mt-2 pt-2 border-t border-dark-600/30 space-y-3 animate-fade-in">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-800/50 rounded-lg p-2 text-center">
                  <Zap className="w-3.5 h-3.5 text-brand-amber mx-auto mb-1" />
                  <p className="text-[10px] text-dark-400">All Time</p>
                  <p className="text-xs font-bold text-white">
                    {formatNumber(allTimeTotal + usage.total)}
                  </p>
                </div>
                <div className="bg-dark-800/50 rounded-lg p-2 text-center">
                  <Activity className="w-3.5 h-3.5 text-brand-emerald mx-auto mb-1" />
                  <p className="text-[10px] text-dark-400">Total Calls</p>
                  <p className="text-xs font-bold text-white">
                    {allTimeCalls + usage.calls.length}
                  </p>
                </div>
                <div className="bg-dark-800/50 rounded-lg p-2 text-center">
                  <Calendar className="w-3.5 h-3.5 text-brand-indigo mx-auto mb-1" />
                  <p className="text-[10px] text-dark-400">Active Days</p>
                  <p className="text-xs font-bold text-white">
                    {dailyTotals.length}
                  </p>
                </div>
              </div>

              {/* Daily breakdown chart */}
              {dailyTotals.length > 0 && (
                <div>
                  <p className="text-[9px] text-dark-400 uppercase tracking-wider mb-2">
                    Daily Usage (Last 30 days)
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {dailyTotals.slice(0, 14).map((day) => (
                      <div key={day.date} className="group">
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-dark-300">
                            {new Date(
                              day.date + "T12:00:00",
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              weekday: "short",
                            })}
                          </span>
                          <span className="text-dark-200 tabular-nums font-medium">
                            {formatNumber(day.total)}{" "}
                            <span className="text-dark-400">
                              · {day.calls} calls
                            </span>
                          </span>
                        </div>
                        <MiniBar
                          value={day.total}
                          max={maxDayTokens}
                          color="bg-brand-indigo"
                        />
                        {/* Model breakdown on hover/always visible */}
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {Object.entries(day.models).map(([model, tokens]) => (
                            <span
                              key={model}
                              className="text-[9px] text-dark-400"
                            >
                              {model}: {formatNumber(tokens)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dailyTotals.length === 0 && (
                <p className="text-[10px] text-dark-400 text-center py-3">
                  No usage history yet. Token data persists after each API call.
                </p>
              )}

              <button
                onClick={() => setShowDashboard(false)}
                className="w-full py-1 text-[10px] text-dark-400 hover:text-dark-200"
              >
                Close Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
