'use client'

import { useEffect, useState } from 'react'
import { supabase, Finding } from '@/lib/supabase'
import Link from 'next/link'

const sourceLabels: Record<string, string> = {
  twitter: 'TWTR',
  reddit: 'RDDT',
  github: 'GH',
  hackernews: 'HN',
  discord: 'DISC',
  other: 'OTHER',
}

const statusLabels: Record<string, { text: string; class: string }> = {
  pending_review: { text: '[PENDING]', class: 'text-amber' },
  approved: { text: '[APPROVED]', class: 'text-green' },
  rejected: { text: '[REJECTED]', class: 'text-red' },
  merged: { text: '[MERGED]', class: 'text-accent' },
}

const categoryLabels: Record<string, string> = {
  new_features: 'features',
  prompting_techniques: 'prompting',
  sub_agents: 'agents',
  mcp_servers: 'mcp',
  workflow_tips: 'workflow',
  configuration: 'config',
  common_mistakes: 'mistakes',
  performance: 'perf',
  other: 'other',
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
      {/* Header with stats */}
      <div className="mb-6">
        <div className="text-green mb-2">┌─ FINDINGS DATABASE ─────────────────────────────────────────┐</div>
        <div className="flex items-center gap-6 text-sm pl-2">
          <span className="text-muted">│</span>
          <span>total: <span className="text-foreground">{stats.total}</span></span>
          <span className="text-amber">pending: {stats.pending}</span>
          <span className="text-green">approved: {stats.approved}</span>
          <span className="text-accent">merged: {stats.merged}</span>
        </div>
        <div className="text-green mt-2">└──────────────────────────────────────────────────────────────┘</div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-surface border border-border">
        <div className="text-muted text-xs mb-3">$ filter --options</div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-muted block mb-1">--status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="all">*</option>
              <option value="pending_review">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="merged">merged</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">--source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="all">*</option>
              <option value="twitter">twitter</option>
              <option value="reddit">reddit</option>
              <option value="github">github</option>
              <option value="hackernews">hackernews</option>
              <option value="other">other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">--category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="all">*</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">--sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'confidence')}
              className="px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="date">date:desc</option>
              <option value="confidence">confidence:desc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="text-center py-12 text-muted">
          <span className="loading">Loading findings</span>
        </div>
      ) : findings.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <div>No findings match query.</div>
          <div className="text-xs mt-2">Try adjusting filters.</div>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_100px_80px_100px] gap-2 text-xs text-muted px-3 py-2 border-b border-border">
            <span>SOURCE</span>
            <span>TITLE</span>
            <span>CATEGORY</span>
            <span>CONF</span>
            <span>STATUS</span>
          </div>

          {/* Findings rows */}
          {findings.map((finding, index) => (
            <Link
              key={finding.id}
              href={`/findings/${finding.id}`}
              className="grid grid-cols-[80px_1fr_100px_80px_100px] gap-2 items-center px-3 py-2 hover:bg-surface-hover border-l-2 border-transparent hover:border-green transition-all group"
            >
              {/* Source */}
              <span className="text-xs text-muted">
                [{sourceLabels[finding.source_type]}]
              </span>

              {/* Title */}
              <div className="min-w-0">
                <div className="truncate group-hover:text-green transition-colors">
                  {finding.title}
                </div>
                <div className="text-xs text-muted truncate mt-0.5">
                  {finding.summary.slice(0, 60)}...
                </div>
              </div>

              {/* Category */}
              <span className="text-xs text-accent">
                {categoryLabels[finding.category] || finding.category}
              </span>

              {/* Confidence */}
              <span className={`text-xs ${
                finding.confidence_score >= 80 ? 'text-green' :
                finding.confidence_score >= 60 ? 'text-amber' : 'text-muted'
              }`}>
                {finding.confidence_score}%
              </span>

              {/* Status */}
              <span className={`text-xs ${statusLabels[finding.status].class}`}>
                {statusLabels[finding.status].text}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border text-xs text-muted">
        <span className="text-green">$</span> Showing {findings.length} findings
        <span className="text-muted ml-4">│</span>
        <span className="ml-4">Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
