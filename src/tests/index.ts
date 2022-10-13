import fs from 'node:fs'
import path from 'node:path'

import { runTests } from '@vscode/test-electron'
import glob from 'fast-glob'

async function runTestsWithFixtures(extensionDevelopmentPath: string, suite: string) {
  const extensionTestsPath = path.resolve(__dirname, suite)
  const fixtureTestsPath = path.join(extensionTestsPath, '../../../fixtures', suite)

  if (!fs.existsSync(fixtureTestsPath)) {
    throw new Error(`Could not find fixtures for test suite '${suite}'.`)
  }

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: suite !== 'no-workspace' ? [fixtureTestsPath, '--disable-extensions'] : ['--disable-extensions'],
    })
  } catch (error) {
    console.error(`Failed to run tests with fixtures for suite '${suite}': ${error}.`)

    throw error
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
