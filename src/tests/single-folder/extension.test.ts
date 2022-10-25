import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { stripIndents } from 'common-tags'
import { commands, window, workspace } from 'vscode'

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
  describe('new.create', () => {
    describe('path picker fuzzy matching', () => {
      describe('with files.exclude', () => {
        it('should list ordered folders', () =>
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/', description: 'workspace root' },
                '---',
                '/.github',
                '/folder-1',
                '/folder-1/random',
                '/folder-1/random/random-nested',
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
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await openFile(path.join(workspaceFolder.uri.fsPath, '/folder-2/folder-2-2/file-2-2-1'))

            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/', description: 'workspace root' },
                { label: '/folder-2/folder-2-2', description: 'active folder' },
                '---',
                '/.github',
                '/folder-1',
                '/folder-1/random',
                '/folder-1/random/random-nested',
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
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await openFile(path.join(workspaceFolder.uri.fsPath, 'file'))

            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/', description: 'workspace root' },
                '---',
                '/.github',
                '/folder-1',
                '/folder-1/random',
                '/folder-1/random/random-nested',
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
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await triggerCreate()

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

      describe('new files and folders', () => {
        it('should create a file at the workspace root', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/'
            const inputValue = 'new-file'

            pickWithMenuItem(menuItem, inputValue)

            await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
          }))

        it('should create a file', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-1'
            const inputValue = 'new-file'

            pickWithMenuItem(menuItem, inputValue)

            await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
          }))

        it('should create a file and missing parent folders', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-2/folder-2-2/folder-2-2-1'
            const inputValue = 'folder-2-2-1-1/folder-2-2-1-1-1/new-file'

            pickWithMenuItem(menuItem, inputValue)

            await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
          }))

        it('should open a new file', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-1'
            const inputValue = 'new-file'

            pickWithMenuItem(menuItem, inputValue)

            await expectOpenedFile(path.join(menuItem, inputValue))
          }))

        it('should open an existing file', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-3'
            const inputValue = '.file-3-1'

            pickWithMenuItem(menuItem, inputValue)

            await expectOpenedFile(path.join(menuItem, inputValue))
          }))

        it('should create a folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-1'
            const inputValue = 'folder-1-1/'

            pickWithMenuItem(menuItem, inputValue)

            await expectNewFileOrFolder(path.join(menuItem, inputValue), 'folder')
          }))

        it('should create a folder and missing parent folders', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-2/folder-2-2/folder-2-2-1'
            const inputValue = 'folder-2-2-1-1/folder-2-2-1-1-1/'

            pickWithMenuItem(menuItem, inputValue)

            await expectNewFileOrFolder(path.join(menuItem, inputValue), 'folder')
          }))

        it('should not open a new folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const menuItem = '/folder-1'
            const inputValue = 'folder-1-1/'

            pickWithMenuItem(menuItem, inputValue)

            await waitForTimeout(100)

            expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
          }))

        describe('with expansions', () => {
          it('should create a file with with no expansion but similar syntax', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const menuItem = '/folder-1'
              const inputValue = 'new-file-{1.ext'

              pickWithMenuItem(menuItem, inputValue)

              await expectNewFileOrFolder(path.join(menuItem, inputValue), 'file')
            }))

          it('should create multiple files with a list expansion', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const menuItem = '/folder-1'

              pickWithMenuItem(menuItem, 'new-file-{1,2,3}.ext')

              await expectNewFileOrFolder(path.join(menuItem, 'new-file-1.ext'), 'file')
              await expectNewFileOrFolder(path.join(menuItem, 'new-file-2.ext'), 'file')
              await expectNewFileOrFolder(path.join(menuItem, 'new-file-3.ext'), 'file')
            }))

          it('should create multiple files with a sequence expansion', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const menuItem = '/folder-1'

              pickWithMenuItem(menuItem, 'folder-1-1/new-file-{1..3}.ext')

              await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-file-1.ext'), 'file')
              await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-file-2.ext'), 'file')
              await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-file-3.ext'), 'file')
            }))

          it('should create multiple files with an expansion even if some already exists', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const menuItem = '/folder-3'

              pickWithMenuItem(menuItem, '.file-3-{1..3}')

              await expectNewFileOrFolder(path.join(menuItem, '.file-3-1'), 'file')
              await expectNewFileOrFolder(path.join(menuItem, '.file-3-2'), 'file')
              await expectNewFileOrFolder(path.join(menuItem, '.file-3-3'), 'file')
            }))

          it('should open multiple files with expansions', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const menuItem = '/folder-1'

              pickWithMenuItem(menuItem, 'new-file-{1..2}.{ext1,ext2}')

              await expectOpenedFile(path.join(menuItem, 'new-file-1.ext1'))
              await expectOpenedFile(path.join(menuItem, 'new-file-1.ext2'))
              await expectOpenedFile(path.join(menuItem, 'new-file-2.ext1'))
              await expectOpenedFile(path.join(menuItem, 'new-file-2.ext2'))
            }))

          it('should create multiple folders with an expansion', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const menuItem = '/folder-1'

              pickWithMenuItem(menuItem, 'folder-1-1/new-folder-{1..3}/')

              await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-folder-1'), 'folder')
              await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-folder-2'), 'folder')
              await expectNewFileOrFolder(path.join(menuItem, 'folder-1-1/new-folder-3'), 'folder')
            }))
        })
      })
    })

    describe('path picker auto completion', () => {
      it('should do nothing when triggered with no matches', () =>
        withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          const inputValue = '/m'

          await setInputValue(inputValue)

          await triggerAutoCompletion()

          expect(pickerInputValueEqual(inputValue)).to.be.true
        }))

      it('should hide the picker menu when triggered', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await triggerAutoCompletion()

          expect(pickerMenuItemsEqual([])).to.be.true
        }))

      it('should loop through root directories if triggered with no input value', () =>
        withExtension(async ({ pickerInputValueEqual, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          for (const inputValue of ['/.github', '/folder-1', '/folder-2', '/folder-3', '/.github']) {
            await triggerAutoCompletion()

            expect(pickerInputValueEqual(inputValue)).to.be.true
          }
        }))

      it('should loop through root directories matching the input value', () =>
        withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await setInputValue('f')

          for (const inputValue of ['/folder-1', '/folder-2', '/folder-3']) {
            await triggerAutoCompletion()

            expect(pickerInputValueEqual(inputValue)).to.be.true
          }

          await setInputValue('/f')

          for (const inputValue of ['/folder-1', '/folder-2', '/folder-3']) {
            await triggerAutoCompletion()

            expect(pickerInputValueEqual(inputValue)).to.be.true
          }
        }))

      it('should ignore case when searching for matches', () =>
        withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await setInputValue('/F')

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/folder-1')).to.be.true
        }))

      it('should preserve the active menu item if any when triggered', () =>
        withExtension(async ({ pickerInputValueEqual, pickerMenuItemsEqual, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          expect(
            pickerMenuItemsEqual([
              { label: '/', description: 'workspace root' },
              '---',
              '/.github',
              '/folder-1',
              '/folder-1/random',
              '/folder-1/random/random-nested',
              '/folder-2',
              '/folder-2/folder-2-1',
              '/folder-2/folder-2-2',
              '/folder-2/folder-2-2/folder-2-2-1',
              '/folder-2/folder-2-2/folder-2-2-2',
              '/folder-2/folder-2-2/random',
              '/folder-3',
            ])
          ).to.be.true

          await commands.executeCommand('workbench.action.quickOpenSelectNext')
          await commands.executeCommand('workbench.action.quickOpenSelectNext')
          await commands.executeCommand('workbench.action.quickOpenSelectNext')

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/folder-1')).to.be.true
        }))

      it('should sanitize the input value not matching any folders if any when triggered', () =>
        withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await setInputValue('abc')

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/abc')).to.be.true
        }))

      it('should automatically accept a single result', () =>
        withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await setInputValue('f')

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/folder-1')).to.be.true

          await setInputValue('/folder-1/r')

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/folder-1/random/')).to.be.true

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/folder-1/random/random-nested/')).to.be.true
        }))

      describe('with files.exclude', () => {
        it('should respect the files.exclude setting', () =>
          withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
            await triggerCreate()

            await setInputValue('f')

            await triggerAutoCompletion()
            await triggerAutoCompletion()

            expect(pickerInputValueEqual('/folder-2')).to.be.true

            await setInputValue('/folder-2/f')

            await triggerAutoCompletion()
            await triggerAutoCompletion()

            expect(pickerInputValueEqual('/folder-2/folder-2-2')).to.be.true

            await setInputValue('/folder-2/folder-2-2/')

            // .svn is excluded.
            for (const inputValue of ['/folder-2-2-1', '/folder-2-2-2', '/random', '/folder-2-2-1']) {
              await triggerAutoCompletion()

              expect(pickerInputValueEqual(`/folder-2/folder-2-2${inputValue}`)).to.be.true
            }
          }))
      })

      describe('with a .gitignore', () => {
        const gitignorePath = path.join(__dirname, '../../../fixtures', '.gitignore')

        before(async () => {
          await fs.writeFile(
            gitignorePath,
            stripIndents`folder-1
            /folder-2/folder-2-2
          `
          )
        })

        after(async () => {
          await fs.rm(gitignorePath)
        })

        it('should respect a .gitignore file', () =>
          withExtension(async ({ pickerInputValueEqual, setInputValue, triggerAutoCompletion, triggerCreate }) => {
            await triggerCreate()

            await setInputValue('f')

            // folder-1 is gitignored.
            for (const inputValue of ['/folder-2', '/folder-3', '/folder-2']) {
              await triggerAutoCompletion()

              expect(pickerInputValueEqual(inputValue)).to.be.true
            }

            await setInputValue('/folder-2/f')

            await triggerAutoCompletion()

            // folder-2-2 is gitignored.
            expect(pickerInputValueEqual('/folder-2/folder-2-1/')).to.be.true
          }))
      })

      describe('new files and folders', () => {
        it('should create and open a file and missing parent folders', () =>
          withExtension(
            async ({
              pickerInputValueEqual,
              pickWithAutoCompletion,
              setInputValue,
              triggerAutoCompletion,
              triggerCreate,
            }) => {
              await triggerCreate()

              await setInputValue('f')

              await triggerAutoCompletion()
              await triggerAutoCompletion()

              expect(pickerInputValueEqual('/folder-2')).to.be.true

              await setInputValue('/folder-2/f')

              await triggerAutoCompletion()
              await triggerAutoCompletion()

              expect(pickerInputValueEqual('/folder-2/folder-2-2')).to.be.true

              const inputValue = '/folder-2/folder-2-2/folder-2-2-3/folder-2-2-3-1/new-file'

              await pickWithAutoCompletion(inputValue)

              await expectNewFileOrFolder(inputValue, 'file')
              await expectOpenedFile(inputValue)
            }
          ))

        it('should create a folder and missing parent folders', () =>
          withExtension(
            async ({
              pickerInputValueEqual,
              pickWithAutoCompletion,
              setInputValue,
              triggerAutoCompletion,
              triggerCreate,
            }) => {
              await triggerCreate()

              await setInputValue('f')

              await triggerAutoCompletion()
              await triggerAutoCompletion()
              await triggerAutoCompletion()

              expect(pickerInputValueEqual('/folder-3')).to.be.true

              const inputValue = '/folder-3/folder-3-1/folder-3-2/'

              await pickWithAutoCompletion(inputValue)

              await expectNewFileOrFolder(inputValue, 'folder')
            }
          ))

        it('should create files and folders with expansions', () =>
          withExtension(
            async ({
              pickerInputValueEqual,
              pickWithAutoCompletion,
              setInputValue,
              triggerAutoCompletion,
              triggerCreate,
            }) => {
              await triggerCreate()

              await setInputValue('f')

              await triggerAutoCompletion()
              await triggerAutoCompletion()

              expect(pickerInputValueEqual('/folder-2')).to.be.true

              await setInputValue('/folder-2/f')

              await triggerAutoCompletion()
              await triggerAutoCompletion()

              expect(pickerInputValueEqual('/folder-2/folder-2-2')).to.be.true

              const autoCompletionPrefix = '/folder-2/folder-2-3/folder-2-3-1'

              await pickWithAutoCompletion(`${autoCompletionPrefix}/new-file-{1..3}.ext`)

              await expectNewFileOrFolder(path.join(autoCompletionPrefix, 'new-file-1.ext'), 'file')
              await expectNewFileOrFolder(path.join(autoCompletionPrefix, 'new-file-2.ext'), 'file')
              await expectNewFileOrFolder(path.join(autoCompletionPrefix, 'new-file-3.ext'), 'file')
            }
          ))
      })
    })
  })

  describe('new.createFromCurrent', () => {
    it('should create a file at the workspace root', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        await openFile(path.join(workspaceFolder.uri.fsPath, '/file'))

        await triggerCreateFromCurrent()

        const inputValue = 'new-file'

        pickWithInputValue(inputValue)

        await expectNewFileOrFolder(inputValue, 'file')
      }))

    it('should create a file and missing parent folders with expansions', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        const newFilePath = '/folder-2/folder-2-2/'

        await openFile(path.join(workspaceFolder.uri.fsPath, newFilePath, 'file-2-2-1'))

        await triggerCreateFromCurrent()

        pickWithInputValue('folder-2-2-3/new-file-{1,2,3}.ext')

        await expectNewFileOrFolder(path.join(newFilePath, 'folder-2-2-3/new-file-1.ext'), 'file')
        await expectNewFileOrFolder(path.join(newFilePath, 'folder-2-2-3/new-file-2.ext'), 'file')
        await expectNewFileOrFolder(path.join(newFilePath, 'folder-2-2-3/new-file-3.ext'), 'file')
      }))

    it('should create a folder and missing parent folders', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        const newFilePath = '/folder-2/folder-2-2/'

        await openFile(path.join(workspaceFolder.uri.fsPath, newFilePath, 'file-2-2-1'))

        await triggerCreateFromCurrent()

        const inputValue = 'folder-2-2-3/folder-2-2-3-1/'

        pickWithInputValue(inputValue)

        await expectNewFileOrFolder(path.join(newFilePath, inputValue), 'folder')
      }))
  })
})
