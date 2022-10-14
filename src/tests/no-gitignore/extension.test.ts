import { expect } from 'chai'
import { commands } from 'vscode'

import { withPathPicker } from '../utils'

it('should list ordered base directories', () =>
  withPathPicker(async ({ pathPickerBaseDirectoriesEqual }) => {
    await commands.executeCommand('new.pick')

    expect(
      pathPickerBaseDirectoriesEqual([
        '/.github',
        '/folder-1',
        '/folder-2',
        '/folder-2/folder-2-1',
        '/folder-2/folder-2-2',
        '/folder-2/folder-2-2/folder-2-2-1',
        '/folder-3',
      ])
    ).to.be.true
  }))
