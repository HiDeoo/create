import { commands, window, workspace, type ExtensionContext } from 'vscode'

import { createNewFileOrFolder, getWorkspacesBaseDirectories } from './libs/fs'
import { openFile } from './libs/vsc'
import { PathPicker } from './PathPicker'

export function activate(context: ExtensionContext): void {
  let picker: PathPicker | undefined

  context.subscriptions.push(
    commands.registerCommand('new.pick', async () => {
      const workspaceFolders = workspace.workspaceFolders

      if (!workspaceFolders || workspaceFolders.length === 0) {
        window.showErrorMessage('No workspace folder found, please open a folder first.')

        return
      }

      picker = new PathPicker(getWorkspacesBaseDirectories(workspaceFolders))
      picker.onPick = onPick
      picker.onDispose = () => (picker = undefined)
    }),
    commands.registerCommand('new.tab', () => {
      picker?.autoComplete()
    })
  )
}

async function onPick(pickedPath: string) {
  try {
    await createNewFileOrFolder(pickedPath)
    await openFile(pickedPath)
  } catch (error) {
    console.error(error)

    // TODO(HiDeoo)
  }
}
