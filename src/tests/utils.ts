import fs from 'node:fs'
import path from 'node:path'

import glob from 'fast-glob'
import Mocha from 'mocha'
import { stub } from 'sinon'
import { type QuickPick, type QuickPickItem, window, commands, EventEmitter, workspace } from 'vscode'

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
    return (
      expectedBaseDirectories.every((expectedBaseDirectory, index) => {
        const baseDirectory = quickPick?.items[index]
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

      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  async function triggerExtension(waitForPathPicker = true) {
    await commands.executeCommand('new.pick')

    if (waitForPathPicker) {
      while (!isPathPickerAvailable() || quickPick?.busy) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  await run({
    expectNewFile,
    isPathPickerAvailable,
    pathPickerBaseDirectoriesEqual,
    pickWithBaseDirectory,
    triggerExtension,
  })

  createQuickPickStub.restore()
}

function expectNewFile(newFilePath: string) {
  const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath

  if (!workspaceFolder) {
    throw new Error('The workspace folder is not defined.')
  }

  const fixturePath = path.join(workspaceFolder, newFilePath)

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`New file at '${fixturePath}' not found.`)
  }

  if (fs.statSync(fixturePath).isDirectory()) {
    throw new Error(`'${fixturePath}' is a directory, expected a file.`)
  }
}

interface WithExtensionHelpers {
  expectNewFile: (newFilePath: string) => void
  isPathPickerAvailable: () => boolean
  pathPickerBaseDirectoriesEqual: (baseDirectories: string[]) => boolean
  pickWithBaseDirectory: (baseDirectory: string, value: string) => Promise<void>
  triggerExtension: (waitForPathPicker?: boolean) => Promise<void>
}
