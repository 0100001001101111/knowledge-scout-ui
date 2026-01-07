'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Finding } from '@/lib/supabase'
import Link from 'next/link'

const statusLabels: Record<string, { text: string; class: string }> = {
  pending_review: { text: '[PENDING]', class: 'text-amber' },
  approved: { text: '[APPROVED]', class: 'text-green' },
  rejected: { text: '[REJECTED]', class: 'text-red' },
  merged: { text: '[MERGED]', class: 'text-accent' },
}

const categoryLabels: Record<string, string> = {
  new_features: 'New Features',
  prompting_techniques: 'Prompting Techniques',
  sub_agents: 'Sub-Agents',
  mcp_servers: 'MCP Servers',
  workflow_tips: 'Workflow Tips',
  configuration: 'Configuration',
  common_mistakes: 'Common Mistakes',
  performance: 'Performance',
  other: 'Other',
}

type Toast = {
  type: 'success' | 'error'
  message: string
  link?: string
}

type MergePreview = {
  section: string
  formattedContent: string
  isEnriched: boolean
  finding: {
    id: string
    title: string
    summary: string
    usage: string | null
    details: string | null
    code_snippet: string | null
    original_content: string | null
    source_url: string | null
    source_author: string | null
    category: string
  }
}

export default function FindingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [finding, setFinding] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Merge state
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null)
  const [merging, setMerging] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Enrich state
  const [enrichMode, setEnrichMode] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [editUsage, setEditUsage] = useState('')
  const [editDetails, setEditDetails] = useState('')
  const [editCodeSnippet, setEditCodeSnippet] = useState('')
  const [editSummary, setEditSummary] = useState('')

  useEffect(() => {
    loadFinding()
  }, [params.id])

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function loadFinding() {
    const { data, error } = await supabase
      .from('knowledge_findings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error loading finding:', error)
    } else {
      setFinding(data)
      setNotes(data.rejection_reason || '')
      // Initialize edit fields
      setEditSummary(data.summary || '')
      setEditUsage(data.usage || '')
      setEditDetails(data.details || '')
      setEditCodeSnippet(data.code_snippet || '')
    }
    setLoading(false)
  }

  async function updateStatus(status: string, reason?: string) {
    if (!finding) return
    setSaving(true)

    const updates: Record<string, unknown> = { status }
    if (reason) updates.rejection_reason = reason
    if (status === 'merged') updates.merged_at = new Date().toISOString()

    const { error } = await supabase
      .from('knowledge_findings')
      .update(updates)
      .eq('id', finding.id)

    if (error) {
      console.error('Error updating:', error)
      setToast({ type: 'error', message: 'Failed to update status' })
    } else {
      await loadFinding()
      setToast({ type: 'success', message: `Status updated to ${status}` })
    }
    setSaving(false)
  }

  async function saveEnrichment() {
    if (!finding) return
    setSaving(true)

    const { error } = await supabase
      .from('knowledge_findings')
      .update({
        summary: editSummary,
        usage: editUsage || null,
        details: editDetails || null,
        code_snippet: editCodeSnippet || null,
      })
      .eq('id', finding.id)

    if (error) {
      console.error('Error saving:', error)
      setToast({ type: 'error', message: 'Failed to save' })
    } else {
      await loadFinding()
      setEnrichMode(false)
      setToast({ type: 'success', message: 'Finding enriched!' })
    }
    setSaving(false)
  }

  async function openMergePreview() {
    if (!finding) return

    try {
      const response = await fetch(`/api/merge-to-bible?findingId=${finding.id}`)
      const data = await response.json()

      if (data.success) {
        setMergePreview(data.preview)
        setShowMergeModal(true)
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to load preview' })
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to load preview' })
    }
  }

  async function confirmMerge() {
    if (!finding) return
    setMerging(true)

    try {
      const response = await fetch('/api/merge-to-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: finding.id }),
      })

      const data = await response.json()

      if (data.success) {
        setShowMergeModal(false)
        setToast({
          type: 'success',
          message: 'Merged to Project Bible!',
          link: data.commitUrl,
        })
        await loadFinding()
      } else {
        setToast({ type: 'error', message: data.error || 'Merge failed' })
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Merge failed - network error' })
    }

    setMerging(false)
  }

  async function autoEnrich() {
    if (!finding) return
    setEnriching(true)
    setToast({ type: 'success', message: 'Extracting content with Claude...' })

    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: finding.id, save: false }),
      })

      const data = await response.json()

      if (data.success && data.extracted) {
        // Populate form with extracted content
        setEditSummary(data.extracted.summary || finding.summary || '')
        setEditUsage(data.extracted.usage || '')
        setEditDetails(data.extracted.details || '')
        setEditCodeSnippet(data.extracted.code_snippet || '')
        setEnrichMode(true)
        setToast({
          type: 'success',
          message: data.sourceContentFetched
            ? 'Extracted from source + original content!'
            : 'Extracted from original content!',
        })
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to enrich' })
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to connect to enrichment service' })
    }

    setEnriching(false)
  }

  function copyForClaude() {
    if (!finding) return
    const text = `# Finding to Enrich: ${finding.title}

**Source:** ${finding.source_url || finding.source_type}
**Category:** ${categoryLabels[finding.category]}

## Current Summary
${finding.summary}

## Original Content
${finding.original_content || 'N/A'}

---

Please help me enrich this finding for my Project Bible. Extract:

1. **Summary** (1-2 sentences - what is this?)
2. **Usage** (how to use it - commands, code examples)
3. **Details** (structure, options, configuration if applicable)
4. **Code snippet** (if there's a good example)

Format your response so I can copy each field into the enrichment form.`

    navigator.clipboard.writeText(text)
    setToast({ type: 'success', message: 'Copied to clipboard!' })
  }

  function openInClaude() {
    if (!finding) return
    const text = encodeURIComponent(`Review this finding for my Project Bible:\n\n${finding.title}\n\n${finding.summary}`)
    window.open(`https://claude.ai/new?q=${text}`, '_blank')
  }

  // Check if finding needs enrichment
  function needsEnrichment(f: Finding): boolean {
    return !(f.usage || f.code_snippet || f.details)
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted">
        <span className="loading">Loading finding</span>
      </div>
    )
  }

  if (!finding) {
    return (
      <div className="text-center py-12">
        <div className="text-red mb-2">[ERROR]</div>
        <div className="text-muted">Finding not found</div>
        <Link href="/findings" className="text-accent mt-4 inline-block">
          ← cd ../findings
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 border ${
            toast.type === 'success'
              ? 'bg-green/20 border-green text-green'
              : 'bg-red/20 border-red text-red'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>{toast.type === 'success' ? '[OK]' : '[ERR]'}</span>
            <span>{toast.message}</span>
            {toast.link && (
              <a
                href={toast.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                View commit →
              </a>
            )}
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-muted hover:text-foreground"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Merge Preview Modal */}
      {showMergeModal && mergePreview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80">
          <div className="bg-surface border border-border p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="text-green text-xs mb-4">
              ┌─ MERGE PREVIEW ─────────────────────────────────────────────┐
            </div>

            {/* Enrichment warning */}
            {!mergePreview.isEnriched && (
              <div className="mb-4 p-3 bg-amber/10 border border-amber text-amber text-sm">
                <span className="font-bold">[WARN]</span> This finding lacks usage/details. Consider enriching before merge.
              </div>
            )}

            <div className="mb-4">
              <div className="text-muted text-xs mb-1">Target section:</div>
              <div className="text-accent">{mergePreview.section}</div>
            </div>

            <div className="mb-4">
              <div className="text-muted text-xs mb-1">$ cat preview.md</div>
              <pre className="bg-background border border-border p-4 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                {mergePreview.formattedContent}
              </pre>
            </div>

            <div className="text-green text-xs mb-4">
              └──────────────────────────────────────────────────────────────┘
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmMerge}
                disabled={merging}
                className="px-4 py-2 bg-green/20 border border-green text-green text-sm hover:bg-green/30 glow-green disabled:opacity-50 flex items-center gap-2"
              >
                {merging ? (
                  <>
                    <span className="loading"></span>
                    Merging...
                  </>
                ) : (
                  '[CONFIRM MERGE]'
                )}
              </button>
              {!mergePreview.isEnriched && (
                <button
                  onClick={() => {
                    setShowMergeModal(false)
                    autoEnrich()
                  }}
                  disabled={enriching}
                  className="px-4 py-2 bg-amber/20 border border-amber text-amber text-sm hover:bg-amber/30 disabled:opacity-50"
                >
                  {enriching ? (
                    <span className="loading">Enriching</span>
                  ) : (
                    '[ENRICH FIRST]'
                  )}
                </button>
              )}
              <button
                onClick={() => setShowMergeModal(false)}
                disabled={merging}
                className="px-4 py-2 bg-surface-hover border border-border text-sm hover:border-muted"
              >
                [CANCEL]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/findings" className="text-sm text-muted hover:text-green mb-4 inline-block">
        <span className="text-green">$</span> cd ../findings
      </Link>

      {/* Main content */}
      <div className="bg-surface border border-border p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="text-green text-xs mb-2">┌─ FINDING DETAILS ────────────────────────────────────────────┐</div>

          <h1 className="text-lg mb-3 pl-2">
            <span className="text-muted">│</span> {finding.title}
          </h1>

          <div className="flex items-center gap-4 text-sm pl-2 flex-wrap">
            <span className="text-muted">│</span>
            <span className={statusLabels[finding.status].class}>
              {statusLabels[finding.status].text}
            </span>
            <span className="text-muted">│</span>
            <span className="text-accent">{categoryLabels[finding.category]}</span>
            <span className="text-muted">│</span>
            <span className={
              finding.confidence_score >= 80 ? 'text-green' :
              finding.confidence_score >= 60 ? 'text-amber' : 'text-muted'
            }>
              {finding.quality_rating} ({finding.confidence_score}%)
            </span>
            {needsEnrichment(finding) && (
              <>
                <span className="text-muted">│</span>
                <span className="text-amber">[NEEDS ENRICHMENT]</span>
              </>
            )}
          </div>

          <div className="text-green text-xs mt-2">└──────────────────────────────────────────────────────────────┘</div>
        </div>

        {/* Source */}
        <div className="mb-6">
          <div className="text-muted text-xs mb-1">$ cat source.txt</div>
          <div className="bg-background border border-border p-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted">type:</span>
              <span className="capitalize">{finding.source_type}</span>
              {finding.source_author && (
                <>
                  <span className="text-muted">│ author:</span>
                  <span>{finding.source_author}</span>
                </>
              )}
            </div>
            {finding.source_url && (
              <div className="mt-2">
                <span className="text-muted">url: </span>
                <a
                  href={finding.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-green break-all"
                >
                  {finding.source_url}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Enrich Mode */}
        {enrichMode ? (
          <div className="mb-6 p-4 border border-amber bg-amber/5">
            <div className="text-amber text-xs mb-4">$ ./enrich.sh --interactive</div>

            <div className="space-y-4">
              <div>
                <label className="text-muted text-xs block mb-1">Summary (what is this?)</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full bg-background border border-border p-3 text-sm resize-none h-20 focus:border-amber"
                  placeholder="1-2 sentences describing what this is..."
                />
              </div>

              <div>
                <label className="text-muted text-xs block mb-1">Usage (how to use it)</label>
                <textarea
                  value={editUsage}
                  onChange={(e) => setEditUsage(e.target.value)}
                  className="w-full bg-background border border-border p-3 text-sm resize-none h-24 focus:border-amber"
                  placeholder="Commands, examples, steps..."
                />
              </div>

              <div>
                <label className="text-muted text-xs block mb-1">Code Snippet</label>
                <textarea
                  value={editCodeSnippet}
                  onChange={(e) => setEditCodeSnippet(e.target.value)}
                  className="w-full bg-background border border-border p-3 text-sm resize-none h-32 font-mono focus:border-amber"
                  placeholder="Code example..."
                />
              </div>

              <div>
                <label className="text-muted text-xs block mb-1">Details (structure, options, etc.)</label>
                <textarea
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  className="w-full bg-background border border-border p-3 text-sm resize-none h-24 focus:border-amber"
                  placeholder="Additional details, file structure, configuration options..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEnrichment}
                  disabled={saving}
                  className="px-4 py-2 bg-green/20 border border-green text-green text-sm hover:bg-green/30 glow-green disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '[SAVE]'}
                </button>
                <button
                  onClick={() => setEnrichMode(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-surface-hover border border-border text-sm hover:border-muted"
                >
                  [CANCEL]
                </button>
                <button
                  onClick={copyForClaude}
                  className="px-4 py-2 bg-surface-hover border border-border text-sm hover:border-accent hover:text-accent ml-auto"
                >
                  [ASK CLAUDE FOR HELP]
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-6">
              <div className="text-muted text-xs mb-1">$ cat summary.txt</div>
              <div className="bg-background border border-border p-3 text-sm">
                {finding.summary}
              </div>
            </div>

            {/* Usage */}
            {finding.usage && (
              <div className="mb-6">
                <div className="text-muted text-xs mb-1">$ cat usage.txt</div>
                <div className="bg-background border border-border p-3 text-sm whitespace-pre-wrap">
                  {finding.usage}
                </div>
              </div>
            )}

            {/* Code Snippet */}
            {finding.code_snippet && (
              <div className="mb-6">
                <div className="text-muted text-xs mb-1">$ cat example.code</div>
                <pre className="bg-background border border-border p-3 text-sm overflow-x-auto">
                  <code>{finding.code_snippet}</code>
                </pre>
              </div>
            )}

            {/* Details */}
            {finding.details && (
              <div className="mb-6">
                <div className="text-muted text-xs mb-1">$ cat details.txt</div>
                <div className="bg-background border border-border p-3 text-sm whitespace-pre-wrap">
                  {finding.details}
                </div>
              </div>
            )}

            {/* Original Content */}
            {finding.original_content && (
              <div className="mb-6">
                <div className="text-muted text-xs mb-1">$ cat original.txt</div>
                <div className="bg-background border border-border p-3 text-sm">
                  <div className="border-l-2 border-green pl-3 text-muted italic">
                    &quot;{finding.original_content}&quot;
                  </div>
                  <div className="text-xs text-muted mt-2">
                    — {finding.source_author || finding.source_type}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Metadata */}
        <div className="mb-6">
          <div className="text-muted text-xs mb-1">$ stat finding.meta</div>
          <div className="bg-background border border-border p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted">discovered:</span>{' '}
                {new Date(finding.scan_date).toLocaleString()}
              </div>
              <div>
                <span className="text-muted">target_section:</span>{' '}
                <span className="text-accent">{categoryLabels[finding.category]}</span>
              </div>
              {finding.merged_at && (
                <div>
                  <span className="text-muted">merged:</span>{' '}
                  {new Date(finding.merged_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {!enrichMode && (
          <div className="mb-6">
            <div className="text-muted text-xs mb-1">$ vim notes.txt</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this finding..."
              className="w-full bg-background border border-border p-3 text-sm resize-none h-24 focus:border-green"
            />
          </div>
        )}

        {/* Actions */}
        {!enrichMode && (
          <div className="pt-4 border-t border-border">
            <div className="text-muted text-xs mb-3">$ ./actions.sh</div>

            <div className="flex flex-wrap gap-3">
              {/* Pending review actions */}
              {finding.status === 'pending_review' && (
                <>
                  <button
                    onClick={() => updateStatus('approved')}
                    disabled={saving}
                    className="px-4 py-2 bg-green/20 border border-green text-green text-sm hover:bg-green/30 glow-green disabled:opacity-50"
                  >
                    [APPROVE]
                  </button>
                  <button
                    onClick={() => updateStatus('rejected', notes)}
                    disabled={saving}
                    className="px-4 py-2 bg-red/20 border border-red text-red text-sm hover:bg-red/30 glow-red disabled:opacity-50"
                  >
                    [REJECT]
                  </button>
                </>
              )}

              {/* Approved - show merge button */}
              {finding.status === 'approved' && (
                <button
                  onClick={openMergePreview}
                  disabled={saving}
                  className="px-4 py-2 bg-green/20 border border-green text-green text-sm hover:bg-green/30 glow-green disabled:opacity-50"
                >
                  [ADD TO PROJECT BIBLE]
                </button>
              )}

              {/* Merged - show confirmation */}
              {finding.status === 'merged' && (
                <span className="px-4 py-2 bg-accent/20 border border-accent text-accent text-sm cursor-default">
                  [ADDED TO BIBLE ✓]
                </span>
              )}

              {/* Enrich button - show if not merged and needs enrichment */}
              {finding.status !== 'merged' && needsEnrichment(finding) && (
                <button
                  onClick={autoEnrich}
                  disabled={enriching}
                  className="px-4 py-2 bg-amber/20 border border-amber text-amber text-sm hover:bg-amber/30 disabled:opacity-50"
                >
                  {enriching ? (
                    <span className="loading">Enriching</span>
                  ) : (
                    '[ENRICH]'
                  )}
                </button>
              )}

              {/* Edit button - show if not merged and already enriched */}
              {finding.status !== 'merged' && !needsEnrichment(finding) && (
                <button
                  onClick={() => setEnrichMode(true)}
                  className="px-4 py-2 bg-surface-hover border border-border text-sm hover:border-accent hover:text-accent"
                >
                  [EDIT]
                </button>
              )}

              <button
                onClick={copyForClaude}
                className="px-4 py-2 bg-surface-hover border border-border text-sm hover:border-accent hover:text-accent"
              >
                [COPY FOR CLAUDE]
              </button>

              <button
                onClick={openInClaude}
                className="px-4 py-2 bg-surface-hover border border-border text-sm hover:border-accent hover:text-accent"
              >
                [OPEN IN CLAUDE →]
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-muted">
        <span className="text-green">$</span> id: {finding.id}
      </div>
    </div>
  )
}
