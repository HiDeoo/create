import glob from 'fast-glob'
import Mocha from 'mocha'
import { stub } from 'sinon'
import { type QuickPick, type QuickPickItem, window, commands } from 'vscode'

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

  const createQuickPickStub = stub(window, 'createQuickPick').callsFake(() => {
    quickPick = createQuickPickStub.wrappedMethod()

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

  async function triggerExtension(waitForPathPicker = true) {
    await commands.executeCommand('new.pick')

    if (waitForPathPicker) {
      while (!isPathPickerAvailable() || quickPick?.busy) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  await run({ isPathPickerAvailable, pathPickerBaseDirectoriesEqual, triggerExtension })

  createQuickPickStub.restore()
}

interface WithExtensionHelpers {
  isPathPickerAvailable: () => boolean
  pathPickerBaseDirectoriesEqual: (baseDirectories: string[]) => boolean
  triggerExtension: (waitForPathPicker?: boolean) => Promise<void>
}
