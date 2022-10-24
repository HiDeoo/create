import path from 'node:path'

import braces from 'braces'
import { commands, window, workspace, type WorkspaceFolder, type ExtensionContext, QuickPickItemKind } from 'vscode'

import { createNewFileOrFolder, getWorkspaceFoldersMatchingGlob, getWorkspaceRecursiveFolders } from './libs/fs'
import {
  getDocumentWorkspaceFolder,
  getWorkspaceFolderBasename,
  getWorkspaceFolderMatchingPathRequest,
  openFile,
} from './libs/vsc'
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
      picker.onPickWithAutoCompletion = onPickWithAutoCompletion
      picker.onDispose = () => (picker = undefined)
    }),
    commands.registerCommand('new.autoComplete', () => {
      picker?.autoComplete(getAutoCompletionResults)
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
        label: formatFolderLabel(folder, workspaceFolder, isMultiRootWorkspace),
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

  const shortcuts: PathPickerMenuItem[] = workspaceFolders.map((workspaceFolder) => ({
    description: 'workspace root',
    label: isMultiRootWorkspace
      ? path.join(path.posix.sep, getWorkspaceFolderBasename(workspaceFolder))
      : path.posix.sep,
    path: workspaceFolder.uri.fsPath,
  }))

  if (window.activeTextEditor) {
    const activeWorkspaceFolder = getDocumentWorkspaceFolder(window.activeTextEditor.document)
    const activeTextEditorPath = path.dirname(window.activeTextEditor.document.uri.fsPath)

    if (activeWorkspaceFolder && activeWorkspaceFolder !== activeTextEditorPath) {
      shortcuts.push({
        description: 'active folder',
        label: isMultiRootWorkspace
          ? path.join(path.posix.sep, path.relative(path.dirname(activeWorkspaceFolder), activeTextEditorPath))
          : path.join(path.posix.sep, path.relative(activeWorkspaceFolder, activeTextEditorPath)),
        path: activeTextEditorPath,
      })
    }
  }

  shortcuts.push({
    kind: QuickPickItemKind.Separator,
    label: '',
  })

  return shortcuts
}

async function onPick(newPath: string) {
  try {
    const expandedPaths = braces(newPath, { expand: true })

    for (const expandedPath of expandedPaths) {
      await createNewFileOrFolder(expandedPath)
      await openFile(expandedPath)
    }
  } catch (error) {
    console.error(error)

    // TODO(HiDeoo)
  }
}

function onPickWithAutoCompletion(newPathRequest: string) {
  const workspaceFolder = getWorkspaceFolderMatchingPathRequest(newPathRequest)

  if (!workspaceFolder) {
    window.showErrorMessage(`No workspace folder found to create '${newPathRequest}'.`)

    return
  }

  const isMultiRootWorkspace = (workspace.workspaceFolders ?? []).length > 1

  onPick(
    isMultiRootWorkspace
      ? path.join(path.dirname(workspaceFolder.uri.fsPath), newPathRequest)
      : path.join(workspaceFolder.uri.fsPath, newPathRequest)
  )
}

async function getAutoCompletionResults(request: string) {
  const results: string[] = []

  const workspaceFolders = workspace.workspaceFolders ?? []
  const isMultiRootWorkspace = workspaceFolders.length > 1
  const isRootWorkspaceRequest =
    isMultiRootWorkspace &&
    path.dirname(request) === path.posix.sep &&
    (request.length === 1 || request.at(-1) !== path.posix.sep)

  if (isRootWorkspaceRequest) {
    for (const workspaceFolder of workspaceFolders) {
      if (path.join(path.posix.sep, getWorkspaceFolderBasename(workspaceFolder)).startsWith(request)) {
        results.push(path.join(path.posix.sep, getWorkspaceFolderBasename(workspaceFolder)))
      }
    }

    return results
  }

  for (const workspaceFolder of workspaceFolders) {
    const autoCompletionGlob = `${request.slice(1)}*`

    const folders = await getWorkspaceFoldersMatchingGlob(
      workspaceFolder,
      isMultiRootWorkspace
        ? autoCompletionGlob.slice(autoCompletionGlob.indexOf(path.posix.sep) + 1)
        : autoCompletionGlob
    )

    results.push(...folders.map((folder) => formatFolderLabel(folder, workspaceFolder, isMultiRootWorkspace)))
  }

  return results
}

function formatFolderLabel(folder: string, workspaceFolder: WorkspaceFolder, inMultiRootWorkspace: boolean) {
  return inMultiRootWorkspace
    ? path.join(path.posix.sep, getWorkspaceFolderBasename(workspaceFolder), path.posix.sep, folder)
    : path.join(path.posix.sep, folder)
}
