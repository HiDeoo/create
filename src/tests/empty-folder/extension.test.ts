import assert from 'node:assert'

import { expect } from 'chai'
import { workspace } from 'vscode'

import { withExtension } from '../utils'

const workspaceFolder = workspace.workspaceFolders?.[0]
assert(workspaceFolder, 'The workspace folder is not defined.')

describe('with an empty folder workspace', () => {
  describe('path picker fuzzy matching', () => {
    it('should list only the root folder with no separator', () =>
      withExtension(async ({ pickerMenuItemsEqual, triggerExtension }) => {
        await triggerExtension()

        expect(pickerMenuItemsEqual([{ label: '/', description: 'workspace root' }])).to.be.true
      }))
  })

  describe('path picker auto completion', () => {
    it('should do nothing when triggered in an empty folder', () =>
      withExtension(async ({ pickerInputValueEqual, triggerExtension, triggerAutoCompletion }) => {
        await triggerExtension()

        await triggerAutoCompletion('next')

        expect(pickerInputValueEqual('/')).to.be.true
      }))
  })
})
