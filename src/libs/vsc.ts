import { type TextDocument, ViewColumn, window, workspace } from 'vscode'

import { isFolderPath } from './fs'

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
