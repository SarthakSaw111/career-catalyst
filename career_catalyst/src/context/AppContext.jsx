import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { initGemini, isGeminiReady } from "../services/gemini";
import * as storage from "../store/storage";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [geminiReady, setGeminiReady] = useState(false);
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

  // Load all data on mount
  useEffect(() => {
    const p = storage.getProfile();
    if (p) {
      setProfile(p);
      if (p.apiKey) {
        const ready = initGemini(p.apiKey);
        setGeminiReady(ready);
      }
    }
    setStreak(storage.getStreakData());
    setDsaProgress(storage.getDSAProgress());
    setMlProgress(storage.getMLProgress());
    setSdProgress(storage.getSDProgress());
    setEnglishProgress(storage.getEnglishProgress());
    setInterviewHistory(storage.getInterviewHistory());
    setSettings(storage.getSettings());
    setLoading(false);
  }, []);

  const updateProfile = useCallback((newProfile) => {
    setProfile(newProfile);
    storage.saveProfile(newProfile);
    if (newProfile.apiKey) {
      const ready = initGemini(newProfile.apiKey);
      setGeminiReady(ready);
    }
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

  const value = {
    profile,
    updateProfile,
    geminiReady,
    loading,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
