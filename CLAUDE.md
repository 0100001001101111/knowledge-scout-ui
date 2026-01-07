# Knowledge Scout UI

A terminal-styled web interface for managing Claude Code tips and techniques discovered from various sources. Approved findings can be merged directly into a GitHub-hosted PROJECT_BIBLE.md.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + JetBrains Mono font
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (for auto-enrichment)
- **Deployment**: Vercel
- **GitHub Integration**: REST API for committing to project-bible repo

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── enrich/route.ts      # Claude API enrichment endpoint
│   │   └── merge-to-bible/route.ts  # GitHub commit endpoint
│   ├── findings/
│   │   ├── page.tsx             # Findings list with filters
│   │   └── [id]/page.tsx        # Finding detail + review actions
│   ├── bible/page.tsx           # View PROJECT_BIBLE.md
│   ├── scan/page.tsx            # Manual scan trigger
│   ├── layout.tsx               # Terminal-style shell header
│   ├── page.tsx                 # Dashboard/home
│   └── globals.css              # Terminal theme + animations
└── lib/
    └── supabase.ts              # Supabase client + types
```

## Database Schema (Supabase)

### knowledge_findings
- `id` (uuid, PK)
- `source_type` (twitter, reddit, github, hackernews, discord, other)
- `source_url`, `source_author`
- `title`, `summary`, `usage`, `details`, `code_snippet`
- `original_content`
- `category` (prompting_techniques, sub_agents, mcp_servers, etc.)
- `quality_rating` (verified, tested, theoretical)
- `confidence_score` (0-100)
- `status` (pending_review, approved, rejected, merged)
- `source_tier` (1=official, 2=trusted, null=community)
- `source_flag` (official, trusted, null)
- `related_finding_id` (for deduplication)
- `scan_date`, `merged_at`, `created_at`

### knowledge_scan_history
- `id`, `scan_date`, `sources_checked`, `findings_count`, `new_findings`, `duplicates_skipped`, `duration_ms`, `notes`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Optional, for server-side
ANTHROPIC_API_KEY=                # For auto-enrichment
GITHUB_TOKEN=                     # For merge-to-bible
GITHUB_OWNER=0100001001101111
GITHUB_REPO=project-bible
BIBLE_FILE_PATH=PROJECT_BIBLE.md
```

## Features

### Working
- Terminal-style UI with JetBrains Mono, scanlines, box-drawing chars
- Finding list with status/category/source filters
- Finding detail view with all fields
- Approve/Reject workflow
- **Auto-enrichment**: Click [ENRICH] to extract summary/usage/details/code via Claude API
- **Merge to Bible**: Preview and commit approved findings to GitHub
- Toast notifications for actions

### Workflow
1. Knowledge Scout agent (in ~/.claude/agents/) scans sources daily
2. Findings stored in Supabase with pending_review status
3. Review in UI: approve or reject
4. For sparse findings, click [ENRICH] to auto-extract fields with Claude
5. Click [ADD TO PROJECT BIBLE] to preview and merge to GitHub

## Related Files

- `~/.claude/agents/knowledge-scout.md` - Scanner agent definition
- `~/.claude/agents/knowledge-scout-runner.md` - Runner prompts
- `0100001001101111/project-bible` repo - Target for merged findings

## Commands

```bash
npm run dev      # Local development
npm run build    # Production build
npx vercel deploy --prod  # Deploy to Vercel
```
