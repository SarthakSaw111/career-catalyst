// Storage keys
export const STORAGE_KEYS = {
  PROFILE: "cc_profile",
  DSA_PROGRESS: "cc_dsa_progress",
  ML_PROGRESS: "cc_ml_progress",
  SD_PROGRESS: "cc_sd_progress",
  INTERVIEW_HISTORY: "cc_interviews",
  ENGLISH_PROGRESS: "cc_english",
  DAILY_LOGS: "cc_daily_logs",
  CHAT_HISTORY: "cc_chat_history",
  STREAK_DATA: "cc_streak",
  SETTINGS: "cc_settings",
};

// Navigation items
export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/" },
  { id: "dsa", label: "DSA & Coding", icon: "Code2", path: "/dsa" },
  { id: "ml", label: "ML & AI", icon: "Brain", path: "/ml" },
  {
    id: "system-design",
    label: "System Design",
    icon: "Network",
    path: "/system-design",
  },
  { id: "interview", label: "Mock Interview", icon: "Mic", path: "/interview" },
  { id: "english", label: "English Lab", icon: "Languages", path: "/english" },
  { id: "progress", label: "Progress", icon: "TrendingUp", path: "/progress" },
  { id: "settings", label: "Settings", icon: "Settings", path: "/settings" },
];

// DSA difficulty levels
export const DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

// Interview types
export const INTERVIEW_TYPES = {
  BEHAVIORAL: "behavioral",
  TECHNICAL_ML: "technical_ml",
  TECHNICAL_SD: "technical_sd",
  CODING: "coding",
  HR: "hr",
};
