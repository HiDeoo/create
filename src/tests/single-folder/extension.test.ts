import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { stripIndents } from 'common-tags'
import { workspace } from 'vscode'

import { withExtension } from '../utils'

const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath
assert(workspaceFolder, 'The workspace folder is not defined.')

const fixturePath = path.join(__dirname, '../../../fixtures')

beforeEach(async () => {
  await fs.cp(fixturePath, workspaceFolder, { recursive: true })
})

afterEach(async () => {
  await fs.rm(workspaceFolder, { recursive: true })
  await fs.mkdir(workspaceFolder, { recursive: true })
})

describe('with a single-folder workspace', () => {
  describe('base directories', () => {
    describe('with no .gitignore', () => {
      it('should list ordered base directories', () =>
        withExtension(async ({ pathPickerBaseDirectoriesEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pathPickerBaseDirectoriesEqual([
              '/.github',
              '/folder-1',
              '/folder-1/random',
              '/folder-2',
              '/folder-2/folder-2-1',
              '/folder-2/folder-2-2',
              '/folder-2/folder-2-2/folder-2-2-1',
              '/folder-2/folder-2-2/folder-2-2-2',
              '/folder-2/folder-2-2/random',
              '/folder-3',
            ])
          ).to.be.true
        }))
    })

    describe('with a .gitignore', () => {
      const gitignorePath = path.join(__dirname, '../../../fixtures', '.gitignore')

      before(async () => {
        await fs.writeFile(
          gitignorePath,
          stripIndents`folder-1
          # a comment
          .file-3-1
          random
          /folder-2/folder-2-2/folder-2-2-2
        `
        )
      })

      after(async () => {
        await fs.rm(gitignorePath)
      })

      it('should list ordered base directories', () =>
        withExtension(async ({ pathPickerBaseDirectoriesEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pathPickerBaseDirectoriesEqual([
              '/.github',
              '/folder-2',
              '/folder-2/folder-2-1',
              '/folder-2/folder-2-2',
              '/folder-2/folder-2-2/folder-2-2-1',
              '/folder-3',
            ])
          ).to.be.true
        }))
    })
  })

  describe('new files and folders', () => {
    // TODO(HiDeoo) should create a file at the root

    it('should create a file', () =>
      withExtension(async ({ expectNewFile, pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const baseDirectory = '/folder-1'
        const value = 'new-file'

        await pickWithBaseDirectory(baseDirectory, value)

        expectNewFile(path.join(baseDirectory, value))
      }))

    it('should create a file and necessary folders', () =>
      withExtension(async ({ expectNewFile, pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const baseDirectory = '/folder-2/folder-2-2/folder-2-2-1'
        const value = 'folder-2-2-1-1/folder-2-2-1-1-1/new-file'

        await pickWithBaseDirectory(baseDirectory, value)

        expectNewFile(path.join(baseDirectory, value))
      }))
  })
})
