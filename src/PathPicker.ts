import path from 'node:path'

import { type QuickPick, window, commands } from 'vscode'

import { isQualifiedBaseDirectory, type BaseDirectory } from './libs/fs'

export class PathPicker {
  onDispose?: () => void
  onPick?: (value: string) => void

  #baseDirectory: BaseDirectory | undefined
  #didAutoComplete = false
  #quickPick: QuickPick<BaseDirectory>

  constructor(private readonly baseDirectories: Promise<BaseDirectory[]>) {
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
    this.#quickPick.items = baseDirectories
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

      this.#baseDirectory = selectedItem
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
    if (this.#didAutoComplete) {
      // TODO(HiDeoo)
      return
    }

    if (!isQualifiedBaseDirectory(this.#baseDirectory)) {
      return
    }

    const pickedPath = path.join(this.#baseDirectory.path, this.#quickPick.value)

    // TODO(HiDeoo) Busy during onPick?
    this.onPick?.(pickedPath)

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
