import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { initGemini, isGeminiReady } from "../services/gemini";
import {
  initSupabase,
  isSupabaseReady,
  isSupabaseConnected,
  ensureUser,
  getSession,
  onAuthStateChange,
  signIn,
  signUp,
  signOut,
  getUserId,
} from "../services/supabase";
import * as storage from "../store/storage";
import {
  DSA_ROADMAP,
  ML_ROADMAP,
  SD_ROADMAP,
  ENGLISH_TRACKS,
} from "../data/roadmaps";
import {
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_GEMINI_API_KEY,
} from "../config";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// ─── Default built-in modules ───
const BUILTIN_MODULES = [
  {
    id: "builtin-dsa",
    slug: "dsa",
    title: "DSA & Coding",
    description:
      "Data structures, algorithms, and coding patterns for FAANG interviews.",
    icon: "Code2",
    color: "brand-indigo",
    module_type: "practice", // has learn + practice + discuss
    roadmap: DSA_ROADMAP,
    is_builtin: true,
    sort_order: 1,
  },
  {
    id: "builtin-ml",
    slug: "ml",
    title: "ML & AI",
    description: "Machine learning, deep learning, LLMs, and AI fundamentals.",
    icon: "Brain",
    color: "brand-emerald",
    module_type: "learn", // learn + quiz + discuss
    roadmap: ML_ROADMAP,
    is_builtin: true,
    sort_order: 2,
  },
  {
    id: "builtin-sd",
    slug: "system-design",
    title: "System Design",
    description:
      "Distributed systems, ML system design, and architecture patterns.",
    icon: "Network",
    color: "brand-amber",
    module_type: "learn",
    roadmap: SD_ROADMAP,
    is_builtin: true,
    sort_order: 3,
  },
  {
    id: "builtin-interview",
    slug: "interview",
    title: "Mock Interview",
    description: "Behavioral, technical, and coding interview simulations.",
    icon: "Mic",
    color: "brand-indigo",
    module_type: "interview",
    roadmap: [],
    is_builtin: true,
    sort_order: 4,
  },
  {
    id: "builtin-english",
    slug: "english",
    title: "English Lab",
    description:
      "Professional English, grammar, vocabulary, and conversation practice.",
    icon: "Languages",
    color: "brand-emerald",
    module_type: "learn",
    roadmap: ENGLISH_TRACKS,
    is_builtin: true,
    sort_order: 5,
  },
];

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [geminiReady, setGeminiReady] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({
    currentStreak: 0,
    longestStreak: 0,
    activeDays: [],
  });
  const [dsaProgress, setDsaProgress] = useState({
    topics: {},
    totalSolved: 0,
    sessions: [],
  });
  const [mlProgress, setMlProgress] = useState({
    topics: {},
    quizzesTaken: 0,
    conceptsLearned: 0,
  });
  const [sdProgress, setSdProgress] = useState({
    topics: {},
    sessionsCompleted: 0,
  });
  const [englishProgress, setEnglishProgress] = useState({
    lessonsCompleted: 0,
    vocabLearned: [],
    conversationCount: 0,
  });
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [settings, setSettings] = useState({
    dailyGoalMinutes: 120,
    dailyProblems: 3,
  });
  const [chatOpen, setChatOpen] = useState(false);

  // ─── Dynamic modules ───
  const [customModules, setCustomModules] = useState([]);
  const allModules = [...BUILTIN_MODULES, ...customModules];

  // ─── Sync data from Supabase after auth ───
  const syncAllData = useCallback(async (profileName) => {
    if (!isSupabaseReady()) return;
    await ensureUser(profileName || "User");
    await storage.syncFromSupabase();
    const modules = await storage.syncModulesFromSupabase();
    if (modules.length > 0) {
      setCustomModules(modules.filter((m) => !m.is_builtin));
    }
    // Reload local state from synced data
    setStreak(storage.getStreakData());
    setDsaProgress(storage.getDSAProgress());
    setMlProgress(storage.getMLProgress());
    setSdProgress(storage.getSDProgress());
    setEnglishProgress(storage.getEnglishProgress());
    setInterviewHistory(storage.getInterviewHistory());
    const syncedSettings = storage.getSettings();
    setSettings(syncedSettings);
    // Restore Gemini API key from synced settings/profile
    const p = storage.getProfile();
    if (p?.apiKey) {
      setProfile(p);
      const ready = initGemini(p.apiKey);
      setGeminiReady(ready);
    }
  }, []);

  // Load all data on mount
  useEffect(() => {
    async function init() {
      const p = storage.getProfile() || {};

      // Use config defaults if profile doesn't have credentials
      const supaUrl = p.supabaseUrl || DEFAULT_SUPABASE_URL;
      const supaKey = p.supabaseKey || DEFAULT_SUPABASE_ANON_KEY;
      const geminiKey = p.apiKey || DEFAULT_GEMINI_API_KEY;

      // Update profile with defaults if needed
      if (geminiKey && !p.apiKey) p.apiKey = geminiKey;
      if (supaUrl && !p.supabaseUrl) p.supabaseUrl = supaUrl;
      if (supaKey && !p.supabaseKey) p.supabaseKey = supaKey;

      if (p.name || p.apiKey) {
        setProfile(p);
        storage.saveProfile(p);
      }

      if (geminiKey) {
        const ready = initGemini(geminiKey);
        setGeminiReady(ready);
      }

      // Init Supabase
      if (supaUrl && supaKey) {
        const sb = initSupabase(supaUrl, supaKey);
        if (sb) {
          // Check for existing session
          const session = await getSession();
          if (session?.user) {
            setAuthUser(session.user);
            setSupabaseReady(true);
            await syncAllData(p.name);
          }
          // Listen for auth changes
          onAuthStateChange((event, session) => {
            if (session?.user) {
              setAuthUser(session.user);
              setSupabaseReady(true);
            } else {
              setAuthUser(null);
              setSupabaseReady(false);
            }
          });
        }
      }
      // Load local custom modules regardless
      const localMods = storage.getLocalModules();
      if (localMods.length > 0) {
        setCustomModules((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...localMods.filter((m) => !ids.has(m.id))];
        });
      }

      setStreak(storage.getStreakData());
      setDsaProgress(storage.getDSAProgress());
      setMlProgress(storage.getMLProgress());
      setSdProgress(storage.getSDProgress());
      setEnglishProgress(storage.getEnglishProgress());
      setInterviewHistory(storage.getInterviewHistory());
      setSettings(storage.getSettings());
      setAuthLoading(false);
      setLoading(false);
    }
    init();
  }, [syncAllData]);

  const updateProfile = useCallback((newProfile) => {
    setProfile(newProfile);
    storage.saveProfile(newProfile);
    if (newProfile.apiKey) {
      const ready = initGemini(newProfile.apiKey);
      setGeminiReady(ready);
    }
    if (newProfile.supabaseUrl && newProfile.supabaseKey) {
      const sb = initSupabase(newProfile.supabaseUrl, newProfile.supabaseKey);
      if (sb) {
        // Save settings to Supabase (includes API key for recovery)
        if (isSupabaseReady()) {
          ensureUser(newProfile.name);
          // Save profile settings remotely so they survive cache clears
          storage.saveSettings({
            ...storage.getSettings(),
            apiKey: newProfile.apiKey,
            profileName: newProfile.name,
          });
        }
      }
    }
  }, []);

  // ─── Auth handlers ───
  const handleSignUp = useCallback(
    async (email, password) => {
      const result = await signUp(email, password);
      if (result?.user) {
        setAuthUser(result.user);
        setSupabaseReady(true);
        await syncAllData(profile?.name);
      }
      return result;
    },
    [syncAllData, profile],
  );

  const handleSignIn = useCallback(
    async (email, password) => {
      const result = await signIn(email, password);
      if (result?.user) {
        setAuthUser(result.user);
        setSupabaseReady(true);
        // After sign in, sync all data from Supabase → localStorage
        await syncAllData(profile?.name);
      }
      return result;
    },
    [syncAllData, profile],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setAuthUser(null);
    setSupabaseReady(false);
  }, []);

  const updateDSAProgress = useCallback((update) => {
    setDsaProgress((prev) => {
      const next =
        typeof update === "function" ? update(prev) : { ...prev, ...update };
      storage.saveDSAProgress(next);
      return next;
    });
    storage.recordActivity();
    setStreak(storage.getStreakData());
  }, []);

  const updateMLProgress = useCallback((update) => {
    setMlProgress((prev) => {
      const next =
        typeof update === "function" ? update(prev) : { ...prev, ...update };
      storage.saveMLProgress(next);
      return next;
    });
    storage.recordActivity();
    setStreak(storage.getStreakData());
  }, []);

  const updateSDProgress = useCallback((update) => {
    setSdProgress((prev) => {
      const next =
        typeof update === "function" ? update(prev) : { ...prev, ...update };
      storage.saveSDProgress(next);
      return next;
    });
    storage.recordActivity();
    setStreak(storage.getStreakData());
  }, []);

  const updateEnglishProgress = useCallback((update) => {
    setEnglishProgress((prev) => {
      const next =
        typeof update === "function" ? update(prev) : { ...prev, ...update };
      storage.saveEnglishProgress(next);
      return next;
    });
    storage.recordActivity();
    setStreak(storage.getStreakData());
  }, []);

  const addInterviewRecord = useCallback((record) => {
    setInterviewHistory((prev) => {
      const next = [...prev, record];
      storage.saveInterviewHistory(next);
      return next;
    });
    storage.recordActivity();
    setStreak(storage.getStreakData());
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  }, []);

  // ─── Module management ───
  const addCustomModule = useCallback(
    async (moduleData) => {
      const newModule = {
        ...moduleData,
        id: moduleData.id || `custom-${Date.now()}`,
        is_builtin: false,
        sort_order: 100 + customModules.length,
        created_at: new Date().toISOString(),
      };
      setCustomModules((prev) => [...prev, newModule]);
      // Save locally
      const all = storage.getLocalModules();
      storage.saveLocalModules([...all, newModule]);
      // Save to Supabase if connected
      if (isSupabaseReady()) {
        const { createModule } = await import("../services/supabase");
        await createModule(newModule);
      }
      return newModule;
    },
    [customModules],
  );

  const updateCustomModule = useCallback(async (moduleId, updates) => {
    setCustomModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, ...updates } : m)),
    );
    const all = storage
      .getLocalModules()
      .map((m) => (m.id === moduleId ? { ...m, ...updates } : m));
    storage.saveLocalModules(all);
    if (isSupabaseReady()) {
      const { updateModule } = await import("../services/supabase");
      await updateModule(moduleId, updates);
    }
  }, []);

  const deleteCustomModule = useCallback(async (moduleId) => {
    setCustomModules((prev) => prev.filter((m) => m.id !== moduleId));
    const all = storage.getLocalModules().filter((m) => m.id !== moduleId);
    storage.saveLocalModules(all);
    if (isSupabaseReady()) {
      const { deleteModule } = await import("../services/supabase");
      await deleteModule(moduleId);
    }
  }, []);

  const value = {
    profile,
    updateProfile,
    geminiReady,
    supabaseReady,
    loading,
    // Auth
    authUser,
    authLoading,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    // Data
    streak,
    dsaProgress,
    updateDSAProgress,
    mlProgress,
    updateMLProgress,
    sdProgress,
    updateSDProgress,
    englishProgress,
    updateEnglishProgress,
    interviewHistory,
    addInterviewRecord,
    settings,
    updateSettings,
    chatOpen,
    setChatOpen,
    // Module system
    allModules,
    customModules,
    addCustomModule,
    updateCustomModule,
    deleteCustomModule,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
