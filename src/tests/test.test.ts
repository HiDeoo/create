import assert from 'node:assert'

import { commands } from 'vscode'

import { withQuikPick } from './utils'

describe('// TODO', () => {
  it('// TODO', () =>
    withQuikPick(async (getQuickPick) => {
      await commands.executeCommand('new.pick')

      assert.equal(getQuickPick().items.length, 5)
    }))
})
