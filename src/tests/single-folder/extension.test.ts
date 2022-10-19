import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { stripIndents } from 'common-tags'
import { window, workspace } from 'vscode'

import { openFile } from '../../libs/vsc'
import { emptyWorkspaceFolder, expectNewFileOrFolder, expectOpenedFile, waitForTimeout, withExtension } from '../utils'

const workspaceFolder = workspace.workspaceFolders?.[0]
assert(workspaceFolder, 'The workspace folder is not defined.')

const fixturePath = path.join(__dirname, '../../../fixtures')

beforeEach(async () => {
  await fs.cp(fixturePath, workspaceFolder.uri.fsPath, { recursive: true })
})

afterEach(async () => {
  await emptyWorkspaceFolder(workspaceFolder)
})

describe('with a single-folder workspace', () => {
  describe('path picker menu items', () => {
    describe('with no .gitignore', () => {
      it('should list ordered folders', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/', description: 'workspace root' },
              '---',
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

      it('should list ordered folders with the active folder shortcut', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await openFile(path.join(workspaceFolder.uri.fsPath, '/folder-2/folder-2-2/file-2-2-1'))

          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/', description: 'workspace root' },
              { label: '/folder-2/folder-2-2', description: 'active folder' },
              '---',
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

      it('should list ordered folders without the active folder shortcut if the current document is at the root', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await openFile(path.join(workspaceFolder.uri.fsPath, 'file'))

          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/', description: 'workspace root' },
              '---',
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

      it('should list ordered folders', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
          await triggerExtension()

          expect(
            pickerMenuItemsEqual([
              { label: '/', description: 'workspace root' },
              '---',
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
    it('should create a file at the workspace root', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/'
        const inputValue = 'new-file'

        pickWithMenuItem(menuItem, inputValue)

        await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
      }))

    it('should create a file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'new-file'

        pickWithMenuItem(menuItem, inputValue)

        await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
      }))

    it('should create a file and missing parent folders', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-2/folder-2-2/folder-2-2-1'
        const inputValue = 'folder-2-2-1-1/folder-2-2-1-1-1/new-file'

        pickWithMenuItem(menuItem, inputValue)

        await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
      }))

    it('should open a new file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'new-file'

        pickWithMenuItem(menuItem, inputValue)

        await expectOpenedFile(path.join(menuItem, inputValue))
      }))

    it('should open an existing file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-3'
        const inputValue = '.file-3-1'

        pickWithMenuItem(menuItem, inputValue)

        await expectOpenedFile(path.join(menuItem, inputValue))
      }))

    it('should create a folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'folder-1-1/'

        pickWithMenuItem(menuItem, inputValue)

        await expectNewFileOrFolder(path.join(menuItem, inputValue), 'folder')
      }))

    it('should create a folder and missing parent folders', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-2/folder-2-2/folder-2-2-1'
        const inputValue = 'folder-2-2-1-1/folder-2-2-1-1-1/'

        pickWithMenuItem(menuItem, inputValue)

        await expectNewFileOrFolder(path.join(menuItem, inputValue), 'folder')
      }))

    it('should not open a new folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'folder-1-1/'

        pickWithMenuItem(menuItem, inputValue)

        await waitForTimeout(100)

        expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
      }))

    describe('expansions', () => {
      it('should create a file with with no expansion but similar syntax', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const menuItem = '/folder-1'
          const inputValue = 'new-file-{1.ext'

          pickWithMenuItem(menuItem, inputValue)

          await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
        }))

      it('should create multiple files with a list expansion', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const menuItem = '/folder-1'

          pickWithMenuItem(menuItem, 'new-file-{1,2,3}.ext')

          await expectNewFileOrFolder(path.join(menuItem, 'new-file-1.ext'), 'file')
          await expectNewFileOrFolder(path.join(menuItem, 'new-file-2.ext'), 'file')
          await expectNewFileOrFolder(path.join(menuItem, 'new-file-3.ext'), 'file')
        }))

      it('should create multiple files with a sequence expansion', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const menuItem = '/folder-1'

          pickWithMenuItem(menuItem, 'folder-1-1/new-file-{1..3}.ext')

          await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-file-1.ext'), 'file')
          await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-file-2.ext'), 'file')
          await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-file-3.ext'), 'file')
        }))

      it('should create multiple files with an expansion even if some already exists', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const menuItem = '/folder-3'

          pickWithMenuItem(menuItem, '.file-3-{1..3}')

          await expectNewFileOrFolder(path.join(menuItem, '.file-3-1'), 'file')
          await expectNewFileOrFolder(path.join(menuItem, '.file-3-2'), 'file')
          await expectNewFileOrFolder(path.join(menuItem, '.file-3-3'), 'file')
        }))

      it('should open multiple files with expansions', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const menuItem = '/folder-1'

          pickWithMenuItem(menuItem, 'new-file-{1..2}.{ext1,ext2}')

          await expectOpenedFile(path.join(menuItem, 'new-file-1.ext1'))
          await expectOpenedFile(path.join(menuItem, 'new-file-1.ext2'))
          await expectOpenedFile(path.join(menuItem, 'new-file-2.ext1'))
          await expectOpenedFile(path.join(menuItem, 'new-file-2.ext2'))
        }))

      it('should create multiple folders with an expansion', () =>
        withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
          await triggerExtension()

          const menuItem = '/folder-1'

          pickWithMenuItem(menuItem, 'folder-1-1/new-folder-{1..3}/')

          await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-folder-1'), 'folder')
          await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-folder-2'), 'folder')
          await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-folder-3'), 'folder')
        }))
    })
  })
})
