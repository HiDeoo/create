import fs from 'node:fs'
import path from 'node:path'

import glob from 'fast-glob'
import Mocha from 'mocha'
import { stub } from 'sinon'
import invariant from 'tiny-invariant'
import {
  commands,
  EventEmitter,
  type InputBox,
  type QuickPick,
  type QuickPickItem,
  QuickPickItemKind,
  window,
  workspace,
  type WorkspaceFolder,
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
  let picker: QuickPick<QuickPickItem> | undefined
  let input: InputBox | undefined
  let pickerAcceptEventEmitter: EventEmitter<void> | undefined
  let inputAcceptEventEmitter: EventEmitter<void> | undefined

  const createQuickPickStub = stub(window, 'createQuickPick').callsFake(() => {
    picker = createQuickPickStub.wrappedMethod()

    pickerAcceptEventEmitter = new EventEmitter<void>()
    stub(picker, 'onDidAccept').callsFake(pickerAcceptEventEmitter.event)

    return picker
  })

  const createInputBoxStub = stub(window, 'createInputBox').callsFake(() => {
    input = createInputBoxStub.wrappedMethod()

    inputAcceptEventEmitter = new EventEmitter<void>()
    stub(input, 'onDidAccept').callsFake(inputAcceptEventEmitter.event)

    return input
  })

  function isPickerAvailable() {
    return typeof picker !== 'undefined'
  }

  // --- represents a PathPickerMenuSeparatorItem
  function pickerMenuItemsEqual(expectedMenuItems: (string | { label: string; description: string })[]) {
    return (
      (expectedMenuItems.length === picker?.items.length &&
        expectedMenuItems.every((expectedMenuItem, index) => {
          const pickerMenuItem = picker?.items[index]
          const isEqual =
            expectedMenuItem === '---'
              ? pickerMenuItem?.kind === QuickPickItemKind.Separator
              : typeof expectedMenuItem === 'string'
              ? expectedMenuItem === pickerMenuItem?.label
              : expectedMenuItem.label === pickerMenuItem?.label &&
                expectedMenuItem.description === pickerMenuItem?.description

          if (!isEqual) {
            console.error(`Path picker menu item '${pickerMenuItem?.label}' does not equal '${expectedMenuItem}'.`)
          }

          return isEqual
        })) ??
      false
    )
  }

  async function pickWithMenuItem(menuItem: string, inputValue: string) {
    if (picker) {
      const selectedMenuItem = picker.items.find((item) => item.label === menuItem)

      invariant(selectedMenuItem, `Could not find menu item to select '${menuItem}'.`)

      picker.selectedItems = [selectedMenuItem]
      pickerAcceptEventEmitter?.fire()

      if (input) {
        input.value = inputValue
        inputAcceptEventEmitter?.fire()
      }
    }
  }

  async function triggerExtension(waitForPathPicker = true) {
    await commands.executeCommand('new.pick')

    if (waitForPathPicker) {
      while (!isPickerAvailable() || picker?.busy) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
  }

  await commands.executeCommand('workbench.action.closeAllEditors')

  await run({
    isPickerAvailable,
    pickerMenuItemsEqual,
    pickWithMenuItem,
    triggerExtension,
  })

  await commands.executeCommand('workbench.action.closeAllEditors')

  createQuickPickStub.restore()
  createInputBoxStub.restore()
}

export async function emptyWorkspaceFolder(workspaceFolder: WorkspaceFolder) {
  const fileOrFolders = await fs.promises.readdir(workspaceFolder.uri.fsPath)

  for (const fileOrFolder of fileOrFolders) {
    const fileOrFolderPath = path.join(workspaceFolder.uri.fsPath, fileOrFolder)
    const stats = await fs.promises.stat(fileOrFolderPath)

    await (stats.isDirectory()
      ? fs.promises.rm(fileOrFolderPath, { recursive: true })
      : fs.promises.unlink(fileOrFolderPath))
  }
}

export async function expectNewFileOrFolder(
  relativeFileOrFolderPath: string,
  type: 'file' | 'folder',
  workspaceFolder = workspace.workspaceFolders?.[0]
) {
  const fileOrFolderPath = getWorkspaceRelativePath(relativeFileOrFolderPath, workspaceFolder)

  while (!fs.existsSync(fileOrFolderPath)) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  invariant(
    (type === 'file' && fs.statSync(fileOrFolderPath).isFile()) ||
      (type === 'folder' && fs.statSync(fileOrFolderPath).isDirectory()),
    `'${fileOrFolderPath}' is not a ${type}.`
  )
}

export async function expectOpenedFile(relativeFilePath: string, workspaceFolder = workspace.workspaceFolders?.[0]) {
  const filePath = getWorkspaceRelativePath(relativeFilePath, workspaceFolder)

  while (!workspace.textDocuments.some((document) => document.fileName === filePath)) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

export function waitForTimeout(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

function getWorkspaceRelativePath(filePath: string, workspaceFolder = workspace.workspaceFolders?.[0]) {
  invariant(workspaceFolder, 'The workspace folder does not exist.')

  return path.join(workspaceFolder.uri.fsPath, filePath)
}

interface WithExtensionHelpers {
  isPickerAvailable: () => boolean
  pickerMenuItemsEqual: (expectedMenuItems: (string | { label: string; description: string })[]) => boolean
  pickWithMenuItem: (menuItem: string, inputValue: string) => void
  triggerExtension: (waitForPathPicker?: boolean) => Promise<void>
}
