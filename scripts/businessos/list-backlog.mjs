#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadBotSession, createBotSupabaseClient } from "./bot-client.mjs";

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\\n/g, "\n").trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadDotEnvLocal();
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Missing anon key env");

  const { session } = loadBotSession(process.cwd());
  const supabase = await createBotSupabaseClient({
    supabaseUrl: session.supabaseUrl,
    anonKey,
    refresh_token: session.refresh_token,
  });

  const COMPANY_NAME = process.env.BUSINESSOS_COMPANY_NAME || "Foundation Stone Advisors";

  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id,name")
    .eq("name", COMPANY_NAME)
    .limit(2);
  if (cErr) throw cErr;
  if (!companies?.length) throw new Error(`Company not found: ${COMPANY_NAME}`);
  const companyId = companies[0].id;

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,status,priority,created_at,project_id")
    .eq("company_id", companyId)
    .in("status", ["to_do", "in_progress", "blocked"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
