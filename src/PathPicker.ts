import { type QuickPick, type QuickPickItem, window, commands } from 'vscode'

export class PathPicker {
  onDispose?: () => void
  onPick?: (value: string) => void

  #baseDirectory: string | undefined
  #didAutoComplete = false
  #quickPick: QuickPick<QuickPickItem>

  constructor(private readonly baseDirectories: Promise<string[]>) {
    this.#quickPick = window.createQuickPick()
    this.#quickPick.onDidAccept(this.#quickPickDidAccept)
    this.#quickPick.onDidHide(this.#quickPickDidHide)

    // TODO(HiDeoo) placeholder
    this.#show()
  }

  #dispose() {
    this.#setAutoCompletionAvailable(false)

    this.#quickPick.dispose()

    this.onDispose?.()
  }

  async #show() {
    this.#setAutoCompletionAvailable(true)

    this.#quickPick.busy = true
    this.#quickPick.show()

    if (this.#didAutoComplete) {
      return
    }

    const baseDirectories = await this.baseDirectories

    this.#quickPick.busy = false
    this.#quickPick.items = baseDirectories.map((baseDirectory) => ({ label: `/${baseDirectory}` }))
  }

  #setAutoCompletionAvailable(active: boolean) {
    commands.executeCommand('setContext', 'new.autoCompletionAvailable', active)
  }

  #switchToInputPicker(options?: { autoCompletion?: boolean; preserveValue?: boolean }) {
    this.#quickPick.busy = false
    this.#quickPick.items = []

    if (options?.autoCompletion === false) {
      this.#setAutoCompletionAvailable(false)
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
    // TODO(HiDeoo)
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

    // TODO(HiDeoo) Handle auto completion
    // TODO(HiDeoo) Handle multiple auto completion
    // TODO(HiDeoo) Busy state?
  }
}
