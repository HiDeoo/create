import fs from 'node:fs'
import path from 'node:path'

import glob from 'fast-glob'
import Mocha from 'mocha'
import { stub } from 'sinon'
import invariant from 'tiny-invariant'
import {
  commands,
  EventEmitter,
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
  let pickerAcceptEventEmitter: EventEmitter<void> | undefined

  const createQuickPickStub = stub(window, 'createQuickPick').callsFake(() => {
    picker = createQuickPickStub.wrappedMethod()

    pickerAcceptEventEmitter = new EventEmitter<void>()
    stub(picker, 'onDidAccept').callsFake(pickerAcceptEventEmitter.event)

    return picker
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

      picker.value = inputValue
      pickerAcceptEventEmitter?.fire()

      await new Promise((resolve) => setTimeout(resolve, 100))
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

export function getWorkspaceRelativePath(filePath: string, workspaceFolder = workspace.workspaceFolders?.[0]) {
  invariant(workspaceFolder, 'The workspace folder does not exist.')

  return path.join(workspaceFolder.uri.fsPath, filePath)
}

export function expectNewFileOrFolder(
  relativeFileOrFolderPath: string,
  type: 'file' | 'folder',
  workspaceFolder = workspace.workspaceFolders?.[0]
) {
  const fileOrFolderPath = getWorkspaceRelativePath(relativeFileOrFolderPath, workspaceFolder)

  invariant(fs.existsSync(fileOrFolderPath), `New file or folder at '${fileOrFolderPath}' not found.`)
  invariant(
    (type === 'file' && fs.statSync(fileOrFolderPath).isFile()) ||
      (type === 'folder' && fs.statSync(fileOrFolderPath).isDirectory()),
    `'${fileOrFolderPath}' is not a ${type}.`
  )
}

interface WithExtensionHelpers {
  isPickerAvailable: () => boolean
  pickerMenuItemsEqual: (expectedMenuItems: (string | { label: string; description: string })[]) => boolean
  pickWithMenuItem: (menuItem: string, inputValue: string) => Promise<void>
  triggerExtension: (waitForPathPicker?: boolean) => Promise<void>
}
