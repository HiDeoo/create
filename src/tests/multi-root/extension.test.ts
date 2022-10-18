import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { window, workspace } from 'vscode'

import { emptyWorkspaceFolder, expectNewFileOrFolder, getWorkspaceRelativePath, withExtension } from '../utils'

const workspaceFolderA = workspace.workspaceFolders?.[0]?.uri.fsPath
const workspaceFolderB = workspace.workspaceFolders?.[1]?.uri.fsPath
assert(workspaceFolderA && workspaceFolderB, 'A workspace folder is not defined.')

const fixturePath = path.join(__dirname, '../../../fixtures')
const fixturePathA = path.join(fixturePath, '/folder-1')
const fixturePathB = path.join(fixturePath, '/folder-2')

beforeEach(async () => {
  await fs.cp(fixturePathA, workspaceFolderA, { recursive: true })
  await fs.cp(fixturePathB, workspaceFolderB, { recursive: true })
})

afterEach(async () => {
  await emptyWorkspaceFolder(workspaceFolderA)
  await emptyWorkspaceFolder(workspaceFolderB)
})

describe('with a multi-root workspace', () => {
  describe('base directories', () => {
    describe('with no .gitignore', () => {
      it('should list ordered base directories with the workspace prefix', () =>
        withExtension(async ({ pathPickerBaseDirectoriesEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pathPickerBaseDirectoriesEqual([
              '/folder-1/random',
              '/folder-2/folder-2-1',
              '/folder-2/folder-2-2',
              '/folder-2/folder-2-2/folder-2-2-1',
              '/folder-2/folder-2-2/folder-2-2-2',
              '/folder-2/folder-2-2/random',
            ])
          ).to.be.true
        }))
    })

    describe('with a .gitignore', () => {
      const gitignorePath = path.join(__dirname, '../../../fixtures/folder-2', '.gitignore')

      before(async () => {
        await fs.writeFile(gitignorePath, 'folder-2-2-2')
      })

      after(async () => {
        await fs.rm(gitignorePath)
      })

      it('should list ordered base directories with the workspace prefix', () =>
        withExtension(async ({ pathPickerBaseDirectoriesEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pathPickerBaseDirectoriesEqual([
              '/folder-1/random',
              '/folder-2/folder-2-1',
              '/folder-2/folder-2-2',
              '/folder-2/folder-2-2/folder-2-2-1',
              '/folder-2/folder-2-2/random',
            ])
          ).to.be.true
        }))
    })
  })

  describe('new files and folders', () => {
    // TODO(HiDeoo) should create a file at both roots

    it('should create a file in the proper workspace folder', () =>
      withExtension(async ({ pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const value = 'new-file'

        await pickWithBaseDirectory('/folder-2/folder-2-1', value)

        expectNewFileOrFolder(path.join('/folder-2-1', value), 'file', 1)
      }))

    it('should create a file and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const value = 'folder-2-1-1/folder-2-1-1-1/new-file'

        await pickWithBaseDirectory('/folder-2/folder-2-1', value)

        expectNewFileOrFolder(path.join('/folder-2-1', value), 'file', 1)
      }))

    it('should open a new file', () =>
      withExtension(async ({ pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const value = 'new-file'

        await pickWithBaseDirectory('/folder-2/folder-2-1', value)

        expect(window.activeTextEditor?.document.uri.fsPath).to.equal(
          getWorkspaceRelativePath(path.join('/folder-2-1', value), 1)
        )
      }))

    it('should create a folder in the proper workspace folder', () =>
      withExtension(async ({ pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const value = 'folder-2-1-1/'

        await pickWithBaseDirectory('/folder-2/folder-2-1', value)

        expectNewFileOrFolder(path.join('/folder-2-1', value), 'folder', 1)
      }))

    it('should create a folder and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const value = 'folder-2-1-1/folder-2-1-1-1/'

        await pickWithBaseDirectory('/folder-2/folder-2-1', value)

        expectNewFileOrFolder(path.join('/folder-2-1', value), 'folder', 1)
      }))

    it('should not open a new folder', () =>
      withExtension(async ({ pickWithBaseDirectory, triggerExtension }) => {
        await triggerExtension()

        const value = 'folder-2-1-1/'

        await pickWithBaseDirectory('/folder-2/folder-2-1', value)

        expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
      }))
  })
})
