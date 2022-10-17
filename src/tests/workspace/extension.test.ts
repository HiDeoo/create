import fs from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'chai'
import { stripIndents } from 'common-tags'

import { withExtension } from '../utils'

describe('with no .gitignore', () => {
  it('should list ordered base directories', () =>
    withExtension(async ({ pathPickerBaseDirectoriesEqual, triggerExtension }) => {
      await triggerExtension()

      expect(
        pathPickerBaseDirectoriesEqual([
          '/.github',
          '/folder-1',
          '/folder-1/random',
          '/folder-2',
          '/folder-2/folder-2-1',
          '/folder-2/folder-2-2',
          '/folder-2/folder-2-2/folder-2-2-1',
          '/folder-2/folder-2-2/folder-2-2-2',
          '/folder-2/folder-2-2/random',
          '/folder-3',
        ])
      ).to.be.true
    }))
})

describe('with a .gitignore', () => {
  const gitignorePath = path.join(__dirname, '../../../fixtures/workspace', '.gitignore')

  before(async () => {
    await fs.writeFile(
      gitignorePath,
      stripIndents`folder-1
        # a comment
        .file-3-1
        random
        /folder-2/folder-2-2/folder-2-2-2
      `
    )
  })

  after(async () => {
    await fs.rm(gitignorePath)
  })

  it('should list ordered base directories', () =>
    withExtension(async ({ pathPickerBaseDirectoriesEqual, triggerExtension }) => {
      await triggerExtension()

      expect(
        pathPickerBaseDirectoriesEqual([
          '/.github',
          '/folder-2',
          '/folder-2/folder-2-1',
          '/folder-2/folder-2-2',
          '/folder-2/folder-2-2/folder-2-2-1',
          '/folder-3',
        ])
      ).to.be.true
    }))
})
