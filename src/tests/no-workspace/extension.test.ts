import { expect } from 'chai'
import { type SinonSpy, spy } from 'sinon'
import { commands, type MessageItem, window } from 'vscode'

import { withPathPicker } from '../utils'

it('should bail out and show an error', () =>
  withPathPicker(async ({ isPathPickerAvailable }) => {
    const showErrorMessageSpy = spy(window, 'showErrorMessage') as unknown as SinonSpy<
      [message: string],
      Thenable<MessageItem | undefined>
    >

    await commands.executeCommand('new.pick')

    expect(showErrorMessageSpy.calledOnceWith('No workspace folder found, please open a folder first.')).to.be.true
    expect(isPathPickerAvailable()).to.be.false

    showErrorMessageSpy.restore()
  }))
