import React from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  LayoutDashboard,
  Code2,
  Brain,
  Network,
  Mic,
  Languages,
  TrendingUp,
  Settings,
  Flame,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  Code2,
  Brain,
  Network,
  Mic,
  Languages,
  TrendingUp,
  Settings,
};

const navItems = [
  { path: "/", icon: "LayoutDashboard", label: "Dashboard" },
  { path: "/dsa", icon: "Code2", label: "DSA & Coding" },
  { path: "/ml", icon: "Brain", label: "ML & AI" },
  { path: "/system-design", icon: "Network", label: "System Design" },
  { path: "/interview", icon: "Mic", label: "Mock Interview" },
  { path: "/english", icon: "Languages", label: "English Lab" },
  { path: "/progress", icon: "TrendingUp", label: "Progress" },
  { path: "/settings", icon: "Settings", label: "Settings" },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { streak, setChatOpen } = useApp();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-dark-900 border-r border-dark-600/50
        flex flex-col z-40 transition-all duration-300 ${collapsed ? "w-[72px]" : "w-[260px]"}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-600/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-emerald flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-base font-bold text-white leading-tight">
              CareerCatalyst
            </h1>
            <p className="text-[10px] text-dark-200 uppercase tracking-wider">
              AI Learning Engine
            </p>
          </div>
        )}
      </div>

      {/* Streak */}
      {!collapsed && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-dark-700/50 border border-dark-500/30 animate-fade-in">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-semibold text-white">
              {streak.currentStreak} day streak
            </span>
          </div>
          <p className="text-xs text-dark-200 mt-1">
            Best: {streak.longestStreak} days
          </p>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center mt-4">
          <div className="w-10 h-10 rounded-xl bg-dark-700/50 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${
                  isActive
                    ? "bg-brand-indigo/15 text-brand-indigo-light font-medium"
                    : "text-dark-200 hover:bg-dark-700 hover:text-white"
                }
                ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? item.label : ""}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm animate-fade-in">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-dark-600/50 space-y-2">
        <button
          onClick={() => setChatOpen(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            bg-brand-indigo/10 text-brand-indigo-light hover:bg-brand-indigo/20 transition-all
            ${collapsed ? "justify-center" : ""}`}
          title="AI Chat"
        >
          <MessageCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">AI Chat</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-dark-300 hover:text-white hover:bg-dark-700/50 transition-all
            ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
