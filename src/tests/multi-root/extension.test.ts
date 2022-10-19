import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { window, workspace } from 'vscode'

import { openFile } from '../../libs/vsc'
import { emptyWorkspaceFolder, expectNewFileOrFolder, expectOpenedFile, waitForTimeout, withExtension } from '../utils'

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

      it('should list ordered folders with the active folder shortcut in the proper workspace', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await openFile(path.join(workspaceFolderB.uri.fsPath, '/folder-2-2/file-2-2-1'))

          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/folder-1', description: 'workspace root' },
              { label: '/folder-2', description: 'workspace root' },
              { label: '/folder-2/folder-2-2', description: 'active folder' },
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

      it('should list ordered folders without the active folder shortcut if the current document is at the root of the proper workspace', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await openFile(path.join(workspaceFolderA.uri.fsPath, 'file-1'))

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

        pickWithMenuItem('/folder-1', inputValue)

        await expectNewFileOrFolder(inputValue, 'file', workspaceFolderA)
      }))

    it('should create a file at the root of the second workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        pickWithMenuItem('/folder-2', inputValue)

        await expectNewFileOrFolder(inputValue, 'file', workspaceFolderB)
      }))

    it('should create a file in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'file', workspaceFolderB)
      }))

    it('should create a file and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/folder-2-1-1-1/new-file'

        pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'file', workspaceFolderB)
      }))

    it('should open a new file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'new-file'

        pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        await expectOpenedFile(path.join('/folder-2-1', inputValue), workspaceFolderB)
      }))

    it('should open an existing file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'file-2-2-1'

        pickWithMenuItem('/folder-2/folder-2-2', inputValue)

        await expectOpenedFile(path.join('/folder-2-2', inputValue), workspaceFolderB)
      }))

    it('should create a folder in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/'

        pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'folder', workspaceFolderB)
      }))

    it('should create a folder and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/folder-2-1-1-1/'

        pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'folder', workspaceFolderB)
      }))

    it('should not open a new folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const inputValue = 'folder-2-1-1/'

        pickWithMenuItem('/folder-2/folder-2-1', inputValue)

        await waitForTimeout(100)

        expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
      }))

    describe('expansions', () => {
      it('should create a file with with no expansion but similar syntax in the proper workspace', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const inputValue = 'new-file-{1.ext'

          pickWithMenuItem('/folder-1', inputValue)

          await expectNewFileOrFolder(inputValue, 'file', workspaceFolderA)
        }))

      it('should create multiple files in the first workspace with a list expansion', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          pickWithMenuItem('/folder-1', 'new-file-{1,2,3}.ext')

          await expectNewFileOrFolder('new-file-1.ext', 'file', workspaceFolderA)
          await expectNewFileOrFolder('new-file-2.ext', 'file', workspaceFolderA)
          await expectNewFileOrFolder('new-file-3.ext', 'file', workspaceFolderA)
        }))

      it('should create multiple files in the first workspace with a sequence expansion', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          pickWithMenuItem('/folder-2/folder-2-1', 'folder-2-1-1/new-file-{1..3}.ext')

          await expectNewFileOrFolder('folder-2-1/folder-2-1-1/new-file-1.ext', 'file', workspaceFolderB)
          await expectNewFileOrFolder('folder-2-1/folder-2-1-1/new-file-2.ext', 'file', workspaceFolderB)
          await expectNewFileOrFolder('folder-2-1/folder-2-1-1/new-file-3.ext', 'file', workspaceFolderB)
        }))

      it('should create multiple folders with an expansion even if some already exists in the proper workspace', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          pickWithMenuItem('/folder-2/folder-2-2', 'folder-2-2-{1..3}/')

          await expectNewFileOrFolder(path.join('/folder-2-2', 'folder-2-2-1'), 'folder', workspaceFolderB)
          await expectNewFileOrFolder(path.join('/folder-2-2', 'folder-2-2-2'), 'folder', workspaceFolderB)
          await expectNewFileOrFolder(path.join('/folder-2-2', 'folder-2-2-3'), 'folder', workspaceFolderB)
        }))

      it('should open multiple files with expansions in the proper workspace', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          pickWithMenuItem('/folder-2/folder-2-1', 'new-file-{1..2}.{ext1,ext2}')

          await expectOpenedFile(path.join('/folder-2-1', 'new-file-1.ext1'), workspaceFolderB)
          await expectOpenedFile(path.join('/folder-2-1', 'new-file-1.ext2'), workspaceFolderB)
          await expectOpenedFile(path.join('/folder-2-1', 'new-file-2.ext1'), workspaceFolderB)
          await expectOpenedFile(path.join('/folder-2-1', 'new-file-2.ext2'), workspaceFolderB)
        }))

      it('should create multiple folders with an expansion in the proper workspace', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          pickWithMenuItem('/folder-2/folder-2-1', 'folder-2-1-1/new-folder-{1..3}/')

          await expectNewFileOrFolder(path.join('/folder-2-1', 'folder-2-1-1/new-folder-1'), 'folder', workspaceFolderB)
          await expectNewFileOrFolder(path.join('/folder-2-1', 'folder-2-1-1/new-folder-2'), 'folder', workspaceFolderB)
          await expectNewFileOrFolder(path.join('/folder-2-1', 'folder-2-1-1/new-folder-3'), 'folder', workspaceFolderB)
        }))
    })
  })
})
