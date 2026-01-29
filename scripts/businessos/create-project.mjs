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

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const botUserId = userData.user.id;

  const COMPANY_NAME = process.env.BUSINESSOS_COMPANY_NAME || "Foundation Stone Advisors";
  const PROJECT_NAME = process.argv.slice(2).join(" ") || process.env.BUSINESSOS_NEW_PROJECT_NAME;
  if (!PROJECT_NAME) throw new Error("Usage: create-project.mjs <Project Name>");

  // Find company
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id,name")
    .eq("name", COMPANY_NAME)
    .limit(2);
  if (cErr) throw cErr;
  if (!companies?.length) throw new Error(`Company not found: ${COMPANY_NAME}`);
  const companyId = companies[0].id;

  // Check existing
  const { data: existing, error: eErr } = await supabase
    .from("projects")
    .select("id,name")
    .eq("company_id", companyId)
    .eq("name", PROJECT_NAME)
    .limit(1);
  if (eErr) throw eErr;
  if (existing?.length) {
    console.log("Project already exists:", existing[0]);
    return;
  }

  const { data: created, error: pErr } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      name: PROJECT_NAME,
      // Newer schemas may require these; harmless if ignored by DB.
      created_by: botUserId,
      owner_user_id: botUserId,
    })
    .select("id,name")
    .single();
  if (pErr) throw pErr;

  console.log("Created project:", created);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
