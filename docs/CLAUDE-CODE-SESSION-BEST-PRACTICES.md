# Claude Code Session Management Best Practices

*Captured: 2026-03-01*

---

## Q: Should I use one session or many for a project?

**Many sessions per project is totally fine and often better.**

### Why multiple sessions works well

- **Context stays fresh** — long-lived sessions accumulate context that eventually gets compressed. Starting a new session for a distinct task (e.g., "build exit survey alerts" vs. "fix auth bug") means Claude starts focused
- **Parallel work** — you can have one session doing a build while you start coding in another
- **Cleaner history** — easier to find "that session where I fixed the payment bug" than scrolling through one massive session

---

## Q: I have 3-4 concurrent projects. How do I keep sessions from mixing in the sidebar?

### Recommended pattern for multiple projects

```
HoneylakeOS/          <- cd here, then run claude
  Session: "exit-survey-work"
  Session: "ai-gateway-setup"
  Session: "bug-fix-auth-redirect"

Project-B/            <- cd here, then run claude
  Session: "initial-setup"
  Session: "api-integration"

Project-C/            <- etc.
```

**Sessions are scoped to the directory you launch from.** So HoneylakeOS sessions and Project-B sessions are already separated automatically — they won't mix in the sidebar.

---

## Q: How do I stay organized across sessions?

1. **Always launch Claude Code from the project root** — `cd ~/honeylakeos && claude`
2. **Name every session** — `/rename exit-survey-alerts` as soon as you start meaningful work
3. **Resume with the picker** — `claude --resume` shows only sessions for that directory, with search and filters:
   - Press `/` to search by name
   - Press `B` to filter by git branch
   - Press `P` to preview a session before opening it
4. **Archive when done** — in the Desktop app, hover on a session and archive it to reduce clutter

---

## Q: Can I group sessions in the sidebar?

There's **no folder/tag grouping** in the sidebar today. But you get natural separation because:

- Sessions are **per-directory** — when you're in `~/honeylakeos`, you only see HoneylakeOS sessions in the picker
- When you switch to `~/project-b`, you only see Project-B sessions
- Descriptive names + the search filter handle the rest

---

## Recommended session pattern for HoneylakeOS

```
One session per meaningful work stream:

  /rename setup-and-config      <- initial project setup
  /rename exit-survey            <- exit survey feature work
  /rename ai-gateway             <- AI integration
  /rename bugfixes               <- quick fixes (can be reused)
```

When a session's work is done (feature shipped, PR merged), archive it and start a fresh one for the next piece of work. Don't try to keep one immortal session — they get stale and the context compression means Claude gradually forgets early details anyway.

---

## Quick Reference

| Command | What it does |
|---|---|
| `claude` | Start a new session in current directory |
| `claude --continue` | Jump back into your last session |
| `claude --resume` | Pick from a list of past sessions (filtered to current directory) |
| `/rename <name>` | Name the current session |
| `/` in resume picker | Search sessions by name |
| `B` in resume picker | Filter sessions by git branch |
| `P` in resume picker | Preview a session before opening it |
