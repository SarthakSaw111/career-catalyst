import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/layout/Sidebar";
import ChatPanel from "./components/layout/ChatPanel";
import DashboardPage from "./pages/DashboardPage";
import DSAPage from "./pages/DSAPage";
import MLPage from "./pages/MLPage";
import SystemDesignPage from "./pages/SystemDesignPage";
import InterviewPage from "./pages/InterviewPage";
import EnglishPage from "./pages/EnglishPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import ModuleBuilderPage from "./pages/ModuleBuilderPage";
import GenericModulePage from "./pages/GenericModulePage";
import AuthPage from "./pages/AuthPage";
import { isSupabaseConnected } from "./services/supabase";
import { Menu } from "lucide-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function AppContent() {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authSkipped, setAuthSkipped] = useState(false);
  const { loading, authLoading, authUser, profile, chatOpen } = useApp();

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-emerald flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <span className="text-xl">⚡</span>
          </div>
          <p className="text-dark-200 text-sm">Loading CareerCatalyst...</p>
        </div>
      </div>
    );
  }

  // Show auth page if Supabase is configured but user is not signed in
  if (isSupabaseConnected() && !authUser && !authSkipped) {
    return <AuthPage onSkip={() => setAuthSkipped(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-dark-950">
      {/* Mobile top bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-dark-900/95 backdrop-blur-lg border-b border-dark-600/50">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-dark-200 hover:text-white hover:bg-dark-700 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-white">CareerCatalyst</h1>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main
        className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ${
          isMobile
            ? "ml-0 pt-14"
            : sidebarCollapsed
              ? "ml-[72px]"
              : "ml-[260px]"
        } ${!isMobile && chatOpen ? "mr-[420px]" : ""}`}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dsa" element={<DSAPage />} />
          <Route path="/ml" element={<MLPage />} />
          <Route path="/system-design" element={<SystemDesignPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/english" element={<EnglishPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/modules" element={<ModuleBuilderPage />} />
          <Route path="/module/:slug" element={<GenericModulePage />} />
        </Routes>
      </main>

      <ChatPanel />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </HashRouter>
  );
}
