import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export function loadBotSession(cwd = process.cwd()) {
  const p = path.resolve(cwd, "../secrets/businessos-bot-session.json");
  const raw = fs.readFileSync(p, "utf8");
  return { path: p, session: JSON.parse(raw) };
}

export async function createBotSupabaseClient({ supabaseUrl, anonKey, refresh_token }) {
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Establish session using refresh_token (don't call setSession with empty access token).
  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) throw error;
  if (!data?.session) throw new Error("Failed to establish bot session");

  // After refresh, the client holds a valid access_token for this process.
  return supabase;
}
