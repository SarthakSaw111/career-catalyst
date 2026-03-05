import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  SkipForward,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { isSupabaseConnected } from "../services/supabase";

export default function AuthPage({ onSkip }) {
  const { handleSignIn, handleSignUp, profile } = useApp();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        await handleSignIn(email.trim(), password);
      } else {
        const result = await handleSignUp(email.trim(), password);
        // Supabase may require email confirmation
        if (result?.user && !result.session) {
          setSuccess(
            "Account created! Check your email to confirm, then log in.",
          );
          setMode("login");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
    setLoading(false);
  };

  const supabaseConnected = isSupabaseConnected();

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-emerald flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-indigo/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CareerCatalyst</h1>
          <p className="text-dark-300 text-sm mt-1">
            AI-Powered Learning Assistant
          </p>
        </div>

        {!supabaseConnected && (
          <div className="glass-card p-5 mb-6 border-brand-amber/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-brand-amber flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-amber">
                  Supabase not configured
                </p>
                <p className="text-xs text-dark-300 mt-1">
                  Set your Supabase URL and Anon Key in Settings first.
                  Authentication requires a Supabase connection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="glass-card p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-dark-800/50 rounded-xl p-1">
            <button
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === "login"
                  ? "bg-brand-indigo/20 text-brand-indigo-light"
                  : "text-dark-300 hover:text-white"
              }`}
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === "signup"
                  ? "bg-brand-emerald/20 text-brand-emerald"
                  : "text-dark-300 hover:text-white"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field w-full"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field w-full pr-10"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {success && (
              <div className="text-xs text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !supabaseConnected ||
                !email.trim() ||
                !password.trim()
              }
              className={`w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                mode === "login"
                  ? "bg-brand-indigo hover:bg-brand-indigo/80 text-white"
                  : "bg-brand-emerald hover:bg-brand-emerald/80 text-white"
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-dark-400 text-center mt-4">
            {mode === "login"
              ? "Your data is synced to Supabase and will persist across devices."
              : "Uses Supabase Auth. Password must be at least 6 characters."}
          </p>
        </div>

        {/* Skip auth notice */}
        <div className="text-center mt-4 space-y-2">
          <p className="text-[11px] text-dark-500">
            Without signing in, data is stored in localStorage only and may be
            lost if cleared.
          </p>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs text-dark-400 hover:text-dark-200 flex items-center gap-1.5 mx-auto transition-colors"
            >
              <SkipForward className="w-3 h-3" /> Continue without signing in
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
