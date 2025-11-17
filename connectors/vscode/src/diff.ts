import * as child_process from 'child_process'
import * as path from 'path'
import { createTwoFilesPatch } from 'diff'

export function tryGitUnifiedDiff(repoDir: string, filePath: string, oldContent: string, newContent: string): string | null {
  try {
    const isRepo = child_process.execSync('git rev-parse --is-inside-work-tree', { cwd: repoDir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim() === 'true'
    if (!isRepo) return null
    // Fallback to generating unified diff against old/new in-memory
    const rel = path.relative(repoDir, filePath)
    return createTwoFilesPatch(rel, rel, oldContent, newContent)
  } catch { return null }
}

export function fallbackUnifiedDiff(filePath: string, oldContent: string, newContent: string): string {
  const name = path.basename(filePath)
  return createTwoFilesPatch(name, name, oldContent, newContent)
}

export function contentPreview(text: string, limit = 512): string {
  if (text.length <= limit) return text
  return text.slice(0, limit)
}