import { ViewColumn, window, workspace } from 'vscode'

import { isFolderPath } from './fs'

export async function openFile(fileOrFolderPath: string) {
  if (isFolderPath(fileOrFolderPath)) {
    return
  }

  const textDocument = await workspace.openTextDocument(fileOrFolderPath)

  return window.showTextDocument(textDocument, ViewColumn.Active)
}
