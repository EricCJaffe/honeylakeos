#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadBotSession, createBotSupabaseClient } from "./bot-client.mjs";

function loadEnvFile(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
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
    out[key] = val;
  }
  return out;
}

function mapStatus(taskosStatus) {
  switch (taskosStatus) {
    case "backlog":
      return "to_do";
    case "doing":
      return "in_progress";
    case "review":
      return "in_progress";
    case "done":
      return "done";
    default:
      return "to_do";
  }
}

async function main() {
  // --- Config
  const COMPANY_NAME = process.env.BUSINESSOS_COMPANY_NAME || "Foundation Stone Advisors";
  const TARGET_PROJECT_NAME = process.env.BUSINESSOS_TARGET_PROJECT || "Digital Missions";
  const SOURCE_PROJECT_NAME = process.env.TASKOS_SOURCE_PROJECT || "Digital Missions";
  const ASSIGNEE_EMAIL = process.env.BUSINESSOS_ASSIGNEE_EMAIL || "eric@foundationstoneadvisors.com";

  // --- Load envs
  const bizEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const bizAnonKey = bizEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!bizAnonKey) throw new Error("Missing BusinessOS anon key in .env.local (VITE_SUPABASE_PUBLISHABLE_KEY)");

  const taskosEnv = loadEnvFile(path.resolve(process.cwd(), "../apps/taskos/.env"));
  const TASKOS_URL = taskosEnv.VITE_SUPABASE_URL;
  const TASKOS_ANON = taskosEnv.VITE_SUPABASE_ANON_KEY;
  if (!TASKOS_URL || !TASKOS_ANON) throw new Error("Missing TaskOS env (apps/taskos/.env)");

  // --- Connect clients
  const taskos = createClient(TASKOS_URL, TASKOS_ANON, { auth: { persistSession: false } });

  const { session } = loadBotSession(process.cwd());
  const businessos = await createBotSupabaseClient({
    supabaseUrl: session.supabaseUrl,
    anonKey: bizAnonKey.replace(/\\n/g, "\n").trim(),
    refresh_token: session.refresh_token,
  });

  // --- Find source project in TaskOS
  const { data: srcProjects, error: spErr } = await taskos
    .from("projects")
    .select("id,name,company_id")
    .ilike("name", SOURCE_PROJECT_NAME)
    .limit(5);
  if (spErr) throw spErr;
  if (!srcProjects?.length) throw new Error(`TaskOS: source project not found: ${SOURCE_PROJECT_NAME}`);
  const sourceProject = srcProjects[0];

  // --- Fetch TaskOS tasks
  const { data: srcTasks, error: stErr } = await taskos
    .from("tasks")
    .select("*")
    .eq("project_id", sourceProject.id)
    .order("created_at", { ascending: true });
  if (stErr) throw stErr;

  console.log(`TaskOS: found ${srcTasks.length} tasks in project '${sourceProject.name}' (${sourceProject.id})`);

  // --- Find BusinessOS company
  const { data: bizCompany, error: bcErr } = await businessos
    .from("companies")
    .select("id,name")
    .eq("name", COMPANY_NAME)
    .single();
  if (bcErr) throw bcErr;

  // --- Find/create BusinessOS target project
  let targetProjectId;
  {
    const { data: proj, error: pErr } = await businessos
      .from("projects")
      .select("id,name")
      .eq("company_id", bizCompany.id)
      .eq("name", TARGET_PROJECT_NAME)
      .maybeSingle();
    if (pErr) throw pErr;
    if (proj?.id) {
      targetProjectId = proj.id;
    } else {
      const { data: userData, error: uErr } = await businessos.auth.getUser();
      if (uErr) throw uErr;
      const botUserId = userData.user.id;

      const { data: created, error: cErr } = await businessos
        .from("projects")
        .insert({ company_id: bizCompany.id, name: TARGET_PROJECT_NAME, status: "active", owner_user_id: botUserId })
        .select("id")
        .single();
      if (cErr) throw cErr;
      targetProjectId = created.id;
      console.log(`BusinessOS: created project '${TARGET_PROJECT_NAME}' (${targetProjectId})`);
    }
  }

  // --- Lookup Eric user_id
  const { data: assigneeProfile, error: apErr } = await businessos
    .from("profiles")
    .select("user_id,email")
    .eq("email", ASSIGNEE_EMAIL)
    .single();
  if (apErr) throw apErr;
  const ericUserId = assigneeProfile.user_id;

  const { data: userData, error: uErr } = await businessos.auth.getUser();
  if (uErr) throw uErr;
  const botUserId = userData.user.id;

  // --- Import tasks (idempotent by tag)
  let createdCount = 0;
  let skippedCount = 0;

  // Preload existing imported markers (avoid JSONB operators)
  const importedMarkers = new Set();
  {
    const { data: existingTasks, error } = await businessos
      .from("tasks")
      .select("id,tags")
      .eq("company_id", bizCompany.id)
      .eq("project_id", targetProjectId);
    if (error) throw error;

    for (const row of existingTasks || []) {
      let tags = row.tags;
      try {
        if (typeof tags === "string") tags = JSON.parse(tags);
      } catch {
        // ignore
      }
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === "string" && tag.startsWith("migrated_from_taskos:")) {
            importedMarkers.add(tag);
          }
        }
      }
    }
  }

  for (const t of srcTasks) {
    const marker = `migrated_from_taskos:${t.id}`;
    if (importedMarkers.has(marker)) {
      skippedCount++;
      continue;
    }

    const mergedTags = Array.from(new Set([...(t.tags || []), "migrated:taskos", marker]));
    // tasks.tags is JSON/JSONB; pass as array (supabase-js will serialize)
    const tagsValue = mergedTags;

    const { data: newTask, error: ntErr } = await businessos
      .from("tasks")
      .insert({
        company_id: bizCompany.id,
        created_by: botUserId,
        title: t.title,
        description: t.description,
        status: mapStatus(t.status),
        priority: t.priority || "medium",
        due_date: t.due_date,
        project_id: targetProjectId,
        tags: tagsValue,
      })
      .select("id")
      .single();
    if (ntErr) throw ntErr;

    const { error: asErr } = await businessos
      .from("task_assignees")
      .insert([{ task_id: newTask.id, user_id: ericUserId }]);
    if (asErr) throw asErr;

    createdCount++;
  }

  console.log(`BusinessOS: imported ${createdCount} tasks, skipped ${skippedCount} already-imported.`);
  console.log(`Project: ${TARGET_PROJECT_NAME}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
