import Link from 'next/link'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-strong-${index}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>
  })
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split(/\r?\n/)
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    const nodeIndex = nodes.length

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed === '---') {
      nodes.push(<hr key={`hr-${nodeIndex}`} className="my-6 border-cream-200" />)
      i += 1
      continue
    }

    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h3 key={`h3-${nodeIndex}`} className="mt-6 text-lg font-semibold text-warm-gray-900">
          {renderInlineMarkdown(trimmed.slice(4), `h3-${nodeIndex}`)}
        </h3>
      )
      i += 1
      continue
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h2 key={`h2-${nodeIndex}`} className="mt-8 text-xl font-semibold text-warm-gray-900">
          {renderInlineMarkdown(trimmed.slice(3), `h2-${nodeIndex}`)}
        </h2>
      )
      i += 1
      continue
    }

    if (trimmed.startsWith('# ')) {
      nodes.push(
        <h1 key={`h1-${nodeIndex}`} className="text-2xl font-semibold text-sky-700">
          {renderInlineMarkdown(trimmed.slice(2), `h1-${nodeIndex}`)}
        </h1>
      )
      i += 1
      continue
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i += 1
      }

      const hasSeparator =
        tableLines.length > 1 && /^\|?\s*[-:| ]+\|?\s*$/.test(tableLines[1])

      if (!hasSeparator) {
        nodes.push(
          <pre
            key={`table-pre-${nodeIndex}`}
            className="overflow-x-auto rounded-xl border border-cream-200 bg-cream-50 p-3 text-xs text-warm-gray-700"
          >
            {tableLines.join('\n')}
          </pre>
        )
        continue
      }

      const headers = parseTableRow(tableLines[0])
      const rows = tableLines.slice(2).map(parseTableRow)

      nodes.push(
        <div key={`table-${nodeIndex}`} className="overflow-x-auto rounded-xl border border-cream-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-cream-100 text-left text-warm-gray-800">
              <tr>
                {headers.map((header, headerIndex) => (
                  <th
                    key={`th-${nodeIndex}-${headerIndex}`}
                    className="border-b border-cream-200 px-3 py-2 font-semibold"
                  >
                    {renderInlineMarkdown(header, `th-${nodeIndex}-${headerIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`tr-${nodeIndex}-${rowIndex}`} className="odd:bg-white even:bg-cream-50/50">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`td-${nodeIndex}-${rowIndex}-${cellIndex}`}
                      className="border-t border-cream-200 px-3 py-2 text-warm-gray-700"
                    >
                      {renderInlineMarkdown(cell, `td-${nodeIndex}-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2))
        i += 1
      }

      nodes.push(
        <ul key={`list-${nodeIndex}`} className="list-disc space-y-1 pl-5 text-sm leading-6 text-warm-gray-700">
          {items.map((item, itemIndex) => (
            <li key={`list-${nodeIndex}-item-${itemIndex}`}>
              {renderInlineMarkdown(item, `list-${nodeIndex}-item-${itemIndex}`)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length) {
      const current = lines[i].trim()
      if (!current || current === '---' || current.startsWith('#') || current.startsWith('- ') || current.startsWith('|')) {
        break
      }

      paragraphLines.push(current)
      i += 1
    }

    if (paragraphLines.length === 0) {
      i += 1
      continue
    }

    nodes.push(
      <p key={`p-${nodeIndex}`} className="text-sm leading-7 text-warm-gray-700">
        {renderInlineMarkdown(paragraphLines.join(' '), `p-${nodeIndex}`)}
      </p>
    )
  }

  return nodes
}

export default async function ChangeLogPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return <div>Unauthorized</div>
  }

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  })

  if (!user) {
    return <div>User not found</div>
  }

  if (!hasPermission(user.role, 'changelog:view')) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-coral-100 border border-coral-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-warm-gray-900 mb-2">Access Denied</h2>
          <p className="text-warm-gray-700">You do not have permission to view the changelog.</p>
          <Link
            href="/dashboard"
            className="inline-block mt-4 px-4 py-2 bg-sage-600 text-white rounded hover:bg-sage-700 text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const changelogPath = join(process.cwd(), 'USER-CHANGES.md')
  let changelogContent = ''
  let updatedLabel = 'Unknown'
  let fileError: string | null = null

  try {
    const [content, fileStats] = await Promise.all([
      readFile(changelogPath, 'utf8'),
      stat(changelogPath),
    ])
    changelogContent = content
    updatedLabel = fileStats.mtime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    fileError = 'Unable to load USER-CHANGES.md.'
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sky-700 mb-1">Change Log</h1>
        <p className="text-sm text-warm-gray-600">
          Updates for staff users. Source file: <code>USER-CHANGES.md</code>
        </p>
        <p className="text-xs text-warm-gray-500 mt-1">Last file update: {updatedLabel}</p>
      </div>

      <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-6 space-y-4">
        {fileError ? (
          <p className="text-sm text-coral-700">{fileError}</p>
        ) : (
          renderMarkdown(changelogContent)
        )}
      </div>
    </div>
  )
}
