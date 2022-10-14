import glob from 'fast-glob'
import { workspace, type WorkspaceFolder } from 'vscode'

export async function getWorkspacesBaseDirectories(workspaceFolders: readonly WorkspaceFolder[]) {
  const baseDirectories: string[] = []

  for (const workspaceFolder of workspaceFolders) {
    const workspaceDirectories = await glob('**', {
      cwd: workspaceFolder.uri.fsPath,
      dot: true,
      ignore: getVscExcludeGlobs(workspaceFolder),
      onlyDirectories: true,
    })

    baseDirectories.push(...workspaceDirectories.sort())
  }

  return baseDirectories
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
