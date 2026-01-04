'use client'

import { useEffect, useState } from 'react'
import { supabase, Finding } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

export default function BiblePage() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [recentMerges, setRecentMerges] = useState<Finding[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Load recently merged findings
    const { data: merges } = await supabase
      .from('knowledge_findings')
      .select('*')
      .eq('status', 'merged')
      .order('merged_at', { ascending: false })
      .limit(10)

    if (merges) setRecentMerges(merges)

    // Try to load Project Bible content
    // Note: This would need a server action or API route to read the file
    // For now, we'll show instructions
    setContent(`# Project Bible

> **Note:** The Project Bible is stored at \`~/PROJECT_BIBLE.md\` on your local machine.

To view it in Claude Code, run:
\`\`\`
Read ~/PROJECT_BIBLE.md
\`\`\`

Or open it directly:
\`\`\`
open ~/PROJECT_BIBLE.md
\`\`\`

---

## Recently Merged Findings

The findings below have been approved and merged into your Project Bible.
`)

    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Project Bible</h1>
        <button
          onClick={() => {
            navigator.clipboard.writeText('Read ~/PROJECT_BIBLE.md')
            alert('Command copied!')
          }}
          className="px-4 py-2 bg-surface-hover border border-border hover:border-accent/50 rounded text-sm transition-colors"
        >
          Copy Read Command
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-6">
          <div className="prose max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {/* Recently Merged */}
          {recentMerges.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <h2 className="text-lg font-medium mb-4">Recently Merged</h2>
              <div className="space-y-3">
                {recentMerges.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-3 bg-background rounded-lg"
                  >
                    <div className="font-medium text-accent">{finding.title}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {finding.summary.slice(0, 150)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Merged {finding.merged_at && new Date(finding.merged_at).toLocaleDateString()}
                      {' • '}
                      {finding.category.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-medium mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('open ~/PROJECT_BIBLE.md')
                  alert('Command copied!')
                }}
                className="w-full text-left px-3 py-2 bg-background rounded hover:bg-surface-hover transition-colors text-sm"
              >
                📄 Open in Editor
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('Show pending findings from knowledge_findings and help me review them for the Project Bible')
                  alert('Prompt copied!')
                }}
                className="w-full text-left px-3 py-2 bg-background rounded hover:bg-surface-hover transition-colors text-sm"
              >
                👁 Review Pending
              </button>
              <button
                onClick={() => {
                  const text = `Analyze my PROJECT_BIBLE.md and suggest:
1. Which sections are outdated
2. Which topics need more coverage
3. Any reorganization opportunities`
                  navigator.clipboard.writeText(text)
                  alert('Prompt copied!')
                }}
                className="w-full text-left px-3 py-2 bg-background rounded hover:bg-surface-hover transition-colors text-sm"
              >
                🔍 Analyze Coverage
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-medium mb-3">Merge Stats</h3>
            <div className="text-3xl font-bold text-accent">{recentMerges.length}</div>
            <div className="text-sm text-gray-400">Findings merged</div>
          </div>

          {/* Categories */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-medium mb-3">Merged by Category</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(
                recentMerges.reduce((acc, f) => {
                  acc[f.category] = (acc[f.category] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([cat, count]) => (
                <div key={cat} className="flex justify-between">
                  <span className="text-gray-400">{cat.replace('_', ' ')}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
