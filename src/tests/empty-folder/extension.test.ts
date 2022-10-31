import assert from 'node:assert'

import { expect } from 'chai'
import { type SinonSpy, spy } from 'sinon'
import { type MessageItem, window, workspace } from 'vscode'

import { withExtension } from '../utils'

const workspaceFolder = workspace.workspaceFolders?.[0]
assert(workspaceFolder, 'The workspace folder is not defined.')

describe('with an empty folder workspace', () => {
  describe('create.new', () => {
    describe('path picker fuzzy matching', () => {
      it('should list only the root folder with no separator', () =>
        withExtension(async ({ pickerMenuItemsEqual, triggerCreate }) => {
          await triggerCreate()

          expect(pickerMenuItemsEqual([{ label: '/', description: 'workspace root' }])).to.be.true
        }))
    })

    describe('path picker auto completion', () => {
      it('should do nothing when triggered in an empty folder', () =>
        withExtension(async ({ pickerInputValueEqual, triggerCreate, triggerAutoCompletion }) => {
          await triggerCreate()

          await triggerAutoCompletion()

          expect(pickerInputValueEqual('/')).to.be.true
        }))
    })
  })

  describe('create.newFromCurrent', () => {
    it('should bail out and show an error with no file opened', () =>
      withExtension(async ({ isPickerAvailable, triggerCreateFromCurrent }) => {
        const showErrorMessageSpy = spy(window, 'showErrorMessage') as unknown as SinonSpy<
          [message: string],
          Thenable<MessageItem | undefined>
        >

        await triggerCreateFromCurrent(false)

        expect(showErrorMessageSpy.calledOnceWith('No opened file found, please open a file first.')).to.be.true
        expect(isPickerAvailable()).to.be.false

        showErrorMessageSpy.restore()
      }))
  })
})
