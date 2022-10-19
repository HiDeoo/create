import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { window, workspace } from 'vscode'

import { emptyWorkspaceFolder, expectNewFileOrFolder, getWorkspaceRelativePath, withExtension } from '../utils'

const workspaceFolderA = workspace.workspaceFolders?.[0]
const workspaceFolderB = workspace.workspaceFolders?.[1]
assert(workspaceFolderA && workspaceFolderB, 'A workspace folder does not exist.')

const fixturePath = path.join(__dirname, '../../../fixtures')
const fixturePathA = path.join(fixturePath, '/folder-1')
const fixturePathB = path.join(fixturePath, '/folder-2')

beforeEach(async () => {
  await fs.cp(fixturePathA, workspaceFolderA.uri.fsPath, { recursive: true })
  await fs.cp(fixturePathB, workspaceFolderB.uri.fsPath, { recursive: true })
})

afterEach(async () => {
  await emptyWorkspaceFolder(workspaceFolderA)
  await emptyWorkspaceFolder(workspaceFolderB)
})

describe('with a multi-root workspace', () => {
  describe('path picker menu items', () => {
    describe('with no .gitignore', () => {
      it('should list ordered folders with the workspace prefix', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/folder-1', description: 'workspace root' },
              { label: '/folder-2', description: 'workspace root' },
              '---',
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

      it('should list ordered folders with the workspace prefix', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/folder-1', description: 'workspace root' },
              { label: '/folder-2', description: 'workspace root' },
              '---',
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
    it('should create a file at the root of the first workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        await pickWithMenuItem('/folder-1', inputValue)

        expectNewFileOrFolder(inputValue, 'file', workspaceFolderA)
      }))

    it('should create a file at the root of the second workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        await pickWithMenuItem('/folder-2', inputValue)

        expectNewFileOrFolder(inputValue, 'file', workspaceFolderB)
      }))

    it('should create a file in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        await pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'file', workspaceFolderB)
      }))

    it('should create a file and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/folder-2-1-1-1/new-file'

        await pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'file', workspaceFolderB)
      }))

    it('should open a new file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        await pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        expect(window.activeTextEditor?.document.uri.fsPath).to.equal(
          getWorkspaceRelativePath(path.join('/folder-2-1', inputValue), workspaceFolderB)
        )
      }))

    it('should create a folder in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/'

        await pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'folder', workspaceFolderB)
      }))

    it('should create a folder and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/folder-2-1-1-1/'

        await pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'folder', workspaceFolderB)
      }))

    it('should not open a new folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/'

        await pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
      }))
  })
})
