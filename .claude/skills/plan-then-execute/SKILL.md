---
name: Plan Then Execute
description: This skill should be used before implementing any feature, fix, or change in the pay.convexo.xyz codebase. Triggers on "implement", "add feature", "fix bug", "build X", "create X", "update X" — any task that will require writing or modifying code. Uses an Opus planning agent first, then executes with Sonnet to minimize token waste and maximize output quality.
version: 1.0.0
---

# Plan Then Execute

Two-phase workflow: Opus plans, Sonnet executes. Skip brainstorming and review superpowers — this skill replaces them.

## When to Use

Any task that touches code. Do not skip this for "small" changes — the planning phase is cheap and prevents wasted execution cycles.

## Phase 1 — Dispatch Opus Planning Agent

Dispatch an Agent with `model: "opus"` and the following prompt structure. Do NOT explore the codebase yourself before dispatching.

```
subagent_type: general-purpose
model: opus
description: "Plan [task description]"
prompt: |
  You are a planning agent for pay.convexo.xyz — a B2B payment platform built with:
  Next.js 16 App Router · TypeScript · Supabase (RLS via privy_sub()) · Privy auth · Resend · next-intl

  TASK: [paste the user's request verbatim]

  CODEBASE RULES (non-negotiable):
  - All data mutations are Server Actions in lib/actions/ — no app/api/ routes
  - Every Server Action receives privyToken: string from the client
  - Admin actions must call requireAdmin(privyToken) first
  - User actions use createClient(privyToken), admin writes use createServiceClient()
  - Balance lives on profiles.usdc_balance — never touch users for balance
  - Inline styles only — no Tailwind classes in component files
  - Dark theme: page bg linear-gradient(180deg, #02001A 0%, #2A0144 100%)
  - i18n: all user-visible strings go in messages/es.json AND messages/en.json
  - Column names: internal_name (not name), office_country, contact_email, reference (not reference_code)
  - Lazy-init Resend and PrivyClient — never at module level
  - After schema changes: regenerate types with Supabase MCP (project snvnfztcatrtejpldctl)

  YOUR OUTPUT must be a numbered implementation plan with:
  1. Files to CREATE (full path)
  2. Files to MODIFY (full path + what section/function changes)
  3. DB migrations needed (exact SQL)
  4. i18n keys to add (key name + ES + EN values)
  5. Exact patterns to follow (copy from which existing file)

  Be specific enough that a Sonnet model can execute each step without reading any file it's not directly changing.

  Explore only the files you need. Common starting points:
  - lib/actions/ — existing Server Action patterns
  - app/(dashboard)/ or app/admin/ — page/component patterns
  - lib/supabase/types.ts — current DB types
  - messages/es.json — existing i18n keys
```

## Phase 2 — Execute the Plan

Once the Opus agent returns the plan:

1. Read each file the plan says to modify — read BEFORE editing
2. Execute steps in order
3. After any DB migration: regenerate types with `mcp__plugin_supabase_supabase__generate_typescript_types` (project_id: snvnfztcatrtejpldctl) and overwrite `lib/supabase/types.ts`
4. After all changes: run `npx tsc --noEmit` — fix any errors before declaring done

## What NOT to Do

- Do not brainstorm before dispatching the planner
- Do not explore the codebase before dispatching the planner — let Opus do it
- Do not invoke superpowers:brainstorming, superpowers:writing-plans, or superpowers:requesting-code-review for this project
- Do not run the Opus agent and then explore again yourself — trust the plan
- Do not create API routes — Server Actions only
- Do not mark work done without running `npx tsc --noEmit`

## Quick Checklist (Phase 2)

- [ ] Read every file before editing it
- [ ] Server Actions have `'use server'` at top
- [ ] Admin actions call `requireAdmin(privyToken)`
- [ ] New DB columns added to i18n if user-visible
- [ ] Types regenerated after any migration
- [ ] `npx tsc --noEmit` passes (ignore tests/placeholder.test.ts)
