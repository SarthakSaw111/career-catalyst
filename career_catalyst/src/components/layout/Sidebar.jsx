import React from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import TokenTracker from "../shared/TokenTracker";
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
  PlusCircle,
  BookOpen,
  LogOut,
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
  BookOpen,
};

// Static nav items for top and bottom of nav
const topNavItems = [
  { path: "/", icon: "LayoutDashboard", label: "Dashboard" },
];

// Built-in module slug → route mapping (these use dedicated pages)
const builtinRoutes = {
  dsa: "/dsa",
  ml: "/ml",
  "system-design": "/system-design",
  interview: "/interview",
  english: "/english",
};

const builtinIcons = {
  dsa: "Code2",
  ml: "Brain",
  "system-design": "Network",
  interview: "Mic",
  english: "Languages",
};

const bottomNavItems = [
  { path: "/progress", icon: "TrendingUp", label: "Progress" },
  { path: "/settings", icon: "Settings", label: "Settings" },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const {
    streak,
    setChatOpen,
    allModules,
    customModules,
    authUser,
    handleSignOut,
  } = useApp();

  // Build nav items dynamically:
  // 1. Dashboard
  // 2. Built-in modules from allModules (use dedicated routes)
  // 3. Custom modules (use /module/:slug)
  // 4. Create Module button
  // 5. Progress, Settings
  const builtinModuleNav = allModules
    .filter((m) => m.is_builtin && builtinRoutes[m.slug])
    .map((m) => ({
      path: builtinRoutes[m.slug],
      icon: builtinIcons[m.slug] || "BookOpen",
      label: m.title,
    }));

  const customModuleNav = (customModules || []).map((m) => ({
    path: `/module/${m.slug}`,
    icon: "BookOpen",
    label: m.title,
    emoji: m.icon,
  }));

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
        {/* Dashboard */}
        {topNavItems.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive ? "bg-brand-indigo/15 text-brand-indigo-light font-medium" : "text-dark-200 hover:bg-dark-700 hover:text-white"}
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

        {/* Divider: Learning Modules */}
        {!collapsed && (
          <div className="pt-3 pb-1 px-3">
            <span className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold">
              Modules
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 border-t border-dark-600/30" />}

        {/* Built-in modules */}
        {builtinModuleNav.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive ? "bg-brand-indigo/15 text-brand-indigo-light font-medium" : "text-dark-200 hover:bg-dark-700 hover:text-white"}
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

        {/* Custom modules */}
        {customModuleNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
              ${isActive ? "bg-brand-indigo/15 text-brand-indigo-light font-medium" : "text-dark-200 hover:bg-dark-700 hover:text-white"}
              ${collapsed ? "justify-center" : ""}`
            }
            title={collapsed ? item.label : ""}
          >
            {item.emoji ? (
              <span className="text-lg flex-shrink-0 w-5 text-center">
                {item.emoji}
              </span>
            ) : (
              <BookOpen className="w-5 h-5 flex-shrink-0" />
            )}
            {!collapsed && (
              <span className="text-sm animate-fade-in">{item.label}</span>
            )}
          </NavLink>
        ))}

        {/* Create Module button */}
        <NavLink
          to="/modules"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mt-1
            ${isActive ? "bg-brand-emerald/15 text-brand-emerald font-medium" : "text-dark-300 hover:bg-dark-700 hover:text-brand-emerald"}
            ${collapsed ? "justify-center" : ""}`
          }
          title={collapsed ? "Create Module" : ""}
        >
          <PlusCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm animate-fade-in">Create Module</span>
          )}
        </NavLink>

        {/* Divider */}
        {!collapsed && <div className="my-1" />}
        {collapsed && <div className="my-2 mx-2 border-t border-dark-600/30" />}

        {/* Bottom static items */}
        {bottomNavItems.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive ? "bg-brand-indigo/15 text-brand-indigo-light font-medium" : "text-dark-200 hover:bg-dark-700 hover:text-white"}
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
      <div className="border-t border-dark-600/50">
        {/* Token tracker */}
        {!collapsed && (
          <div className="pt-2">
            <TokenTracker />
          </div>
        )}

        <div className="p-3 space-y-2">
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

          {/* Auth info + Sign Out */}
          {authUser && (
            <div className={`${collapsed ? "flex justify-center" : ""}`}>
              {!collapsed && (
                <p
                  className="text-[10px] text-dark-400 px-3 mb-1 truncate"
                  title={authUser.email}
                >
                  {authUser.email}
                </p>
              )}
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl
                text-dark-300 hover:text-red-400 hover:bg-red-500/10 transition-all
                ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? "Sign Out" : ""}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs">Sign Out</span>}
              </button>
            </div>
          )}

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
      </div>
    </aside>
  );
}
