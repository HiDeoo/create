import fs from 'node:fs'
import path from 'node:path'

import glob from 'fast-glob'
import Mocha from 'mocha'
import { stub } from 'sinon'
import {
  type QuickPick,
  type QuickPickItem,
  window,
  commands,
  EventEmitter,
  workspace,
  QuickPickItemKind,
} from 'vscode'

export function runSuite(testsRoot: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const mocha = new Mocha({
      color: true,
      reporter: undefined,
      ui: 'bdd',
    })

    const testFiles = glob.sync(['**.test.js'], { absolute: true, cwd: testsRoot })

    for (const testFile of testFiles) {
      mocha.addFile(testFile)
    }

    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`))
        } else {
          resolve()
        }
      })
    } catch (error) {
      console.error(error)

      reject(error)
    }
  })
}

export async function withExtension(run: (withExtensionHelpers: WithExtensionHelpers) => Promise<void>) {
  let quickPick: QuickPick<QuickPickItem> | undefined
  let quickPickAcceptEventEmitter: EventEmitter<void> | undefined

  const createQuickPickStub = stub(window, 'createQuickPick').callsFake(() => {
    quickPick = createQuickPickStub.wrappedMethod()

    quickPickAcceptEventEmitter = new EventEmitter<void>()
    stub(quickPick, 'onDidAccept').callsFake(quickPickAcceptEventEmitter.event)

    return quickPick
  })

  function isPathPickerAvailable() {
    return typeof quickPick !== 'undefined'
  }

  function pathPickerBaseDirectoriesEqual(expectedBaseDirectories: string[]) {
    const quickPickItems = (quickPick?.items ?? []).filter((item) => item.kind !== QuickPickItemKind.Separator)

    return (
      expectedBaseDirectories.every((expectedBaseDirectory, index) => {
        const baseDirectory = quickPickItems[index]
        const isEqual = baseDirectory?.label === expectedBaseDirectory

        if (!isEqual) {
          console.error(
            `Path picker base directory '${baseDirectory?.label}' does not equal '${expectedBaseDirectory}'.`
          )
        }

        return isEqual
      }) ?? false
    )
  }

  async function pickWithBaseDirectory(baseDirectory: string, value: string) {
    if (quickPick) {
      const selectedBaseDirectory = quickPick.items.find((item) => item.label === baseDirectory)

      if (!selectedBaseDirectory) {
        throw new Error(`Could not find base directory to select '${baseDirectory}'.`)
      }

      quickPick.selectedItems = [selectedBaseDirectory]
      quickPickAcceptEventEmitter?.fire()

      quickPick.value = value
      quickPickAcceptEventEmitter?.fire()

      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  async function triggerExtension(waitForPathPicker = true) {
    await commands.executeCommand('new.pick')

    if (waitForPathPicker) {
      while (!isPathPickerAvailable() || quickPick?.busy) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
  }

  await run({
    isPathPickerAvailable,
    pathPickerBaseDirectoriesEqual,
    pickWithBaseDirectory,
    triggerExtension,
  })

  await commands.executeCommand('workbench.action.closeAllEditors')

  createQuickPickStub.restore()
}

export async function emptyWorkspaceFolder(workspaceFolderPath: string) {
  const fileOrFolders = await fs.promises.readdir(workspaceFolderPath)

  for (const fileOrFolder of fileOrFolders) {
    const fileOrFolderPath = path.join(workspaceFolderPath, fileOrFolder)
    const stats = await fs.promises.stat(fileOrFolderPath)

    await (stats.isDirectory()
      ? fs.promises.rm(fileOrFolderPath, { recursive: true })
      : fs.promises.unlink(fileOrFolderPath))
  }
}

export function getWorkspaceRelativePath(filePath: string, workspaceIndex = 0) {
  const workspaceFolder = workspace.workspaceFolders?.[workspaceIndex]?.uri.fsPath

  if (!workspaceFolder) {
    throw new Error('The workspace folder is not defined.')
  }

  return path.join(workspaceFolder, filePath)
}

export function expectNewFileOrFolder(relativeFileOrFolderPath: string, type: 'file' | 'folder', workspaceIndex = 0) {
  const fileOrFolderPath = getWorkspaceRelativePath(relativeFileOrFolderPath, workspaceIndex)

  if (!fs.existsSync(fileOrFolderPath)) {
    throw new Error(`New file or folder at '${fileOrFolderPath}' not found.`)
  }

  if (
    (type === 'file' && fs.statSync(fileOrFolderPath).isDirectory()) ||
    (type === 'folder' && fs.statSync(fileOrFolderPath).isFile())
  ) {
    throw new Error(`'${fileOrFolderPath}' is not a ${type}.`)
  }
}

interface WithExtensionHelpers {
  isPathPickerAvailable: () => boolean
  pathPickerBaseDirectoriesEqual: (baseDirectories: string[]) => boolean
  pickWithBaseDirectory: (baseDirectory: string, value: string) => Promise<void>
  triggerExtension: (waitForPathPicker?: boolean) => Promise<void>
}
