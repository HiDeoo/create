import fs from 'node:fs/promises'
import path from 'node:path'

import glob from 'fast-glob'
import { workspace, type WorkspaceFolder } from 'vscode'

export async function getWorkspaceRecursiveFolders(workspaceFolder: WorkspaceFolder) {
  const excludeGlobs = await getExcludeGlobs(workspaceFolder)

  const folders = await glob('**', {
    cwd: workspaceFolder.uri.fsPath,
    dot: true,
    ignore: excludeGlobs,
    onlyDirectories: true,
  })

  return folders.sort()
}

export async function getWorkspaceFoldersMatchingGlob(workspaceFolder: WorkspaceFolder, pattern: string) {
  const excludeGlobs = await getExcludeGlobs(workspaceFolder)

  const folders = await glob(pattern, {
    caseSensitiveMatch: false,
    cwd: workspaceFolder.uri.fsPath,
    dot: true,
    ignore: excludeGlobs,
    onlyDirectories: true,
  })

  return folders.sort()
}

export async function createNewFileOrFolder(fileOrFolderPath: string) {
  const exists = await fileOrFolderExists(fileOrFolderPath)

  if (exists) {
    return
  }

  if (isFolderPath(fileOrFolderPath)) {
    return fs.mkdir(fileOrFolderPath, { recursive: true })
  }

  const folderPath = path.dirname(fileOrFolderPath)

  await fs.mkdir(folderPath, { recursive: true })

  return fs.appendFile(fileOrFolderPath, '')
}

export function isFolderPath(fileOrFolderPath: string) {
  return fileOrFolderPath.endsWith(path.posix.sep)
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

      excludeGlobs.push(gitignoreEntry.startsWith(path.posix.sep) ? gitignoreEntry.slice(1) : `**/${gitignoreEntry}`)
    }
  } catch {
    // We can safely ignore this error if the file doesn't exist or is not readable.
  }

  return excludeGlobs
}

async function fileOrFolderExists(fileOrFolderPath: string) {
  try {
    await fs.access(fileOrFolderPath)

    return true
  } catch {
    return false
  }
}
