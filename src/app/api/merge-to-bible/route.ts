import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const GITHUB_OWNER = process.env.GITHUB_OWNER || '0100001001101111'
const GITHUB_REPO = process.env.GITHUB_REPO || 'project-bible'
const FILE_PATH = process.env.BIBLE_FILE_PATH || 'PROJECT_BIBLE.md'

// Map categories to Project Bible sections
const categoryToSection: Record<string, string> = {
  prompting_techniques: '## Prompting Patterns',
  sub_agents: '## Sub-Agents',
  workflow_tips: '## Dev Environment / Workflow',
  common_mistakes: '## Agent Safety Rails',
  new_features: '## Dev Environment / Workflow',
  mcp_servers: '## MCP Servers (Model Context Protocol)',
  configuration: '## System Prompts / CLAUDE.md Config',
  performance: '## Dev Environment / Workflow',
  other: '## Ideas & Decisions',
}

const FALLBACK_SECTION = '## Ideas & Decisions'

type Finding = {
  id: string
  title: string
  summary: string
  usage: string | null
  details: string | null
  code_snippet: string | null
  original_content: string | null
  category: string
  source_url: string | null
  source_author: string | null
}

async function fetchFileFromGitHub(): Promise<{ content: string; sha: string }> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { content, sha: data.sha }
}

async function commitFileToGitHub(
  content: string,
  sha: string,
  message: string
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
      }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`GitHub commit failed: ${errorData.message || response.statusText}`)
  }

  const data = await response.json()
  return data.commit.html_url
}

function formatFinding(finding: Finding): string {
  let formatted = `\n### ${finding.title}\n\n`

  // Summary - what it is
  formatted += finding.summary

  // Usage - how to use it (commands, examples)
  if (finding.usage) {
    formatted += `\n\n**How to use:**\n${finding.usage}`
  }

  // Code snippet
  if (finding.code_snippet) {
    formatted += `\n\n\`\`\`\n${finding.code_snippet}\n\`\`\``
  }

  // Details - structure, options, etc.
  if (finding.details) {
    formatted += `\n\n${finding.details}`
  }

  // Source link at bottom
  if (finding.source_url) {
    formatted += `\n\n*Source: [${finding.source_author || 'Link'}](${finding.source_url})*`
  }

  formatted += '\n'
  return formatted
}

// Check if finding has enough content for a good merge
function isEnriched(finding: Finding): boolean {
  // Has at least summary + (usage OR code_snippet OR details)
  return !!(finding.summary && (finding.usage || finding.code_snippet || finding.details))
}

function insertIntoSection(content: string, section: string, newContent: string): string {
  const lines = content.split('\n')
  let sectionIndex = -1
  let nextSectionIndex = -1

  // Find the target section
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(section)) {
      sectionIndex = i
      break
    }
  }

  // If section not found, use fallback
  if (sectionIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(FALLBACK_SECTION)) {
        sectionIndex = i
        break
      }
    }
  }

  // Still not found? Append to end
  if (sectionIndex === -1) {
    return content + '\n' + FALLBACK_SECTION + '\n' + newContent
  }

  // Find next section (## header)
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    if (lines[i].match(/^## /)) {
      nextSectionIndex = i
      break
    }
  }

  // Insert before next section (or at end if no next section)
  if (nextSectionIndex === -1) {
    // No next section, append to end
    return content + newContent
  } else {
    // Insert before next section, with proper spacing
    const beforeSection = lines.slice(0, nextSectionIndex).join('\n')
    const afterSection = lines.slice(nextSectionIndex).join('\n')

    // Ensure proper spacing
    const trimmedBefore = beforeSection.replace(/\n+$/, '')
    return trimmedBefore + '\n' + newContent + '\n---\n\n' + afterSection
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { findingId } = body

    if (!findingId) {
      return NextResponse.json(
        { success: false, error: 'Missing findingId' },
        { status: 400 }
      )
    }

    // Fetch finding from Supabase
    const { data: finding, error: fetchError } = await supabase
      .from('knowledge_findings')
      .select('*')
      .eq('id', findingId)
      .single()

    if (fetchError || !finding) {
      return NextResponse.json(
        { success: false, error: 'Finding not found' },
        { status: 404 }
      )
    }

    if (finding.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'Finding must be approved before merging' },
        { status: 400 }
      )
    }

    // Determine target section
    const targetSection = categoryToSection[finding.category] || FALLBACK_SECTION

    // Fetch PROJECT_BIBLE.md from GitHub
    let fileData: { content: string; sha: string }
    try {
      fileData = await fetchFileFromGitHub()
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch file: ${error}` },
        { status: 500 }
      )
    }

    // Format the finding
    const formattedFinding = formatFinding(finding)

    // Insert into correct section
    const updatedContent = insertIntoSection(fileData.content, targetSection, formattedFinding)

    // Commit to GitHub
    let commitUrl: string
    try {
      commitUrl = await commitFileToGitHub(
        updatedContent,
        fileData.sha,
        `Add finding: ${finding.title}\n\n🤖 Added via Knowledge Scout`
      )
    } catch (error: unknown) {
      // If SHA mismatch (file changed), retry once
      if (error instanceof Error && error.message.includes('SHA')) {
        try {
          const retryData = await fetchFileFromGitHub()
          const retryContent = insertIntoSection(retryData.content, targetSection, formattedFinding)
          commitUrl = await commitFileToGitHub(
            retryContent,
            retryData.sha,
            `Add finding: ${finding.title}\n\n🤖 Added via Knowledge Scout`
          )
        } catch (retryError) {
          return NextResponse.json(
            { success: false, error: `GitHub commit failed after retry: ${retryError}` },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: `GitHub commit failed: ${error}` },
          { status: 500 }
        )
      }
    }

    // Update finding status to merged
    const { error: updateError } = await supabase
      .from('knowledge_findings')
      .update({
        status: 'merged',
        merged_at: new Date().toISOString(),
      })
      .eq('id', findingId)

    if (updateError) {
      // Commit succeeded but status update failed - log but don't fail
      console.error('Failed to update finding status:', updateError)
    }

    return NextResponse.json({
      success: true,
      commitUrl,
      section: targetSection,
    })
  } catch (error) {
    console.error('Merge error:', error)
    return NextResponse.json(
      { success: false, error: `Unexpected error: ${error}` },
      { status: 500 }
    )
  }
}

// Preview endpoint - GET to see what would be merged
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const findingId = searchParams.get('findingId')

  if (!findingId) {
    return NextResponse.json(
      { success: false, error: 'Missing findingId' },
      { status: 400 }
    )
  }

  // Fetch finding
  const { data: finding, error } = await supabase
    .from('knowledge_findings')
    .select('*')
    .eq('id', findingId)
    .single()

  if (error || !finding) {
    return NextResponse.json(
      { success: false, error: 'Finding not found' },
      { status: 404 }
    )
  }

  const targetSection = categoryToSection[finding.category] || FALLBACK_SECTION
  const formattedContent = formatFinding(finding)
  const enriched = isEnriched(finding)

  return NextResponse.json({
    success: true,
    preview: {
      section: targetSection,
      formattedContent,
      isEnriched: enriched,
      finding: {
        id: finding.id,
        title: finding.title,
        summary: finding.summary,
        usage: finding.usage,
        details: finding.details,
        code_snippet: finding.code_snippet,
        original_content: finding.original_content,
        source_url: finding.source_url,
        source_author: finding.source_author,
        category: finding.category,
      },
    },
  })
}
