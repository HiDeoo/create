import assert from 'node:assert'

import { expect } from 'chai'
import { workspace } from 'vscode'

import { withExtension } from '../utils'

const workspaceFolder = workspace.workspaceFolders?.[0]
assert(workspaceFolder, 'The workspace folder is not defined.')

describe('with an empty folder workspace', () => {
  describe('path picker menu items', () => {
    it('should list only the root folder with no separator', () =>
      withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
        await triggerExtension()

        expect(pickerMenuItemsEqual([{ label: '/', description: 'workspace root' }])).to.be.true
      }))
  })
})
