'use client'

import { useEffect, useState } from 'react'
import { supabase, ScanHistory } from '@/lib/supabase'

const EDGE_FUNCTION_URL = 'https://diwkdydpjakvwmzyijrk.supabase.co/functions/v1/knowledge-scout'

export default function ScanPage() {
  const [scans, setScans] = useState<ScanHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ found: number; stored: number } | null>(null)
  const [stats, setStats] = useState({ total: 0, pending: 0 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Load scan history
    const { data: scanData } = await supabase
      .from('knowledge_scan_history')
      .select('*')
      .order('scan_date', { ascending: false })
      .limit(20)

    if (scanData) setScans(scanData)

    // Load stats
    const { count: total } = await supabase
      .from('knowledge_findings')
      .select('*', { count: 'exact', head: true })

    const { count: pending } = await supabase
      .from('knowledge_findings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review')

    setStats({ total: total || 0, pending: pending || 0 })
    setLoading(false)
  }

  const lastScan = scans[0]
  const daysSinceLastScan = lastScan
    ? Math.floor((Date.now() - new Date(lastScan.scan_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  async function runScoutNow() {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch(EDGE_FUNCTION_URL)
      const data = await res.json()
      setScanResult(data)
      // Reload data to show new findings
      await loadData()
    } catch (err) {
      console.error('Scout scan failed:', err)
      alert('Scan failed. Check console for details.')
    } finally {
      setScanning(false)
    }
  }

  function copyScanPrompt() {
    const prompt = `Run the Knowledge Scout agent from ~/.claude/agents/knowledge-scout.md

1. Check when the last scan was (query knowledge_scan_history)
2. Search these sources for Claude Code content from the past 7 days:
   - Twitter: @anthropicboris, @alexalbert__, @claboratory, #claudecode
   - Reddit: r/ClaudeAI, r/LocalLLaMA, r/ChatGPTCoding
   - GitHub: trending claude repos, anthropics/claude-code issues
   - Hacker News: Claude Code mentions

3. For each finding:
   - Check if it's already in PROJECT_BIBLE.md (skip if duplicate)
   - Rate quality (verified/tested/theoretical)
   - Categorize by Project Bible section
   - Store in Supabase knowledge_findings table

4. Update NEW_FINDINGS.md with the digest
5. Log the scan in knowledge_scan_history`

    navigator.clipboard.writeText(prompt)
    alert('Scan prompt copied! Paste it into Claude Code.')
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Knowledge Scout</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-3xl font-bold text-accent">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Findings</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-gray-400">Pending Review</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-3xl font-bold">
            {daysSinceLastScan !== null ? (
              daysSinceLastScan === 0 ? 'Today' : `${daysSinceLastScan}d ago`
            ) : 'Never'}
          </div>
          <div className="text-sm text-gray-400">Last Scan</div>
        </div>
      </div>

      {/* Run Scan */}
      <div className="bg-surface border border-border rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Run New Scan</h2>
        <p className="text-gray-400 text-sm mb-4">
          The Knowledge Scout scans GitHub and Hacker News for new Claude Code tips.
          Runs automatically at 3am UTC daily, or trigger manually below.
        </p>

        {scanResult && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded text-green-400 text-sm">
            Scan complete: Found {scanResult.found} items, stored {scanResult.stored} new findings
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={runScoutNow}
            disabled={scanning}
            className="px-4 py-2 bg-accent hover:bg-accent-dim text-black rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? 'Scanning...' : 'Run Scout Now'}
          </button>
          <button
            onClick={copyScanPrompt}
            className="px-4 py-2 bg-surface-hover border border-border hover:border-accent/50 rounded transition-colors"
          >
            Copy Full Scan Prompt
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-3">
          Note: "Run Scout Now" scans HN + GitHub only. Use "Full Scan Prompt" in Claude Code for Twitter/Reddit.
        </p>
      </div>

      {/* Scan History */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Scan History</h2>
        {scans.length === 0 ? (
          <p className="text-gray-400 text-sm">No scans yet. Run your first scan above.</p>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {new Date(scan.scan_date).toLocaleDateString()} at{' '}
                    {new Date(scan.scan_date).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    {scan.new_findings} new findings • {scan.duplicates_skipped} duplicates skipped
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  {scan.duration_ms && (
                    <div>{(scan.duration_ms / 1000).toFixed(1)}s</div>
                  )}
                  {scan.notes && (
                    <div className="max-w-xs truncate" title={scan.notes}>
                      {scan.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
