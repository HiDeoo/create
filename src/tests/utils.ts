import glob from 'fast-glob'
import Mocha from 'mocha'
import { stub } from 'sinon'
import { type QuickPick, type QuickPickItem, window } from 'vscode'

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

export async function withQuikPick(run: (getQuickPick: () => QuickPick<QuickPickItem>) => Promise<void>) {
  let quickPick: QuickPick<QuickPickItem> | undefined

  const createQuickPickStub = stub(window, 'createQuickPick').callsFake(() => {
    quickPick = createQuickPickStub.wrappedMethod()

    return quickPick
  })

  function getQuickPick() {
    if (!quickPick) {
      throw new Error('QuickPick not found.')
    }

    return quickPick
  }

  await run(getQuickPick)

  createQuickPickStub.restore()
}
