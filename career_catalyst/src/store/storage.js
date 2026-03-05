import { STORAGE_KEYS } from "../utils/constants";
import * as sb from "../services/supabase";

// ─── Local helpers ───
export function getItem(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (err) {
    console.error(`Error reading ${key}:`, err);
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Error writing ${key}:`, err);
    return false;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Error removing ${key}:`, err);
    return false;
  }
}

// ─── Content Cache (Supabase + localStorage) ───
// Key format: "module:topic:subtopic" or any unique string
export async function getCachedContent(contentKey) {
  // 1. Check localStorage first (instant)
  const local = getItem(`cc_cache_${contentKey}`);
  if (local) return local;

  // 2. Check Supabase (if connected)
  const remote = await sb.getCachedContent(contentKey);
  if (remote) {
    // Hydrate localStorage
    setItem(`cc_cache_${contentKey}`, remote);
    return remote;
  }
  return null;
}

export async function setCachedContent(contentKey, content, module, topic) {
  const record = { content, created_at: new Date().toISOString() };
  // Write to localStorage immediately
  setItem(`cc_cache_${contentKey}`, record);
  // Write to Supabase in background
  sb.setCachedContent(contentKey, content, module, topic);
  return true;
}

// ─── Profile ───
export function getProfile() {
  return getItem(STORAGE_KEYS.PROFILE) || null;
}

export function saveProfile(profile) {
  setItem(STORAGE_KEYS.PROFILE, profile);
  // Sync to Supabase
  if (sb.isSupabaseReady()) {
    sb.ensureUser(profile.name);
  }
  return true;
}

// ─── Generic progress (works for any module) ───
export function getModuleProgress(moduleSlug) {
  return getItem(`cc_progress_${moduleSlug}`) || { topics: {}, stats: {} };
}

export function saveModuleProgress(moduleSlug, data) {
  setItem(`cc_progress_${moduleSlug}`, data);
  sb.saveProgress(moduleSlug, data);
  return true;
}

// ─── Legacy progress getters (backward compat) ───
export function getDSAProgress() {
  return (
    getItem(STORAGE_KEYS.DSA_PROGRESS) || {
      topics: {},
      totalSolved: 0,
      sessions: [],
    }
  );
}
export function saveDSAProgress(progress) {
  setItem(STORAGE_KEYS.DSA_PROGRESS, progress);
  sb.saveProgress("dsa", progress);
}

export function getMLProgress() {
  return (
    getItem(STORAGE_KEYS.ML_PROGRESS) || {
      topics: {},
      quizzesTaken: 0,
      conceptsLearned: 0,
    }
  );
}
export function saveMLProgress(progress) {
  setItem(STORAGE_KEYS.ML_PROGRESS, progress);
  sb.saveProgress("ml", progress);
}

export function getSDProgress() {
  return (
    getItem(STORAGE_KEYS.SD_PROGRESS) || { topics: {}, sessionsCompleted: 0 }
  );
}
export function saveSDProgress(progress) {
  setItem(STORAGE_KEYS.SD_PROGRESS, progress);
  sb.saveProgress("system-design", progress);
}

export function getInterviewHistory() {
  return getItem(STORAGE_KEYS.INTERVIEW_HISTORY) || [];
}
export function saveInterviewHistory(history) {
  setItem(STORAGE_KEYS.INTERVIEW_HISTORY, history);
  sb.saveProgress("interview", { history });
}

export function getEnglishProgress() {
  return (
    getItem(STORAGE_KEYS.ENGLISH_PROGRESS) || {
      lessonsCompleted: 0,
      vocabLearned: [],
      conversationCount: 0,
    }
  );
}
export function saveEnglishProgress(progress) {
  setItem(STORAGE_KEYS.ENGLISH_PROGRESS, progress);
  sb.saveProgress("english", progress);
}

// ─── Streak ───
export function getStreakData() {
  return (
    getItem(STORAGE_KEYS.STREAK_DATA) || {
      currentStreak: 0,
      longestStreak: 0,
      activeDays: [],
    }
  );
}

export function saveStreakData(data) {
  setItem(STORAGE_KEYS.STREAK_DATA, data);
  sb.saveRemoteStreak(data);
}

export function recordActivity() {
  const today = new Date().toISOString().split("T")[0];
  const streak = getStreakData();

  if (!streak.activeDays.includes(today)) {
    streak.activeDays.push(today);
    const sortedDays = [...streak.activeDays].sort().reverse();
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const curr = new Date(sortedDays[i - 1]);
      const prev = new Date(sortedDays[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) currentStreak++;
      else break;
    }
    streak.currentStreak = currentStreak;
    streak.longestStreak = Math.max(streak.longestStreak, currentStreak);
    saveStreakData(streak);
  }
  return streak;
}

// ─── Chat History ───
export function getChatHistory(module) {
  const allChats = getItem(STORAGE_KEYS.CHAT_HISTORY) || {};
  return allChats[module] || [];
}

export function saveChatMessage(module, message) {
  const allChats = getItem(STORAGE_KEYS.CHAT_HISTORY) || {};
  if (!allChats[module]) allChats[module] = [];
  allChats[module].push(message);
  if (allChats[module].length > 100) {
    allChats[module] = allChats[module].slice(-100);
  }
  setItem(STORAGE_KEYS.CHAT_HISTORY, allChats);
}

export function clearChatHistory(module) {
  const allChats = getItem(STORAGE_KEYS.CHAT_HISTORY) || {};
  allChats[module] = [];
  setItem(STORAGE_KEYS.CHAT_HISTORY, allChats);
}

// ─── Settings ───
export function getSettings() {
  return (
    getItem(STORAGE_KEYS.SETTINGS) || {
      dailyGoalMinutes: 120,
      dailyProblems: 3,
    }
  );
}

export function saveSettings(settings) {
  setItem(STORAGE_KEYS.SETTINGS, settings);
  sb.saveRemoteSettings(settings);
}

// ─── Modules ───
export function getLocalModules() {
  return getItem("cc_modules") || [];
}

export function saveLocalModules(modules) {
  setItem("cc_modules", modules);
  // Also persist to Supabase progress table for recovery
  if (sb.isSupabaseReady()) {
    sb.saveProgress("_custom_modules", { modules });
  }
}

// Sync: pull modules from Supabase into local
export async function syncModulesFromSupabase() {
  if (!sb.isSupabaseReady()) return getLocalModules();

  // Try the modules table first
  const remote = await sb.getModules();
  if (remote && remote.length > 0) {
    saveLocalModules(remote);
    return remote;
  }

  // Fallback: check progress-based backup
  const backup = await sb.getProgress("_custom_modules");
  if (backup?.modules?.length > 0) {
    setItem("cc_modules", backup.modules);
    // Re-save to modules table
    for (const mod of backup.modules) {
      await sb.createModule(mod);
    }
    return backup.modules;
  }

  return getLocalModules();
}

// Sync all data from Supabase → localStorage on init
export async function syncFromSupabase() {
  if (!sb.isSupabaseReady()) return;

  // Sync settings (includes API key if saved)
  const remoteSettings = await sb.getRemoteSettings();
  if (remoteSettings) {
    // Extract custom roadmaps if stored in settings
    if (remoteSettings._customRoadmaps) {
      const localRoadmaps = getItem(CUSTOM_ROADMAPS_KEY) || {};
      const merged = { ...localRoadmaps, ...remoteSettings._customRoadmaps };
      setItem(CUSTOM_ROADMAPS_KEY, merged);
    }

    // Merge settings into localStorage (exclude internal keys)
    const { _customRoadmaps, ...cleanSettings } = remoteSettings;
    const localSettings = getSettings();
    const mergedSettings = { ...localSettings, ...cleanSettings };
    setItem(STORAGE_KEYS.SETTINGS, mergedSettings);

    // If settings contain API key, restore it to profile
    if (remoteSettings.apiKey) {
      const profile = getProfile() || {};
      if (!profile.apiKey) {
        profile.apiKey = remoteSettings.apiKey;
        if (remoteSettings.profileName)
          profile.name = remoteSettings.profileName;
        saveProfile(profile);
      }
    }
  }

  // Sync streak
  const remoteStreak = await sb.getRemoteStreak();
  if (remoteStreak) {
    const localStreak = getStreakData();
    if (
      (remoteStreak.activeDays?.length || 0) >
      (localStreak.activeDays?.length || 0)
    ) {
      setItem(STORAGE_KEYS.STREAK_DATA, remoteStreak);
    }
  }

  // Sync progress for known modules
  for (const mod of ["dsa", "ml", "system-design", "interview", "english"]) {
    const remoteProg = await sb.getProgress(mod);
    if (remoteProg) {
      const keyMap = {
        dsa: STORAGE_KEYS.DSA_PROGRESS,
        ml: STORAGE_KEYS.ML_PROGRESS,
        "system-design": STORAGE_KEYS.SD_PROGRESS,
        interview: STORAGE_KEYS.INTERVIEW_HISTORY,
        english: STORAGE_KEYS.ENGLISH_PROGRESS,
      };
      setItem(keyMap[mod], remoteProg);
    }
  }
}

// ─── Custom Roadmaps (user-edited built-in module roadmaps) ───
const CUSTOM_ROADMAPS_KEY = "cc_custom_roadmaps";

export function getCustomRoadmap(moduleSlug) {
  const all = getItem(CUSTOM_ROADMAPS_KEY) || {};
  return all[moduleSlug] || null;
}

export function saveCustomRoadmap(moduleSlug, roadmap) {
  const all = getItem(CUSTOM_ROADMAPS_KEY) || {};
  all[moduleSlug] = roadmap;
  setItem(CUSTOM_ROADMAPS_KEY, all);
  // Sync to Supabase as part of settings (survives cache clears)
  if (sb.isSupabaseReady()) {
    sb.saveRemoteSettings({ ...getSettings(), _customRoadmaps: all });
  }
}

export function resetRoadmapToDefault(moduleSlug) {
  const all = getItem(CUSTOM_ROADMAPS_KEY) || {};
  delete all[moduleSlug];
  setItem(CUSTOM_ROADMAPS_KEY, all);
  if (sb.isSupabaseReady()) {
    sb.saveRemoteSettings({ ...getSettings(), _customRoadmaps: all });
  }
}
