'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Finding } from '@/lib/supabase'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  approved: 'bg-green-500/20 text-green-400 border-green-500/50',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
  merged: 'bg-accent/20 text-accent border-accent/50',
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

export default function FindingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [finding, setFinding] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFinding()
  }, [params.id])

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
      alert('Failed to update')
    } else {
      await loadFinding()
    }
    setSaving(false)
  }

  function copyForClaude() {
    if (!finding) return
    const text = `# Finding to Review: ${finding.title}

**Source:** ${finding.source_url || finding.source_type}
**Category:** ${categoryLabels[finding.category]}
**Confidence:** ${finding.quality_rating} (${finding.confidence_score}%)

## Summary
${finding.summary}

${finding.code_snippet ? `## Code Example
\`\`\`
${finding.code_snippet}
\`\`\`` : ''}

---
Please help me decide if this should be added to my Project Bible (~PROJECT_BIBLE.md).
- Is this actionable and useful?
- Does it overlap with existing content?
- Which section should it go in?`

    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  function openInClaude() {
    if (!finding) return
    const text = encodeURIComponent(`Review this finding for my Project Bible:\n\n${finding.title}\n\n${finding.summary}`)
    window.open(`https://claude.ai/new?q=${text}`, '_blank')
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>
  }

  if (!finding) {
    return <div className="text-center py-12 text-gray-400">Finding not found</div>
  }

  return (
    <div>
      <Link href="/findings" className="text-sm text-gray-400 hover:text-accent mb-4 inline-block">
        ← Back to Findings
      </Link>

      <div className="bg-surface border border-border rounded-lg p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold mb-2">{finding.title}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1 rounded border ${statusColors[finding.status]}`}>
                {finding.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-400">
                {categoryLabels[finding.category]}
              </span>
              <span className={`text-sm ${finding.quality_rating === 'verified' ? 'text-green-400' : finding.quality_rating === 'tested' ? 'text-yellow-400' : 'text-gray-400'}`}>
                {finding.quality_rating} ({finding.confidence_score}%)
              </span>
            </div>
          </div>
        </div>

        {/* Source */}
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 mb-1">Source</h2>
          <div className="flex items-center gap-2">
            <span className="capitalize">{finding.source_type}</span>
            {finding.source_author && <span className="text-gray-400">by {finding.source_author}</span>}
            {finding.source_url && (
              <a
                href={finding.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline text-sm"
              >
                View Source →
              </a>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 mb-1">Summary</h2>
          <p className="text-gray-200">{finding.summary}</p>
        </div>

        {/* Proposed Section */}
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 mb-1">Proposed Project Bible Section</h2>
          <span className="inline-block bg-accent/20 text-accent px-3 py-1 rounded text-sm font-medium">
            {categoryLabels[finding.category] || finding.category}
          </span>
        </div>

        {/* Code Snippet */}
        {finding.code_snippet && (
          <div className="mb-6">
            <h2 className="text-sm text-gray-400 mb-1">Code Example</h2>
            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm">
              <code>{finding.code_snippet}</code>
            </pre>
          </div>
        )}

        {/* Dates */}
        <div className="mb-6 text-sm text-gray-400">
          <div>Discovered: {new Date(finding.scan_date).toLocaleString()}</div>
          {finding.merged_at && (
            <div>Merged: {new Date(finding.merged_at).toLocaleString()}</div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 mb-1">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this finding..."
            className="w-full bg-background border border-border rounded-lg p-3 text-sm resize-none h-24"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          {finding.status === 'pending_review' && (
            <>
              <button
                onClick={() => updateStatus('approved')}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => updateStatus('rejected', notes)}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                ✗ Reject
              </button>
            </>
          )}

          {finding.status === 'approved' && (
            <button
              onClick={() => updateStatus('merged')}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-dim rounded text-black text-sm font-medium transition-colors disabled:opacity-50"
            >
              Add to Project Bible
            </button>
          )}

          <button
            onClick={copyForClaude}
            className="px-4 py-2 bg-surface-hover border border-border hover:border-accent/50 rounded text-sm transition-colors"
          >
            Copy for Claude
          </button>

          <button
            onClick={openInClaude}
            className="px-4 py-2 bg-surface-hover border border-border hover:border-accent/50 rounded text-sm transition-colors"
          >
            Discuss with Claude →
          </button>
        </div>
      </div>
    </div>
  )
}
