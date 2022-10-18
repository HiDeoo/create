import { expect } from 'chai'
import { type SinonSpy, spy } from 'sinon'
import { type MessageItem, window } from 'vscode'

import { withExtension } from '../utils'

describe('with no folder in the workspace', () => {
  it('should bail out and show an error', () =>
    withExtension(async ({ isPathPickerAvailable, triggerExtension }) => {
      const showErrorMessageSpy = spy(window, 'showErrorMessage') as unknown as SinonSpy<
        [message: string],
        Thenable<MessageItem | undefined>
      >

      await triggerExtension(false)

      expect(showErrorMessageSpy.calledOnceWith('No workspace folder found, please open a folder first.')).to.be.true
      expect(isPathPickerAvailable()).to.be.false

      showErrorMessageSpy.restore()
    }))
})
