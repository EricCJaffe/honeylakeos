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
  const PROJECT_NAME = process.env.BUSINESSOS_PROJECT_NAME || "BusinessOS";
  const ASSIGNEE_EMAIL = process.env.BUSINESSOS_ASSIGNEE_EMAIL || "eric@foundationstoneadvisors.com";

  // Find company
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id,name")
    .eq("name", COMPANY_NAME)
    .limit(2);
  if (cErr) throw cErr;
  if (!companies?.length) throw new Error(`Company not found: ${COMPANY_NAME}`);
  const companyId = companies[0].id;

  // Find project
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("id,name")
    .eq("company_id", companyId)
    .eq("name", PROJECT_NAME)
    .limit(2);
  if (pErr) throw pErr;
  if (!projects?.length) throw new Error(`Project not found: ${PROJECT_NAME}`);
  const projectId = projects[0].id;

  // Find assignee user_id via profiles
  const { data: assigneeProfiles, error: aErr } = await supabase
    .from("profiles")
    .select("user_id,email")
    .ilike("email", ASSIGNEE_EMAIL)
    .limit(2);
  if (aErr) throw aErr;
  if (!assigneeProfiles?.length) throw new Error(`Assignee profile not found: ${ASSIGNEE_EMAIL}`);
  const assigneeUserId = assigneeProfiles[0].user_id;

  const title = "Disconnect Lovable.ai + remove remaining integration points";
  const description = [
    "Goal: fully decouple BusinessOS from Lovable.ai.",
    "\nChecklist:",
    "- Identify any remaining Lovable webhooks/integrations (Vercel, GitHub, Supabase redirects).",
    "- Remove/disable them safely.",
    "- Confirm prod deploy pipeline is GitHub→Vercel (or CLI) only.",
    "- Verify auth redirect URLs do not include Lovable domains (unless intentionally kept).",
    "- Document final state."
  ].join("\n");

  const { data: newTask, error: tErr } = await supabase
    .from("tasks")
    .insert({
      company_id: companyId,
      created_by: botUserId,
      title,
      description,
      status: "to_do",
      priority: "medium",
      project_id: projectId,
    })
    .select("id")
    .single();
  if (tErr) throw tErr;

  const taskId = newTask.id;

  const { error: taErr } = await supabase
    .from("task_assignees")
    .insert([{ task_id: taskId, user_id: assigneeUserId }]);
  if (taErr) throw taErr;

  console.log("Created task:", taskId);
  console.log("Assigned to:", ASSIGNEE_EMAIL);
  console.log("Company:", COMPANY_NAME);
  console.log("Project:", PROJECT_NAME);
  console.log("Link:", `https://businessos-eight.vercel.app/app/tasks/${taskId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
