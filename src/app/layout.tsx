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
      <body className="min-h-screen">
        <nav className="border-b border-border bg-surface sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/findings" className="text-accent font-bold text-lg">
              Knowledge Scout
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/findings" className="hover:text-accent transition-colors">
                Findings
              </Link>
              <Link href="/scan" className="hover:text-accent transition-colors">
                Scan
              </Link>
              <Link href="/bible" className="hover:text-accent transition-colors">
                Project Bible
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
