import { type QuickPick, type QuickPickItem, window, commands } from 'vscode'

// FIXME(HiDeoo)
const debugItems = [
  { label: 'Debug 1' },
  { label: 'Debug 2' },
  { label: 'Debug 3' },
  { label: 'Debug 4' },
  { label: 'Debug 5' },
]

export class Picker {
  onDispose?: () => void
  onPick?: (value: string) => void

  #baseDirectory: string | undefined
  #didAutoComplete = false
  #quickPick: QuickPick<QuickPickItem>

  constructor() {
    this.#quickPick = window.createQuickPick()
    this.#quickPick.onDidAccept(this.#quickPickDidAccept)
    this.#quickPick.onDidHide(this.#quickPickDidHide)

    this.#show()

    this.#quickPick.items = debugItems
  }

  #dispose() {
    this.#setAutoCompletionActive(false)

    this.#quickPick.dispose()

    this.onDispose?.()
  }

  #show() {
    this.#setAutoCompletionActive(true)

    this.#quickPick.show()
  }

  #setAutoCompletionActive(active: boolean) {
    commands.executeCommand('setContext', 'new.autoCompletionActive', active)
  }

  #switchToInputPicker(options?: { autoCompletion?: boolean; preserveValue?: boolean }) {
    this.#quickPick.items = []

    if (options?.autoCompletion === false) {
      this.#setAutoCompletionActive(false)
    }

    if (options?.preserveValue !== true) {
      this.#quickPick.value = ''
    }
  }

  #quickPickDidAccept = () => {
    if (!this.#didAutoComplete && !this.#baseDirectory) {
      const selectedItem = this.#quickPick.selectedItems[0]

      if (!selectedItem) {
        this.#dispose()

        return
      }

      this.#baseDirectory = selectedItem.label
      this.#switchToInputPicker({ autoCompletion: false })

      return
    }

    if (this.#quickPick.value.length === 0) {
      // TODO(HiDeoo) Show warning?
      return
    }

    this.#didPick()
  }

  #didPick() {
    this.onPick?.(`${this.#baseDirectory} - ${this.#quickPick.value}`)

    this.#dispose()
  }

  #quickPickDidHide = () => {
    this.#dispose()
  }

  autoComplete() {
    this.#didAutoComplete = true
    this.#baseDirectory = undefined

    this.#switchToInputPicker({ preserveValue: true })
  }
}
