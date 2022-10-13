import { stub } from 'sinon'
import { type QuickPick, type QuickPickItem, window } from 'vscode'

export async function withQuikPick(run: (getQuickPick: () => QuickPick<QuickPickItem>) => Promise<void>) {
  let quickPick: QuickPick<QuickPickItem> | undefined

  const createQuickPickStub = stub(window, 'createQuickPick').callsFake(() => {
    quickPick = createQuickPickStub.wrappedMethod()

    return quickPick
  })

  function getQuickPick() {
    if (!quickPick) {
      throw new Error('QuickPick not found.')
    }

    return quickPick
  }

  await run(getQuickPick)

  createQuickPickStub.restore()
}
