import path from 'node:path'

import { type TextDocument, ViewColumn, window, workspace, type WorkspaceFolder, type TextEditor } from 'vscode'

import { getPosixPath, isFolderPath } from './fs'

const firstPathPortionRegex = /^(?<first>\/[^/]*)/

export async function openFile(fileOrFolderPath: string) {
  if (isFolderPath(fileOrFolderPath)) {
    return
  }

  const textDocument = await workspace.openTextDocument(fileOrFolderPath)

  return window.showTextDocument(textDocument, { preview: false, viewColumn: ViewColumn.Active })
}

export function getDocumentWorkspaceFolder(document: TextDocument): string | undefined {
  const workspaceFolder = workspace.getWorkspaceFolder(document.uri)

  return workspaceFolder?.uri.fsPath
}

export function getWorkspaceFolderBasename(workspaceFolder: WorkspaceFolder): string {
  return path.basename(workspaceFolder.uri.fsPath)
}

export function getWorkspaceFolderMatchingPathRequest(pathRequest: string) {
  const workspaceFolders = workspace.workspaceFolders

  if (!workspaceFolders || workspaceFolders.length === 0) {
    return
  }

  if (workspaceFolders.length === 1) {
    return workspaceFolders[0]
  }

  return workspaceFolders.find((workspaceFolder) => {
    const workspacePrefix = getPosixPath(path.join(path.sep, path.basename(workspaceFolder.uri.fsPath)))
    const pathRequestPrefix = pathRequest.match(firstPathPortionRegex)?.groups?.['first']

    return workspacePrefix === pathRequestPrefix
  })
}

export function isWorkspaceWithFolders(
  workspaceFolders: readonly WorkspaceFolder[] | undefined
): workspaceFolders is readonly [WorkspaceFolder, ...(readonly WorkspaceFolder[])] {
  if (!workspaceFolders || workspaceFolders.length === 0) {
    window.showErrorMessage('No workspace folder found, please open a folder first.')

    return false
  }

  return true
}

export function isFileTextEditor(textEditor: TextEditor | undefined): textEditor is TextEditor {
  if (!textEditor || textEditor.document.isUntitled || textEditor.document.uri.scheme !== 'file') {
    window.showErrorMessage('No opened file found, please open a file first.')

    return false
  }

  return true
}
