# TODO

## Next Steps

- [ ] **Automated scanning**: Set up cron job or GitHub Action to run knowledge-scout agent daily at 3am
- [ ] **Bulk actions**: Add ability to approve/reject multiple findings at once
- [ ] **Search**: Add full-text search across findings
- [ ] **Edit after merge**: Allow editing findings that have already been merged (creates new commit)

## Nice to Have

- [ ] **Keyboard shortcuts**: j/k navigation, a/r for approve/reject
- [ ] **Dark/light theme toggle**: Currently dark-only
- [ ] **Export**: Download findings as JSON/CSV
- [ ] **Stats dashboard**: Charts showing findings by source, category, approval rate
- [ ] **Duplicate detection UI**: Show related findings when reviewing

## Known Issues

- None currently - auto-enrichment and merge-to-bible working as expected

## Completed

- [x] Terminal-style UI redesign
- [x] Auto-enrichment with Claude API
- [x] Merge to PROJECT_BIBLE.md on GitHub
- [x] Rich preview format (summary, usage, details, code)
- [x] Deduplication logic in scanner agent
- [x] Priority source tiers (official, trusted)
