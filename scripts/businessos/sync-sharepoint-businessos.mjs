#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadBotSession, createBotSupabaseClient } from "./bot-client.mjs";

// One-way sync (add/update only) from SharePoint folder:
// FSAGeneral / Documents / BusinessOS Sync/**
// into BusinessOS Documents.
//
// Usage:
//   node sync-sharepoint-businessos.mjs
//
// Notes:
// - No auto-delete.
// - Uses MS Graph delegated auth (token cache) from /home/admxn/clawd/integrations/msgraph

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

  const COMPANY_NAME = process.env.BUSINESSOS_COMPANY_NAME || "Foundation Stone Advisors";

  // ---- SharePoint (Graph) ----
  const graphClientPath = path.resolve(process.cwd(), "..", "integrations", "msgraph", "graph-client.mjs");
  const { getGraphClient } = await import(`file://${graphClientPath}`);
  const graph = await getGraphClient();

  const siteId = 'netorgft11347269.sharepoint.com,0218b501-e134-43c3-a49d-ae23ebada0ac,5c9c2781-19d1-44d9-8f0f-3b4e2ab19ae7';
  const driveId = 'b!AbUYAjThw0Okna4j662grIEnnFzRGdlEjw87Tiqxmud97Yp-tBLhQJQgjGSp-Z6F';

  // Resolve the "BusinessOS Sync" folder id (first match)
  const folderSearch = await graph
    .api(`/drives/${driveId}/root/search(q='${encodeURIComponent('BusinessOS Sync')}')`)
    .top(25)
    .get();

  const folderHit = (folderSearch.value || []).find((x) => x.folder && x.name === 'BusinessOS Sync');
  if (!folderHit) throw new Error('Could not find SharePoint folder named "BusinessOS Sync"');

  // Walk files recursively
  const files = [];
  async function walk(itemId) {
    const children = await graph.api(`/drives/${driveId}/items/${itemId}/children`).top(999).get();
    for (const c of (children.value || [])) {
      if (c.folder) {
        await walk(c.id);
      } else if (c.file) {
        files.push(c);
      }
    }
  }
  await walk(folderHit.id);

  console.log(`Found ${files.length} file(s) under BusinessOS Sync.`);

  // ---- BusinessOS (Supabase) ----
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('Missing anon key env');

  const { session } = loadBotSession(process.cwd());
  const supabase = await createBotSupabaseClient({
    supabaseUrl: session.supabaseUrl,
    anonKey,
    refresh_token: session.refresh_token,
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const botUserId = userData.user.id;

  const { data: companies, error: cErr } = await supabase
    .from('companies')
    .select('id,name')
    .eq('name', COMPANY_NAME)
    .limit(2);
  if (cErr) throw cErr;
  if (!companies?.length) throw new Error(`Company not found: ${COMPANY_NAME}`);
  const companyId = companies[0].id;

  // Determine documents columns (schema may vary)
  const { data: cols, error: colErr } = await supabase.rpc('get_table_columns');
  if (colErr) throw colErr;
  const docCols = new Set((cols || []).filter((r) => r.table_name === 'documents').map((r) => r.column_name));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const f of files) {
    const itemId = f.id;
    const fileName = f.name;
    const webUrl = f.webUrl;
    const lastModified = f.lastModifiedDateTime ? new Date(f.lastModifiedDateTime).toISOString() : null;
    const etag = f.eTag || null;

    // Look for mapping
    const { data: existingMap, error: mapErr } = await supabase
      .from('integration_sharepoint_sync_map')
      .select('*')
      .eq('company_id', companyId)
      .eq('sharepoint_drive_id', driveId)
      .eq('sharepoint_item_id', itemId)
      .maybeSingle();

    if (mapErr) throw mapErr;

    if (existingMap && existingMap.etag && etag && existingMap.etag === etag) {
      skipped++;
      continue;
    }

    // Download latest bytes
    const contentStream = await graph.api(`/drives/${driveId}/items/${itemId}/content`).getStream();
    const buf = await streamToBuffer(contentStream);
    const mimeType = f.file?.mimeType || 'application/octet-stream';

    if (!existingMap) {
      // Create new document
      const docId = crypto.randomUUID();
      const storagePath = `${companyId}/${botUserId}/documents/${docId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, buf, { contentType: mimeType, upsert: false });
      if (upErr) throw upErr;

      const payload = {
        id: docId,
        company_id: companyId,
        folder_id: null,
        name: fileName,
        file_path: storagePath,
        file_size: buf.length,
        mime_type: mimeType,
        access_level: 'company',
        description: `Synced from SharePoint: ${webUrl || fileName}`,
        tags: ['sharepoint', 'synced'],
        created_by: botUserId,
        owner_user_id: botUserId,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const filtered = {};
      for (const [k, v] of Object.entries(payload)) {
        if (docCols.has(k)) filtered[k] = v;
      }

      const { error: insErr } = await supabase.from('documents').insert(filtered);
      if (insErr) throw insErr;

      const { error: mapInsErr } = await supabase
        .from('integration_sharepoint_sync_map')
        .insert({
          company_id: companyId,
          sharepoint_site_id: siteId,
          sharepoint_drive_id: driveId,
          sharepoint_item_id: itemId,
          sharepoint_parent_item_id: f.parentReference?.id || null,
          file_name: fileName,
          web_url: webUrl,
          last_modified_at: lastModified,
          etag,
          document_id: docId,
          document_file_path: storagePath,
          last_synced_at: new Date().toISOString(),
        });
      if (mapInsErr) throw mapInsErr;

      created++;
      continue;
    }

    // Update existing document file in place (upsert)
    const storagePath = existingMap.document_file_path;
    if (!storagePath) {
      console.warn(`Skipping update; missing storage path for mapped item ${fileName}`);
      skipped++;
      continue;
    }

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, buf, { contentType: mimeType, upsert: true });
    if (upErr) throw upErr;

    // Update document metadata
    const docPatch = {};
    if (docCols.has('file_size')) docPatch.file_size = buf.length;
    if (docCols.has('mime_type')) docPatch.mime_type = mimeType;
    if (docCols.has('updated_at')) docPatch.updated_at = new Date().toISOString();

    const { error: docUpErr } = await supabase.from('documents').update(docPatch).eq('id', existingMap.document_id);
    if (docUpErr) throw docUpErr;

    const { error: mapUpErr } = await supabase
      .from('integration_sharepoint_sync_map')
      .update({
        file_name: fileName,
        web_url: webUrl,
        last_modified_at: lastModified,
        etag,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', existingMap.id);
    if (mapUpErr) throw mapUpErr;

    updated++;
  }

  console.log(JSON.stringify({ ok: true, created, updated, skipped }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
