import path from 'node:path'

import { type TextDocument, ViewColumn, window, workspace, type WorkspaceFolder } from 'vscode'

import { isFolderPath } from './fs'

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
    const workspacePrefix = path.join(path.posix.sep, path.basename(workspaceFolder.uri.fsPath))
    const pathRequestPrefix = pathRequest.match(firstPathPortionRegex)?.groups?.['first']

    return workspacePrefix === pathRequestPrefix
  })
}
