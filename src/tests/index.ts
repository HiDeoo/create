import path from 'node:path'

import { runTests } from '@vscode/test-electron'

async function run() {
  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '../../'),
      extensionTestsPath: path.resolve(__dirname, './runner'),
      launchArgs: ['--disable-extensions'],
    })
  } catch (error) {
    console.error('Failed to run tests:', error)

    process.exit(1)
  }
}

run()
