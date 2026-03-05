import { STORAGE_KEYS } from "../utils/constants";

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

// Profile
export function getProfile() {
  return getItem(STORAGE_KEYS.PROFILE) || null;
}

export function saveProfile(profile) {
  return setItem(STORAGE_KEYS.PROFILE, profile);
}

// DSA Progress
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
  return setItem(STORAGE_KEYS.DSA_PROGRESS, progress);
}

// ML Progress
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
  return setItem(STORAGE_KEYS.ML_PROGRESS, progress);
}

// System Design Progress
export function getSDProgress() {
  return (
    getItem(STORAGE_KEYS.SD_PROGRESS) || { topics: {}, sessionsCompleted: 0 }
  );
}

export function saveSDProgress(progress) {
  return setItem(STORAGE_KEYS.SD_PROGRESS, progress);
}

// Interview History
export function getInterviewHistory() {
  return getItem(STORAGE_KEYS.INTERVIEW_HISTORY) || [];
}

export function saveInterviewHistory(history) {
  return setItem(STORAGE_KEYS.INTERVIEW_HISTORY, history);
}

// English Progress
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
  return setItem(STORAGE_KEYS.ENGLISH_PROGRESS, progress);
}

// Streak
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
  return setItem(STORAGE_KEYS.STREAK_DATA, data);
}

export function recordActivity() {
  const today = new Date().toISOString().split("T")[0];
  const streak = getStreakData();

  if (!streak.activeDays.includes(today)) {
    streak.activeDays.push(today);

    // Calculate current streak
    const sortedDays = [...streak.activeDays].sort().reverse();
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const curr = new Date(sortedDays[i - 1]);
      const prev = new Date(sortedDays[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    streak.currentStreak = currentStreak;
    streak.longestStreak = Math.max(streak.longestStreak, currentStreak);
    saveStreakData(streak);
  }

  return streak;
}

// Chat History (per module)
export function getChatHistory(module) {
  const allChats = getItem(STORAGE_KEYS.CHAT_HISTORY) || {};
  return allChats[module] || [];
}

export function saveChatMessage(module, message) {
  const allChats = getItem(STORAGE_KEYS.CHAT_HISTORY) || {};
  if (!allChats[module]) allChats[module] = [];
  allChats[module].push(message);
  // Keep last 100 messages per module
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

// Settings
export function getSettings() {
  return (
    getItem(STORAGE_KEYS.SETTINGS) || {
      dailyGoalMinutes: 120,
      dailyProblems: 3,
      notificationsEnabled: true,
    }
  );
}

export function saveSettings(settings) {
  return setItem(STORAGE_KEYS.SETTINGS, settings);
}
