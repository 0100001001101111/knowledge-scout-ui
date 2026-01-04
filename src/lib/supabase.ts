import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Finding = {
  id: string
  source_type: 'twitter' | 'reddit' | 'github' | 'hackernews' | 'discord' | 'other'
  source_url: string | null
  source_author: string | null
  title: string
  summary: string
  code_snippet: string | null
  category: string
  quality_rating: 'verified' | 'tested' | 'theoretical'
  confidence_score: number
  scan_date: string
  status: 'pending_review' | 'approved' | 'rejected' | 'merged'
  rejection_reason: string | null
  merged_at: string | null
  created_at: string
}

export type ScanHistory = {
  id: string
  scan_date: string
  sources_checked: string[]
  findings_count: number
  new_findings: number
  duplicates_skipped: number
  duration_ms: number | null
  notes: string | null
}
