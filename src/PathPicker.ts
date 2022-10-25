import path from 'node:path'

import { type QuickPick, window, commands, QuickPickItemKind } from 'vscode'

/**
 * ┌───────────┐
 * │  #picker  │
 * ├───────────┴───────────────────────────────────────────────────┐
 * │ ┌───────────────────────────────────────────────────────────┐ │
 * │ │ value                                                     │ │
 * │ └───────────────────────────────────────────────────────────┘ │
 * │ ┌───────┐                                                     │
 * │ │ items │                                                     │
 * │ ├───────┴───────────────────────────────────────────────────┐ │
 * │ │ ┌───────────────────────────────────────────────────────┐ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ ├───────────────────────────────────────────────────────┤ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ └───────────────────────────────────────────────────────┘ │ │
 * │ │ ────────────────── MenuSeparatorItem  ─────────────────── │ │
 * │ │ ┌───────────────────────────────────────────────────────┐ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ ├───────────────────────────────────────────────────────┤ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ ├───────────────────────────────────────────────────────┤ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ ├───────────────────────────────────────────────────────┤ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ ├───────────────────────────────────────────────────────┤ │ │
 * │ │ │ MenuFolderItem                                        │ │ │
 * │ │ └───────────────────────────────────────────────────────┘ │ │
 * │ └───────────────────────────────────────────────────────────┘ │
 * └───────────────────────────────────────────────────────────────┘
 */
export class PathPicker {
  onDispose?: () => void
  onPick?: (newPath: string) => void
  onPickWithAutoCompletion?: (newPathRequest: string) => void

  #picker: QuickPick<PathPickerMenuItem>
  #ignoreValueChangeTimes = 0

  #selectedMenuFolderItem: PathPickerMenuFolderItem | undefined

  #autoCompletionIndex = -1
  #autoCompletionResults: string[] | undefined
  #didAutoComplete = false

  static isPathPickerMenuFolderItem(item: PathPickerMenuItem): item is PathPickerMenuFolderItem {
    return (item as PathPickerMenuSeparatorItem).kind !== QuickPickItemKind.Separator
  }

  constructor(private readonly menuItems: Promise<PathPickerMenuItem[]>) {
    this.#picker = window.createQuickPick()
    this.#picker.onDidAccept(this.#pickerDidAccept)
    this.#picker.onDidChangeValue(this.#pickerDidChangeValue)
    this.#picker.onDidHide(this.#dispose)

    this.#show()
  }

  #dispose = () => {
    this.#setAutoCompletionAvailable(false)

    this.#picker.dispose()

    this.onDispose?.()
  }

  async #show() {
    this.#setAutoCompletionAvailable(true)

    this.#picker.busy = true
    this.#picker.placeholder = 'Select the existing folder that will contain the new file(s) & folder(s)'
    this.#picker.show()

    if (this.#didAutoComplete) {
      return
    }

    const menuItems = await this.menuItems

    this.#picker.busy = false
    this.#picker.items = menuItems
  }

  #setAutoCompletionAvailable(active: boolean) {
    commands.executeCommand('setContext', 'new.autoCompletionAvailable', active)
  }

  #setInputValue(value: string, ignoreChange = false) {
    if (ignoreChange) {
      this.#ignoreValueChangeTimes++
    }

    this.#picker.value = value
  }

  #switchToInputPicker(options?: { autoCompletion?: boolean; initialValue?: string | undefined }) {
    this.#picker.busy = false
    this.#picker.items = []
    this.#picker.placeholder = 'New file(s) & folder(s) path'
    this.#setInputValue(options?.initialValue ?? '', true)

    if (options?.autoCompletion === false) {
      this.#picker.placeholder = 'New file(s) & folder(s) relative path'
      this.#setAutoCompletionAvailable(false)
    }
  }

  #pickerDidAccept = () => {
    if (!this.#didAutoComplete && !this.#selectedMenuFolderItem) {
      const menuSelectedItem = this.#picker.selectedItems[0]

      if (!menuSelectedItem || !PathPicker.isPathPickerMenuFolderItem(menuSelectedItem)) {
        return
      }

      this.#selectedMenuFolderItem = menuSelectedItem
      this.#switchToInputPicker({ autoCompletion: false })

      return
    }

    if (this.#picker.value.length === 0) {
      return
    }

    if (!this.#didAutoComplete) {
      this.onPick?.(path.join(this.#selectedMenuFolderItem?.path ?? path.posix.sep, this.#picker.value))
    } else {
      this.onPickWithAutoCompletion?.(path.join(path.posix.sep, this.#picker.value))
    }

    this.#dispose()
  }

  #pickerDidChangeValue = () => {
    if (this.#ignoreValueChangeTimes > 0) {
      this.#ignoreValueChangeTimes--

      return
    }

    if (!this.#didAutoComplete) {
      return
    }

    this.#autoCompletionIndex = -1
    this.#autoCompletionResults = undefined
  }

  #setupAutoCompletion() {
    this.#didAutoComplete = true
    this.#selectedMenuFolderItem = undefined

    let triggerAutoCompletionAfterSetup = true

    let initialValue = this.#picker.value

    if (this.#picker.value.length === 0) {
      const activeMenuFolderItem = this.#picker.activeItems.find(PathPicker.isPathPickerMenuFolderItem)

      if (activeMenuFolderItem) {
        initialValue = activeMenuFolderItem.label

        triggerAutoCompletionAfterSetup = false
      }
    }

    if (!initialValue.startsWith('/')) {
      initialValue = `${path.posix.sep}${initialValue}`
    }

    this.#switchToInputPicker({ initialValue })

    return triggerAutoCompletionAfterSetup
  }

  async autoComplete(getResults: (request: string) => Promise<string[]>) {
    if (!this.#didAutoComplete) {
      const triggerAutoCompletion = this.#setupAutoCompletion()

      if (!triggerAutoCompletion) {
        return
      }
    }

    if (!this.#autoCompletionResults) {
      let request = this.#picker.value

      if (request.length === 0 || !request.startsWith('/')) {
        request = `${path.posix.sep}${request}`
      }

      this.#picker.busy = true
      this.#autoCompletionResults = await getResults(request)
      this.#picker.busy = false
    }

    if (this.#autoCompletionResults.length > 0) {
      this.#autoCompletionIndex += 1

      if (this.#autoCompletionIndex >= this.#autoCompletionResults.length) {
        this.#autoCompletionIndex = 0
      } else if (this.#autoCompletionIndex < 0) {
        this.#autoCompletionIndex = this.#autoCompletionResults.length - 1
      }

      let completion = this.#autoCompletionResults[this.#autoCompletionIndex]
      const isSingleResult = this.#autoCompletionResults.length === 1

      if (isSingleResult) {
        completion = `${completion}${path.posix.sep}`
      }

      if (completion && this.#picker.value !== completion) {
        this.#setInputValue(completion, !isSingleResult)
      }
    }
  }
}

export type PathPickerMenuItem = PathPickerMenuFolderItem | PathPickerMenuSeparatorItem

interface PathPickerMenuFolderItem {
  description?: string
  label: string
  path: string
}

interface PathPickerMenuSeparatorItem {
  label: string
  kind: QuickPickItemKind.Separator
}
