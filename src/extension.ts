import path from 'node:path'

import { commands, window, workspace, type WorkspaceFolder, type ExtensionContext, QuickPickItemKind } from 'vscode'

import { createNewFileOrFolder, getWorkspaceRecursiveFolders } from './libs/fs'
import { openFile } from './libs/vsc'
import { PathPicker, type PathPickerMenuItem } from './PathPicker'

export function activate(context: ExtensionContext): void {
  let picker: PathPicker | undefined

  context.subscriptions.push(
    commands.registerCommand('new.pick', async () => {
      const workspaceFolders = workspace.workspaceFolders

      if (!workspaceFolders || workspaceFolders.length === 0) {
        window.showErrorMessage('No workspace folder found, please open a folder first.')

        return
      }

      picker = new PathPicker(getPathPickerMenuItems(workspaceFolders))
      picker.onPick = onPick
      picker.onDispose = () => (picker = undefined)
    }),
    commands.registerCommand('new.tab', () => {
      picker?.autoComplete()
    })
  )
}

async function getPathPickerMenuItems(workspaceFolders: readonly WorkspaceFolder[]): Promise<PathPickerMenuItem[]> {
  const isMultiRootWorkspace = workspaceFolders.length > 1
  let didPushMenuItems = false

  const menuItems = getPathPickerMenuItemShortcuts(workspaceFolders)

  for (const workspaceFolder of workspaceFolders) {
    const folders = await getWorkspaceRecursiveFolders(workspaceFolder)

    if (folders.length > 0) {
      didPushMenuItems = true
    }

    menuItems.push(
      ...folders.map((folder) => ({
        label: isMultiRootWorkspace
          ? path.join(path.posix.sep, workspaceFolder.name, path.posix.sep, folder)
          : path.join(path.posix.sep, folder),
        path: path.join(workspaceFolder.uri.fsPath, folder),
      }))
    )
  }

  if (!didPushMenuItems) {
    menuItems.pop()
  }

  return menuItems
}

function getPathPickerMenuItemShortcuts(workspaceFolders: readonly WorkspaceFolder[]): PathPickerMenuItem[] {
  const isMultiRootWorkspace = workspaceFolders.length > 1

  return [
    ...workspaceFolders.map((workspaceFolder) => ({
      description: 'workspace root',
      label: isMultiRootWorkspace ? path.join(path.posix.sep, workspaceFolder.name) : path.posix.sep,
      path: workspaceFolder.uri.fsPath,
    })),
    {
      kind: QuickPickItemKind.Separator,
      label: '',
    },
  ]
}

async function onPick(newPath: string) {
  try {
    await createNewFileOrFolder(newPath)
    await openFile(newPath)
  } catch (error) {
    console.error(error)

    // TODO(HiDeoo)
  }
}
