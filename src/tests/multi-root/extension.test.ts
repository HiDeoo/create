import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { commands, window, workspace } from 'vscode'

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
  describe('create.new', () => {
    describe('path picker fuzzy matching', () => {
      describe('with files.exclude', () => {
        it('should list ordered folders with the workspace prefix', () =>
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/folder-1', description: 'workspace root' },
                { label: '/folder-2', description: 'workspace root' },
                '---',
                '/folder-1/random',
                '/folder-1/random/random-nested',
                '/folder-2/folder-2-1',
                '/folder-2/folder-2-2',
                '/folder-2/folder-2-2/folder-2-2-1',
                '/folder-2/folder-2-2/folder-2-2-2',
                '/folder-2/folder-2-2/folder-2-2-2/folder-2-2-2-1',
                '/folder-2/folder-2-2/random',
              ])
            ).to.be.true
          }))

        it('should list ordered folders with the active folder shortcut in the proper workspace', () =>
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await openFile(path.join(workspaceFolderB.uri.fsPath, '/folder-2-2/file-2-2-1'))

            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/folder-1', description: 'workspace root' },
                { label: '/folder-2', description: 'workspace root' },
                { label: '/folder-2/folder-2-2', description: 'active folder' },
                '---',
                '/folder-1/random',
                '/folder-1/random/random-nested',
                '/folder-2/folder-2-1',
                '/folder-2/folder-2-2',
                '/folder-2/folder-2-2/folder-2-2-1',
                '/folder-2/folder-2-2/folder-2-2-2',
                '/folder-2/folder-2-2/folder-2-2-2/folder-2-2-2-1',
                '/folder-2/folder-2-2/random',
              ])
            ).to.be.true
          }))

        it('should list ordered folders without the active folder shortcut if the current document is at the root of the proper workspace', () =>
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await openFile(path.join(workspaceFolderA.uri.fsPath, 'file-1'))

            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/folder-1', description: 'workspace root' },
                { label: '/folder-2', description: 'workspace root' },
                '---',
                '/folder-1/random',
                '/folder-1/random/random-nested',
                '/folder-2/folder-2-1',
                '/folder-2/folder-2-2',
                '/folder-2/folder-2-2/folder-2-2-1',
                '/folder-2/folder-2-2/folder-2-2-2',
                '/folder-2/folder-2-2/folder-2-2-2/folder-2-2-2-1',
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
          withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
            await triggerCreate()

            expect(
              pickerMenuItemsEqual([
                { label: '/folder-1', description: 'workspace root' },
                { label: '/folder-2', description: 'workspace root' },
                '---',
                '/folder-1/random',
                '/folder-1/random/random-nested',
                '/folder-2/folder-2-1',
                '/folder-2/folder-2-2',
                '/folder-2/folder-2-2/folder-2-2-1',
                '/folder-2/folder-2-2/random',
              ])
            ).to.be.true
          }))
      })

      describe('new files and folders', () => {
        it('should create a file at the root of the first workspace folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'new-file'

            pickWithMenuItem('/folder-1', inputValue)

            await expectNewFileOrFolder(inputValue, 'file', workspaceFolderA)
          }))

        it('should create a file at the root of the second workspace folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'new-file'

            pickWithMenuItem('/folder-2', inputValue)

            await expectNewFileOrFolder(inputValue, 'file', workspaceFolderB)
          }))

        it('should create a file in the proper workspace folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'new-file'

            pickWithMenuItem('/folder-2/folder-2-1', inputValue)

            await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'file', workspaceFolderB)
          }))

        it('should create a file and missing parent folders in the proper workspace folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'folder-2-1-1/folder-2-1-1-1/new-file'

            pickWithMenuItem('/folder-2/folder-2-1', inputValue)

            await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'file', workspaceFolderB)
          }))

        it('should open a new file', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'new-file'

            pickWithMenuItem('/folder-2/folder-2-1', inputValue)

            await expectOpenedFile(path.join('/folder-2-1', inputValue), workspaceFolderB)
          }))

        it('should open an existing file', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'file-2-2-1'

            pickWithMenuItem('/folder-2/folder-2-2', inputValue)

            await expectOpenedFile(path.join('/folder-2-2', inputValue), workspaceFolderB)
          }))

        it('should create a folder in the proper workspace folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'folder-2-1-1/'

            pickWithMenuItem('/folder-2/folder-2-1', inputValue)

            await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'folder', workspaceFolderB)
          }))

        it('should create a folder and missing parent folders in the proper workspace folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'folder-2-1-1/folder-2-1-1-1/'

            pickWithMenuItem('/folder-2/folder-2-1', inputValue)

            await expectNewFileOrFolder(path.join('/folder-2-1', inputValue), 'folder', workspaceFolderB)
          }))

        it('should not open a new folder', () =>
          withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
            await triggerCreate()

            const inputValue = 'folder-2-1-1/'

            pickWithMenuItem('/folder-2/folder-2-1', inputValue)

            await waitForTimeout(100)

            expect(window.activeTextEditor?.document.uri.fsPath).to.be.undefined
          }))

        describe('with expansions', () => {
          it('should create a file with with no expansion but similar syntax in the proper workspace', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              const inputValue = 'new-file-{1.ext'

              pickWithMenuItem('/folder-1', inputValue)

              await expectNewFileOrFolder(inputValue, 'file', workspaceFolderA)
            }))

          it('should create multiple files in the first workspace with a list expansion', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              pickWithMenuItem('/folder-1', 'new-file-{1,2,3}.ext')

              await expectNewFileOrFolder('new-file-1.ext', 'file', workspaceFolderA)
              await expectNewFileOrFolder('new-file-2.ext', 'file', workspaceFolderA)
              await expectNewFileOrFolder('new-file-3.ext', 'file', workspaceFolderA)
            }))

          it('should create multiple files in the first workspace with a sequence expansion', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              pickWithMenuItem('/folder-2/folder-2-1', 'folder-2-1-1/new-file-{1..3}.ext')

              await expectNewFileOrFolder('folder-2-1/folder-2-1-1/new-file-1.ext', 'file', workspaceFolderB)
              await expectNewFileOrFolder('folder-2-1/folder-2-1-1/new-file-2.ext', 'file', workspaceFolderB)
              await expectNewFileOrFolder('folder-2-1/folder-2-1-1/new-file-3.ext', 'file', workspaceFolderB)
            }))

          it('should create multiple folders with an expansion even if some already exists in the proper workspace', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              pickWithMenuItem('/folder-2/folder-2-2', 'folder-2-2-{1..3}/')

              await expectNewFileOrFolder(path.join('/folder-2-2', 'folder-2-2-1'), 'folder', workspaceFolderB)
              await expectNewFileOrFolder(path.join('/folder-2-2', 'folder-2-2-2'), 'folder', workspaceFolderB)
              await expectNewFileOrFolder(path.join('/folder-2-2', 'folder-2-2-3'), 'folder', workspaceFolderB)
            }))

          it('should open multiple files with expansions in the proper workspace', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              pickWithMenuItem('/folder-2/folder-2-1', 'new-file-{1..2}.{ext1,ext2}')

              await expectOpenedFile(path.join('/folder-2-1', 'new-file-1.ext1'), workspaceFolderB)
              await expectOpenedFile(path.join('/folder-2-1', 'new-file-1.ext2'), workspaceFolderB)
              await expectOpenedFile(path.join('/folder-2-1', 'new-file-2.ext1'), workspaceFolderB)
              await expectOpenedFile(path.join('/folder-2-1', 'new-file-2.ext2'), workspaceFolderB)
            }))

          it('should create multiple folders with an expansion in the proper workspace', () =>
            withExtension(async ({ pickWithMenuItem, triggerCreate }) => {
              await triggerCreate()

              pickWithMenuItem('/folder-2/folder-2-1', 'folder-2-1-1/new-folder-{1..3}/')

              await expectNewFileOrFolder(
                path.join('/folder-2-1', 'folder-2-1-1/new-folder-1'),
                'folder',
                workspaceFolderB
              )
              await expectNewFileOrFolder(
                path.join('/folder-2-1', 'folder-2-1-1/new-folder-2'),
                'folder',
                workspaceFolderB
              )
              await expectNewFileOrFolder(
                path.join('/folder-2-1', 'folder-2-1-1/new-folder-3'),
                'folder',
                workspaceFolderB
              )
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

      it('should loop through workspace folders if triggered with no input value', () =>
        withExtension(async ({ pickerInputValueEqual, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          for (const inputValue of ['/folder-1', '/folder-2', '/folder-1']) {
            await triggerAutoCompletion()

            expect(pickerInputValueEqual(inputValue)).to.be.true
          }
        }))

      it('should loop through workspace folders matching the input value', () =>
        withExtension(async ({ pickerInputValueEqual, setInputValue, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await setInputValue('f')

          for (const inputValue of ['/folder-1', '/folder-2', '/folder-1']) {
            await triggerAutoCompletion()

            expect(pickerInputValueEqual(inputValue)).to.be.true
          }

          await setInputValue('/f')

          for (const inputValue of ['/folder-1', '/folder-2', '/folder-1']) {
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
              { label: '/folder-1', description: 'workspace root' },
              { label: '/folder-2', description: 'workspace root' },
              '---',
              '/folder-1/random',
              '/folder-1/random/random-nested',
              '/folder-2/folder-2-1',
              '/folder-2/folder-2-2',
              '/folder-2/folder-2-2/folder-2-2-1',
              '/folder-2/folder-2-2/folder-2-2-2',
              '/folder-2/folder-2-2/folder-2-2-2/folder-2-2-2-1',
              '/folder-2/folder-2-2/random',
            ])
          ).to.be.true

          await commands.executeCommand('workbench.action.quickOpenSelectNext')
          await commands.executeCommand('workbench.action.quickOpenSelectNext')

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/folder-1/random')).to.be.true
        }))

      it('should sanitize the input value not matching any workspace folders if any when triggered', () =>
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
        const gitignorePath = path.join(__dirname, '../../../fixtures/folder-2', '.gitignore')

        before(async () => {
          await fs.writeFile(gitignorePath, 'folder-2-2')
        })

        after(async () => {
          await fs.rm(gitignorePath)
        })

        it('should respect a .gitignore file', () =>
          withExtension(async ({ pickerInputValueEqual, setInputValue, triggerAutoCompletion, triggerCreate }) => {
            await triggerCreate()

            await setInputValue('/folder-2/f')

            await triggerAutoCompletion()

            // folder-2-2 is gitignored.
            expect(pickerInputValueEqual('/folder-2/folder-2-1/')).to.be.true
          }))
      })

      describe('new files and folders', () => {
        it('should create a file at the root of the first workspace folder', () =>
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

              expect(pickerInputValueEqual('/folder-1')).to.be.true

              const inputValueSuffix = 'new-file'

              await pickWithAutoCompletion(`/folder-1/${inputValueSuffix}`)

              await expectNewFileOrFolder(inputValueSuffix, 'file', workspaceFolderA)
            }
          ))

        it('should create a file at the root of the second workspace folder', () =>
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

              const inputValueSuffix = 'new-file'

              await pickWithAutoCompletion(`/folder-2/${inputValueSuffix}`)

              await expectNewFileOrFolder(inputValueSuffix, 'file', workspaceFolderB)
            }
          ))

        it('should create and open a file and missing parent folders in the proper workspace folder', () =>
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

              const inputValueSuffix = '/folder-2-2/folder-2-2-3/folder-2-2-3-1/new-file'

              await pickWithAutoCompletion(`/folder-2${inputValueSuffix}`)

              await expectNewFileOrFolder(inputValueSuffix, 'file', workspaceFolderB)
              await expectOpenedFile(inputValueSuffix, workspaceFolderB)
            }
          ))

        it('should create a folder and missing parent folders in the proper workspace', () =>
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

              expect(pickerInputValueEqual('/folder-1')).to.be.true

              const inputValueSuffix = '/folder-1-1/folder-1-1-2/'

              await pickWithAutoCompletion(`/folder-1${inputValueSuffix}`)

              await expectNewFileOrFolder(inputValueSuffix, 'folder')
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

              const autoCompletionPrefix = '/folder-2-3/folder-2-3-1'

              await pickWithAutoCompletion(`/folder-2${autoCompletionPrefix}/new-file-{1..3}.ext`)

              await expectNewFileOrFolder(path.join(autoCompletionPrefix, 'new-file-1.ext'), 'file', workspaceFolderB)
              await expectNewFileOrFolder(path.join(autoCompletionPrefix, 'new-file-2.ext'), 'file', workspaceFolderB)
              await expectNewFileOrFolder(path.join(autoCompletionPrefix, 'new-file-3.ext'), 'file', workspaceFolderB)
            }
          ))
      })
    })
  })

  describe('create.newFromCurrent', () => {
    it('should create a file at the root of the first workspace folder', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        await openFile(path.join(workspaceFolderA.uri.fsPath, '/file-1'))

        await triggerCreateFromCurrent()

        const inputValue = 'new-file'

        pickWithInputValue(inputValue)

        await expectNewFileOrFolder(inputValue, 'file', workspaceFolderA)
      }))

    it('should create a file at the root of the second workspace folder', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        await openFile(path.join(workspaceFolderB.uri.fsPath, '/file-2'))

        await triggerCreateFromCurrent()

        const inputValue = 'new-file'

        pickWithInputValue(inputValue)

        await expectNewFileOrFolder(inputValue, 'file', workspaceFolderB)
      }))

    it('should create a file and missing parent folders with expansions in the proper workspace folder', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        const newFilePath = '/folder-2-2/'

        await openFile(path.join(workspaceFolderB.uri.fsPath, newFilePath, 'file-2-2-1'))

        await triggerCreateFromCurrent()

        pickWithInputValue('folder-2-2-3/new-file-{1,2,3}.ext')

        await expectNewFileOrFolder(path.join(newFilePath, 'folder-2-2-3/new-file-1.ext'), 'file', workspaceFolderB)
        await expectNewFileOrFolder(path.join(newFilePath, 'folder-2-2-3/new-file-2.ext'), 'file', workspaceFolderB)
        await expectNewFileOrFolder(path.join(newFilePath, 'folder-2-2-3/new-file-3.ext'), 'file', workspaceFolderB)
      }))

    it('should create a folder and missing parent folders in the proper workspace folder', () =>
      withExtension(async ({ pickWithInputValue, triggerCreateFromCurrent }) => {
        const newFilePath = '/folder-2-2/'

        await openFile(path.join(workspaceFolderB.uri.fsPath, newFilePath, 'file-2-2-1'))

        await triggerCreateFromCurrent()

        const inputValue = 'folder-2-2-3/folder-2-2-3-1/'

        pickWithInputValue(inputValue)

        await expectNewFileOrFolder(path.join(newFilePath, inputValue), 'folder', workspaceFolderB)
      }))
  })
})
