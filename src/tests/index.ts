import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { runTests } from '@vscode/test-electron'
import glob from 'fast-glob'

async function runTestsWithFixtures(extensionDevelopmentPath: string, suite: string) {
  const extensionTestsPath = path.resolve(__dirname, suite)

  const launchArgs = ['--disable-extensions']

  let testDirectory: string | undefined

  if (suite !== 'no-workspace') {
    testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `new-${suite}-`))

    launchArgs.unshift(testDirectory)
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

    const testSuites = await glob('*', { cwd: __dirname, onlyDirectories: true })

    for (const testSuite of testSuites) {
      await runTestsWithFixtures(extensionDevelopmentPath, testSuite)
    }
  } catch (error) {
    console.error('Failed to run tests:', error)

    process.exit(1)
  }
}

run()
