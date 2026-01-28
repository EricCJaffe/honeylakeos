#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // Basic hidden input (not perfect but avoids echoing password)
    const onData = (char) => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          process.stdin.off("data", onData);
          rl.output.write("\n");
          break;
        default:
          rl.output.write("*"
          );
          break;
      }
    };

    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

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
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadDotEnvLocal();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const EMAIL = process.env.BUSINESSOS_BOT_EMAIL || "ericsaiassistant@gmail.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ equivalents).\n" +
        "Ensure you run from the repo root (where .env.local exists), e.g. `cd tmp-businessos && node scripts/businessos/bot-auth.mjs`."
    );
    process.exit(1);
  }

  const password = await promptHidden(`Password for ${EMAIL}: `);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password });
  if (error) {
    console.error("Login failed:", error.message);
    process.exit(2);
  }
  if (!data?.session?.refresh_token) {
    console.error("No refresh token returned; cannot persist session.");
    process.exit(3);
  }

  const outDir = path.resolve(process.cwd(), "../secrets");
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const outPath = path.join(outDir, "businessos-bot-session.json");

  const payload = {
    createdAt: new Date().toISOString(),
    email: EMAIL,
    supabaseUrl: SUPABASE_URL,
    refresh_token: data.session.refresh_token,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  console.log(`Saved refresh token to: ${outPath}`);
  console.log("Next: rotate password again if you want; refresh token will keep working until sessions are revoked.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
