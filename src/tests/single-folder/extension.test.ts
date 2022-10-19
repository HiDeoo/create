import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { stripIndents } from 'common-tags'
import { window, workspace } from 'vscode'

import { emptyWorkspaceFolder, expectNewFileOrFolder, getWorkspaceRelativePath, withExtension } from '../utils'

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

        await pickWithMenuItem(menuItem, inputValue)

        expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
      }))

    it('should create a file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'new-file'

        await pickWithMenuItem(menuItem, inputValue)

        expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
      }))

    it('should create a file and missing parent folders', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-2/folder-2-2/folder-2-2-1'
        const inputValue = 'folder-2-2-1-1/folder-2-2-1-1-1/new-file'

        await pickWithMenuItem(menuItem, inputValue)

        expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
      }))

    it('should open a new file', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'new-file'

        await pickWithMenuItem(menuItem, inputValue)

        expect(window.activeTextEditor?.document.uri.fsPath).to.equal(
          getWorkspaceRelativePath(path.join(menuItem, inputValue))
        )
      }))

    it('should create a folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'folder-1-1/'

        await pickWithMenuItem(menuItem, inputValue)

        expectNewFileOrFolder(path.join(menuItem, inputValue), 'folder')
      }))

    it('should create a folder and missing parent folders', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-2/folder-2-2/folder-2-2-1'
        const inputValue = 'folder-2-2-1-1/folder-2-2-1-1-1/'

        await pickWithMenuItem(menuItem, inputValue)

        expectNewFileOrFolder(path.join(menuItem, inputValue), 'folder')
      }))

    it('should not open a new folder', () =>
      withExtension(async ({ pickWithMenuItem, triggerExtension }) => {
        await triggerExtension()

        const menuItem = '/folder-1'
        const inputValue = 'folder-1-1/'

        await pickWithMenuItem(menuItem, inputValue)

        expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
      }))
  })
})
