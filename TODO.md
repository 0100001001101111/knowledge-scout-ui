# TODO

## Next Steps

- [ ] **Bulk actions**: Add ability to approve/reject multiple findings at once
- [ ] **Search**: Add full-text search across findings
- [ ] **Expand edge function**: Add Reddit API scanning to automated scout
- [ ] **Twitter/X integration**: Add API keys to scan @bcherny, @alexalbert__ automatically

## Nice to Have

- [ ] **Keyboard shortcuts**: j/k navigation, a/r for approve/reject
- [ ] **Export**: Download findings as JSON/CSV
- [ ] **Stats dashboard**: Charts showing findings by source, category, approval rate
- [ ] **Duplicate detection UI**: Show related findings when reviewing

## Known Issues

- Edge function only scans HN + GitHub (no Twitter/Reddit API access yet)
- Full scans (with Twitter/Reddit) require manual Claude Code prompt

## Completed

- [x] Terminal-style UI redesign
- [x] Auto-enrichment with Claude API
- [x] Merge to PROJECT_BIBLE.md on GitHub
- [x] Rich preview format (summary, usage, details, code)
- [x] Deduplication logic in scanner agent
- [x] Priority source tiers (official, trusted)
- [x] **Automated scanning**: Supabase Edge Function + pg_cron @ 3am UTC daily
- [x] **Manual scan button**: "Run Scout Now" on /scan page triggers edge function
