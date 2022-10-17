import fs from 'node:fs/promises'
import path from 'node:path'

import glob from 'fast-glob'
import { workspace, type WorkspaceFolder } from 'vscode'

export async function getWorkspacesBaseDirectories(workspaceFolders: readonly WorkspaceFolder[]) {
  const baseDirectories: string[] = []

  for (const workspaceFolder of workspaceFolders) {
    const excludeGlobs = await getExcludeGlobs(workspaceFolder)

    const workspaceDirectories = await glob('**', {
      cwd: workspaceFolder.uri.fsPath,
      dot: true,
      ignore: excludeGlobs,
      onlyDirectories: true,
    })

    baseDirectories.push(...workspaceDirectories.sort())
  }

  return baseDirectories
}

async function getExcludeGlobs(workspaceFolder: WorkspaceFolder) {
  return [...getVscExcludeGlobs(workspaceFolder), ...(await getGitignoreExcludeGlobs(workspaceFolder))]
}

function getVscExcludeGlobs(workspaceFolder: WorkspaceFolder) {
  const filesExclude = workspace.getConfiguration('files', workspaceFolder).get<Record<string, boolean>>('exclude')

  const excludeGlobs: string[] = []

  if (filesExclude) {
    for (const [glob, enabled] of Object.entries(filesExclude)) {
      if (enabled) {
        excludeGlobs.push(glob)
      }
    }
  }

  return excludeGlobs
}

async function getGitignoreExcludeGlobs(workspaceFolder: WorkspaceFolder) {
  const excludeGlobs: string[] = []

  try {
    const gitignore = await fs.readFile(path.join(workspaceFolder.uri.fsPath, '.gitignore'), 'utf8')
    const gitignoreEntries = gitignore.split(/\r?\n/)

    for (const gitignoreEntry of gitignoreEntries) {
      if (gitignoreEntry.length === 0 || gitignoreEntry.startsWith('#')) {
        continue
      }

      excludeGlobs.push(gitignoreEntry.startsWith('/') ? gitignoreEntry.slice(1) : `**/${gitignoreEntry}`)
    }
  } catch {
    // We can safely ignore this error if the file doesn't exist or is not readable.
  }

  return excludeGlobs
}
