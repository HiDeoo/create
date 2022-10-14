import glob from 'fast-glob'
import { type WorkspaceFolder } from 'vscode'

export async function getWorkspacesBaseDirectories(workspaceFolders: readonly WorkspaceFolder[]) {
  const baseDirectories: string[] = []

  for (const workspaceFolder of workspaceFolders) {
    const workspaceDirectories = await glob('**', {
      cwd: workspaceFolder.uri.fsPath,
      onlyDirectories: true,
    })

    baseDirectories.push(...workspaceDirectories.sort())
  }

  return baseDirectories
}
