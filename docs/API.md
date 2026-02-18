# API

## Overview
- The app is a client-side SPA using Supabase for auth and data.
- API access is primarily via Supabase client SDK and edge functions.

## Auth
- Auth handled by Supabase Auth in `src/lib/auth.tsx`.
- Sessions are stored in browser storage via Supabase client config.

## Errors
- Supabase errors are surfaced via SDK responses.
- Client-side routing and error boundaries handle UI failures.
