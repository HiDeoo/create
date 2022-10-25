import { expect } from 'chai'
import { type SinonSpy, spy } from 'sinon'
import { type MessageItem, window } from 'vscode'

import { withExtension } from '../utils'

describe('with no folder in the workspace', () => {
  it('should bail out and show an error', () =>
    withExtension(async ({ isPickerAvailable, triggerCreate, triggerCreateFromCurrent }) => {
      const expectedErrorMessage = 'No workspace folder found, please open a folder first.'

      const showErrorMessageSpy = spy(window, 'showErrorMessage') as unknown as SinonSpy<
        [message: string],
        Thenable<MessageItem | undefined>
      >

      await triggerCreate(false)

      expect(showErrorMessageSpy.calledOnceWith(expectedErrorMessage)).to.be.true
      expect(isPickerAvailable()).to.be.false

      showErrorMessageSpy.resetHistory()

      await triggerCreateFromCurrent(false)

      expect(showErrorMessageSpy.calledOnceWith(expectedErrorMessage)).to.be.true
      expect(isPickerAvailable()).to.be.false

      showErrorMessageSpy.restore()
    }))
})
