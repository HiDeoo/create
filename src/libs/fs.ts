import fs from 'node:fs/promises'
import path from 'node:path'

import glob from 'fast-glob'
import { workspace, type WorkspaceFolder } from 'vscode'

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

  if (fileOrFolderPath.endsWith(path.posix.sep)) {
    return fs.mkdir(fileOrFolderPath, { recursive: true })
  }

  const folderPath = path.dirname(fileOrFolderPath)

  await fs.mkdir(folderPath, { recursive: true })

  return fs.appendFile(fileOrFolderPath, '')
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

export interface BaseDirectory {
  label: string
  path: string
}
