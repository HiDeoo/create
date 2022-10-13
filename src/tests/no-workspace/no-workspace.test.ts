import { expect } from 'chai'
import { type SinonSpy, spy } from 'sinon'
import { commands, type MessageItem, window } from 'vscode'

import { withQuikPick } from '../utils'

describe('no workspace', () => {
  it('should bail out and show an error', () =>
    withQuikPick(async (getQuickPick) => {
      const showErrorMessageSpy = spy(window, 'showErrorMessage') as unknown as SinonSpy<
        [message: string],
        Thenable<MessageItem | undefined>
      >

      await commands.executeCommand('new.pick')

      expect(showErrorMessageSpy.calledOnceWith('No workspace folder found, please open a folder first.')).to.be.true
      expect(() => getQuickPick()).to.throw()

      showErrorMessageSpy.restore()
    }))
})
