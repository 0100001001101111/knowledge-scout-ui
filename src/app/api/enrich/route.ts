import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type Finding = {
  id: string
  title: string
  summary: string
  original_content: string | null
  source_url: string | null
  source_author: string | null
  source_type: string
  category: string
  usage: string | null
  details: string | null
  code_snippet: string | null
}

async function fetchSourceContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeScout/1.0)',
      },
    })

    if (!response.ok) return null

    const html = await response.text()

    // Basic HTML to text conversion
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000) // Limit to 10k chars

    return text
  } catch (error) {
    console.error('Failed to fetch source:', error)
    return null
  }
}

async function extractWithClaude(finding: Finding, sourceContent: string | null): Promise<{
  summary: string
  usage: string | null
  details: string | null
  code_snippet: string | null
}> {
  const content = `
You are extracting structured information from a Claude Code tip/finding for a knowledge base.

## Finding Title
${finding.title}

## Original Content (from ${finding.source_type})
${finding.original_content || 'N/A'}

## Source Author
${finding.source_author || 'Unknown'}

${sourceContent ? `## Full Source Page Content
${sourceContent}` : ''}

---

Extract the following fields. Be concise and actionable. If a field doesn't apply, return null.

1. **summary**: 1-2 sentences explaining what this is and why it's useful. Don't just repeat the title.

2. **usage**: How to actually use this. Include:
   - Commands (e.g., \`/command\`, \`claude --flag\`)
   - Steps to implement
   - Example prompts
   Format as a short bulleted list or commands.

3. **code_snippet**: Any code example, file structure, or configuration. Only include if there's actual code/config to show. Format properly.

4. **details**: Additional context like:
   - File/folder structures
   - Configuration options
   - Edge cases or caveats
   - When to use vs not use
   Only include if there's meaningful detail beyond summary/usage.

Respond in this exact JSON format:
{
  "summary": "...",
  "usage": "..." or null,
  "code_snippet": "..." or null,
  "details": "..." or null
}
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  })

  // Extract text from response
  const textBlock = response.content.find(block => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON from response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      summary: parsed.summary || finding.summary,
      usage: parsed.usage || null,
      details: parsed.details || null,
      code_snippet: parsed.code_snippet || null,
    }
  } catch {
    throw new Error('Failed to parse Claude response as JSON')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { findingId, save } = body

    if (!findingId) {
      return NextResponse.json(
        { success: false, error: 'Missing findingId' },
        { status: 400 }
      )
    }

    // Fetch finding
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

    // Fetch source content if URL exists
    let sourceContent: string | null = null
    if (finding.source_url) {
      sourceContent = await fetchSourceContent(finding.source_url)
    }

    // Extract fields with Claude
    const extracted = await extractWithClaude(finding, sourceContent)

    // If save=true, update the finding in database
    if (save) {
      const { error: updateError } = await supabase
        .from('knowledge_findings')
        .update({
          summary: extracted.summary,
          usage: extracted.usage,
          details: extracted.details,
          code_snippet: extracted.code_snippet,
        })
        .eq('id', findingId)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'Failed to save enrichment' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      extracted,
      sourceContentFetched: !!sourceContent,
    })
  } catch (error) {
    console.error('Enrich error:', error)
    return NextResponse.json(
      { success: false, error: `Enrichment failed: ${error}` },
      { status: 500 }
    )
  }
}
