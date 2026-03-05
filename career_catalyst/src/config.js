// ─── App Configuration ───
// Set your credentials here. These are used as defaults on first load
// and as fallbacks if localStorage is cleared.
//
// For security in production, use environment variables instead:
//   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

export const DEFAULT_SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Set your Gemini API key here if you want it pre-configured
export const DEFAULT_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
