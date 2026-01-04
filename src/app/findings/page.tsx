'use client'

import { useEffect, useState } from 'react'
import { supabase, Finding } from '@/lib/supabase'
import Link from 'next/link'

const sourceIcons: Record<string, string> = {
  twitter: '𝕏',
  reddit: '🔴',
  github: '⬛',
  hackernews: '🟠',
  discord: '💬',
  other: '📄',
}

const statusColors: Record<string, string> = {
  pending_review: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  merged: 'bg-accent/20 text-accent',
}

const categoryLabels: Record<string, string> = {
  new_features: 'New Features',
  prompting_techniques: 'Prompting',
  sub_agents: 'Sub-Agents',
  mcp_servers: 'MCP Servers',
  workflow_tips: 'Workflow',
  configuration: 'Config',
  common_mistakes: 'Mistakes',
  performance: 'Performance',
  other: 'Other',
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'confidence'>('date')

  useEffect(() => {
    loadFindings()
  }, [statusFilter, sourceFilter, categoryFilter, sortBy])

  async function loadFindings() {
    setLoading(true)
    let query = supabase.from('knowledge_findings').select('*')

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    if (sourceFilter !== 'all') {
      query = query.eq('source_type', sourceFilter)
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    if (sortBy === 'date') {
      query = query.order('scan_date', { ascending: false })
    } else {
      query = query.order('confidence_score', { ascending: false })
    }

    const { data, error } = await query
    if (error) {
      console.error('Error loading findings:', error)
    } else {
      setFindings(data || [])
    }
    setLoading(false)
  }

  const stats = {
    total: findings.length,
    pending: findings.filter(f => f.status === 'pending_review').length,
    approved: findings.filter(f => f.status === 'approved').length,
    merged: findings.filter(f => f.status === 'merged').length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Findings</h1>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">Total: {stats.total}</span>
          <span className="text-yellow-400">Pending: {stats.pending}</span>
          <span className="text-green-400">Approved: {stats.approved}</span>
          <span className="text-accent">Merged: {stats.merged}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-surface rounded-lg border border-border">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="pending_review">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="merged">Merged</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-background border border-border rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="twitter">Twitter</option>
            <option value="reddit">Reddit</option>
            <option value="github">GitHub</option>
            <option value="hackernews">Hacker News</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-background border border-border rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'confidence')}
            className="bg-background border border-border rounded px-3 py-1.5 text-sm"
          >
            <option value="date">Newest First</option>
            <option value="confidence">Highest Confidence</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : findings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No findings found</div>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <Link
              key={finding.id}
              href={`/findings/${finding.id}`}
              className="block bg-surface border border-border rounded-lg p-4 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl" title={finding.source_type}>
                  {sourceIcons[finding.source_type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{finding.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[finding.status]}`}>
                      {finding.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                    {finding.summary}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="bg-surface-hover px-2 py-0.5 rounded">
                      {categoryLabels[finding.category] || finding.category}
                    </span>
                    <span className={finding.quality_rating === 'verified' ? 'text-green-400' : finding.quality_rating === 'tested' ? 'text-yellow-400' : 'text-gray-400'}>
                      {finding.quality_rating} ({finding.confidence_score}%)
                    </span>
                    <span>
                      {new Date(finding.scan_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
