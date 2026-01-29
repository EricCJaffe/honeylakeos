#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadBotSession, createBotSupabaseClient } from "./bot-client.mjs";

// Import a file from SharePoint (FSAGeneral) into BusinessOS Documents (root).
// Usage:
//   node import-sharepoint-to-documents.mjs "Book3.xlsx"

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

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function main() {
  loadDotEnvLocal();

  const fileName = process.argv.slice(2).join(" ") || "Book3.xlsx";

  // ---- SharePoint (Graph) ----
  // Re-use the existing msgraph delegated auth + cache on this gateway.
  // process.cwd() here is repo root (tmp-businessos)
  const graphClientPath = path.resolve(process.cwd(), "..", "integrations", "msgraph", "graph-client.mjs");
  const { getGraphClient } = await import(`file://${graphClientPath}`);
  const graph = await getGraphClient();

  const driveId = "b!AbUYAjThw0Okna4j662grIEnnFzRGdlEjw87Tiqxmud97Yp-tBLhQJQgjGSp-Z6F";

  // Find file by name using drive search.
  const searchRes = await graph.api(`/drives/${driveId}/root/search(q='${encodeURIComponent(fileName)}')`).top(25).get();
  const hits = (searchRes.value || []).filter((x) => x.name === fileName && x.file);
  if (!hits.length) {
    throw new Error(`SharePoint file not found (exact match): ${fileName}`);
  }
  const item = hits[0];

  const contentStream = await graph.api(`/drives/${driveId}/items/${item.id}/content`).getStream();
  const buf = await streamToBuffer(contentStream);

  // Best-effort content type
  const mimeType = item.file?.mimeType || "application/octet-stream";

  // ---- BusinessOS (Supabase) ----
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

  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id,name")
    .eq("name", COMPANY_NAME)
    .limit(2);
  if (cErr) throw cErr;
  if (!companies?.length) throw new Error(`Company not found: ${COMPANY_NAME}`);
  const companyId = companies[0].id;

  // Determine documents table columns (schema may have evolved)
  const { data: cols, error: colErr } = await supabase.rpc("get_table_columns");
  if (colErr) throw colErr;
  const docCols = new Set((cols || []).filter((r) => r.table_name === "documents").map((r) => r.column_name));

  const docId = crypto.randomUUID();
  // Must match storage policies: first segment company_id (uuid), second segment user_id (uuid)
  const storagePath = `${companyId}/${botUserId}/documents/${docId}/${fileName}`;

  // Upload to documents bucket
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(storagePath, buf, { contentType: mimeType, upsert: false });
  if (upErr) throw upErr;

  // Build insert payload with only existing columns
  const payload = {
    id: docId,
    company_id: companyId,
    folder_id: null,
    name: fileName,
    file_path: storagePath,
    file_size: buf.length,
    mime_type: mimeType,
    access_level: "company",
    description: `Imported from SharePoint: ${item.webUrl || fileName}`,
    tags: ["sharepoint", "imported"],
    created_by: botUserId,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    owner_user_id: botUserId,
  };

  const filtered = {};
  for (const [k, v] of Object.entries(payload)) {
    if (docCols.has(k)) filtered[k] = v;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("documents")
    .insert(filtered)
    .select("id,name,file_path")
    .single();

  if (insErr) throw insErr;

  console.log(JSON.stringify({
    ok: true,
    sharepoint: { id: item.id, name: item.name, webUrl: item.webUrl },
    businessos: { document: inserted, companyId, storagePath },
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
