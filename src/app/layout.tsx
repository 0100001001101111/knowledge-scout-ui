import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Knowledge Scout',
  description: 'Claude Code knowledge tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen scanlines">
        {/* Terminal header */}
        <nav className="border-b border-border bg-surface sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-2">
            {/* Title bar */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-red">&bull;</span>
                <span className="text-amber">&bull;</span>
                <span className="text-green">&bull;</span>
                <span className="text-muted text-xs ml-2">knowledge-scout v1.0.0</span>
              </div>
              <span className="text-muted text-xs">~/claude/knowledge-scout</span>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 text-sm">
              <span className="text-green">$</span>
              <Link
                href="/findings"
                className="text-accent hover:text-green px-2 py-1 hover:bg-surface-hover transition-colors"
              >
                ./findings
              </Link>
              <span className="text-muted">│</span>
              <Link
                href="/scan"
                className="text-accent hover:text-green px-2 py-1 hover:bg-surface-hover transition-colors"
              >
                ./scan
              </Link>
              <span className="text-muted">│</span>
              <Link
                href="/bible"
                className="text-accent hover:text-green px-2 py-1 hover:bg-surface-hover transition-colors"
              >
                ./bible
              </Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-3 text-xs text-muted">
            <span className="text-green">▶</span> Ready for input...
          </div>
        </footer>
      </body>
    </html>
  )
}
