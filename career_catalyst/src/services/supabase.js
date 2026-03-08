import { createClient } from "@supabase/supabase-js";

let supabase = null;
let userId = null;

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) return null;
  try {
    supabase = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabase;
  } catch (err) {
    console.error("Supabase init error:", err);
    return null;
  }
}

export function getSupabase() {
  return supabase;
}

export function isSupabaseReady() {
  return supabase !== null && userId !== null;
}

export function isSupabaseConnected() {
  return supabase !== null;
}

// ─── Auth ───
export async function signUp(email, password) {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data?.user) {
    userId = data.user.id;
    // Create profile row
    await supabase.from("profiles").upsert(
      {
        id: userId,
        name: email.split("@")[0],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }
  return data;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (data?.user) {
    userId = data.user.id;
    // Ensure profile exists
    await supabase.from("profiles").upsert(
      {
        id: userId,
        name: email.split("@")[0],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  userId = null;
}

export async function getSession() {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) {
    userId = session.user.id;
  }
  return session;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      userId = session.user.id;
    } else {
      userId = null;
    }
    callback(event, session);
  });
}

// Legacy compat: ensureUser for existing code
export async function ensureUser(profileName) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        name: profileName || "User",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select()
    .single();
  if (error) console.error("Profile upsert error:", error);
  return data;
}

export function getUserId() {
  return userId;
}

// ─── Generated Content Cache ───
export async function getCachedContent(contentKey) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("generated_content")
    .select("content, created_at")
    .eq("user_id", getUserId())
    .eq("content_key", contentKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Cache read error:", error);
    return null;
  }
  return data;
}

export async function setCachedContent(
  contentKey,
  content,
  module = null,
  topic = null,
) {
  if (!supabase) return false;
  const { error } = await supabase.from("generated_content").upsert(
    {
      user_id: getUserId(),
      content_key: contentKey,
      content,
      module,
      topic,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,content_key" },
  );

  if (error) {
    console.error("Cache write error:", error);
    return false;
  }
  return true;
}

// ─── Modules (dynamic roadmaps) ───
export async function getModules() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .or(`user_id.eq.${getUserId()},is_builtin.eq.true`)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Get modules error:", error);
    return [];
  }
  return data || [];
}

export async function getModule(moduleId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();

  if (error) {
    console.error("Get module error:", error);
    return null;
  }
  return data;
}

export async function createModule(moduleData) {
  if (!supabase) return null;
  // Strip 'id' — let Supabase auto-generate a UUID
  const { id, ...rest } = moduleData;
  const { data, error } = await supabase
    .from("modules")
    .insert({
      user_id: getUserId(),
      ...rest,
      is_builtin: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Create module error:", error);
    return null;
  }
  return data;
}

export async function updateModule(moduleId, updates) {
  if (!supabase) return null;
  // Use slug for lookup since local ID may not match Supabase UUID
  const slug = updates.slug || moduleId;
  const { id, ...safeUpdates } = updates;
  const { data, error } = await supabase
    .from("modules")
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq("user_id", getUserId())
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    console.error("Update module error:", error);
    return null;
  }
  return data;
}

export async function deleteModule(moduleId) {
  if (!supabase) return false;
  // Use slug for deletion since local ID may not match Supabase UUID
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("user_id", getUserId())
    .eq("slug", moduleId)
    .eq("is_builtin", false);

  if (error) {
    console.error("Delete module error:", error);
    return false;
  }
  return true;
}

// ─── Progress ───
export async function getProgress(module) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("progress")
    .select("data")
    .eq("user_id", getUserId())
    .eq("module", module)
    .maybeSingle();

  if (error) {
    console.error("Get progress error:", error);
    return null;
  }
  return data?.data || null;
}

export async function saveProgress(module, progressData) {
  if (!supabase) return false;
  const { error } = await supabase.from("progress").upsert(
    {
      user_id: getUserId(),
      module,
      data: progressData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module" },
  );

  if (error) {
    console.error("Save progress error:", error);
    return false;
  }
  return true;
}

// ─── Settings ───
export async function getRemoteSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", getUserId())
    .maybeSingle();

  if (error) return null;
  return data?.data || null;
}

export async function saveRemoteSettings(settingsData) {
  if (!supabase) return false;
  const { error } = await supabase.from("settings").upsert(
    {
      user_id: getUserId(),
      data: settingsData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Save settings error:", error);
    return false;
  }
  return true;
}

// ─── Streak / Activity ───
export async function getRemoteStreak() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("streaks")
    .select("data")
    .eq("user_id", getUserId())
    .maybeSingle();

  if (error) return null;
  return data?.data || null;
}

export async function saveRemoteStreak(streakData) {
  if (!supabase) return false;
  const { error } = await supabase.from("streaks").upsert(
    {
      user_id: getUserId(),
      data: streakData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return false;
  return true;
}

// ─── Token Usage ───
export async function saveTokenUsage(entry) {
  if (!supabase || !getUserId()) return false;
  const date = new Date().toISOString().split("T")[0];
  // Upsert: aggregate per user+date+model
  const { data: existing } = await supabase
    .from("token_usage")
    .select(
      "prompt_tokens, completion_tokens, thinking_tokens, total_tokens, call_count",
    )
    .eq("user_id", getUserId())
    .eq("date", date)
    .eq("model", entry.model)
    .maybeSingle();

  const row = {
    user_id: getUserId(),
    date,
    model: entry.model,
    prompt_tokens: (existing?.prompt_tokens || 0) + (entry.prompt || 0),
    completion_tokens:
      (existing?.completion_tokens || 0) + (entry.completion || 0),
    thinking_tokens: (existing?.thinking_tokens || 0) + (entry.thinking || 0),
    total_tokens: (existing?.total_tokens || 0) + (entry.total || 0),
    call_count: (existing?.call_count || 0) + 1,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("token_usage")
    .upsert(row, { onConflict: "user_id,date,model" });

  if (error) {
    console.error("Token usage save error:", error);
    return false;
  }
  return true;
}

export async function getTokenUsageHistory(days = 30) {
  if (!supabase || !getUserId()) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("token_usage")
    .select("*")
    .eq("user_id", getUserId())
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) {
    console.error("Token usage read error:", error);
    return [];
  }
  return data || [];
}
