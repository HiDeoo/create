import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { runTests } from '@vscode/test-electron'
// import glob from 'fast-glob'

async function runTestsWithFixtures(extensionDevelopmentPath: string, suite: string) {
  const extensionTestsPath = path.resolve(__dirname, suite)

  const launchArgs = ['--disable-extensions']

  let testDirectory: string | undefined

  if (suite !== 'no-folder') {
    testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `new-${suite}-`))

    if (suite === 'single-folder' || suite === 'empty-folder') {
      // Test a workspace with a single (empty or not) folder.
      launchArgs.unshift(testDirectory)
    } else if (suite === 'multi-root') {
      // Test a workspace with multiple folders.
      const codeWorkspacePath = path.join(testDirectory, 'test.code-workspace')

      await fs.writeFile(
        codeWorkspacePath,
        JSON.stringify({
          folders: [{ path: path.join(testDirectory, 'folder-1') }, { path: path.join(testDirectory, 'folder-2') }],
        })
      )

      launchArgs.unshift(codeWorkspacePath)
    }
  }

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
    })
  } catch (error) {
    console.error(`Failed to run tests with fixtures for suite '${suite}': ${error}.`)

    throw error
  } finally {
    if (testDirectory) {
      await fs.rm(testDirectory, { recursive: true })
    }
  }
}

async function run() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../..')

    // FIXME(HiDeoo)
    const testSuites = ['single-folder']
    // const testSuites = await glob('*', { cwd: __dirname, onlyDirectories: true })

    for (const testSuite of testSuites) {
      await runTestsWithFixtures(extensionDevelopmentPath, testSuite)
    }
  } catch (error) {
    console.error('Failed to run tests:', error)

    process.exit(1)
  }
}

run()
