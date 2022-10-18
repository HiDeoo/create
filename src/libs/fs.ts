import fs from 'node:fs/promises'
import path from 'node:path'

import glob from 'fast-glob'
import { QuickPickItemKind, workspace, type WorkspaceFolder } from 'vscode'

export async function getWorkspacesBaseDirectories(workspaceFolders: readonly WorkspaceFolder[]) {
  const isMultiRootWorkspace = workspaceFolders.length > 1

  const baseDirectories: BaseDirectory[] = []

  for (const workspaceFolder of workspaceFolders) {
    const excludeGlobs = await getExcludeGlobs(workspaceFolder)

    const workspaceDirectories = await glob('**', {
      cwd: workspaceFolder.uri.fsPath,
      dot: true,
      ignore: excludeGlobs,
      onlyDirectories: true,
    })

    baseDirectories.push(
      {
        description: 'workspace root',
        label: isMultiRootWorkspace ? path.join(path.posix.sep, workspaceFolder.name) : path.posix.sep,
        path: workspaceFolder.uri.fsPath,
      },
      {
        kind: QuickPickItemKind.Separator,
        label: '',
      },
      ...workspaceDirectories.sort().map((directory) => ({
        label: isMultiRootWorkspace
          ? path.join(path.posix.sep, workspaceFolder.name, path.posix.sep, directory)
          : path.join(path.posix.sep, directory),
        path: path.join(workspaceFolder.uri.fsPath, directory),
      }))
    )
  }

  return baseDirectories
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

export function isQualifiedBaseDirectory(
  baseDirectory: BaseDirectory | undefined
): baseDirectory is QualifiedBaseDirectory {
  return typeof baseDirectory !== 'undefined' && typeof (baseDirectory as QualifiedBaseDirectory).path !== 'undefined'
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

export type BaseDirectory = QualifiedBaseDirectory | BaseDirectorySeparator

interface QualifiedBaseDirectory {
  description?: string
  label: string
  path: string
}

interface BaseDirectorySeparator {
  label: string
  kind: QuickPickItemKind
}
