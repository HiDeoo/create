import path from 'node:path'

import { type QuickPick, window, commands, QuickPickItemKind } from 'vscode'

/**
 * ┌──────────┐
 * │  picker  │
 * ├──────────┴────────────────────────────────────────────────────┐
 * │ ┌───────────────────────────────────────────────────────────┐ │
 * │ │ inputValue                                                │ │
 * │ └───────────────────────────────────────────────────────────┘ │
 * │ ┌──────┐                                                      │
 * │ │ menu │                                                      │
 * │ ├──────┴────────────────────────────────────────────────────┐ │
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

  #didAutoComplete = false
  #picker: QuickPick<PathPickerMenuItem>
  #selectedMenuFolderItem: PathPickerMenuFolderItem | undefined

  static isPathPickerMenuFolderItem(item: PathPickerMenuItem): item is PathPickerMenuFolderItem {
    return (item as PathPickerMenuSeparatorItem).kind !== QuickPickItemKind.Separator
  }

  constructor(private readonly menuItems: Promise<PathPickerMenuItem[]>) {
    this.#picker = window.createQuickPick()
    this.#picker.onDidAccept(this.#pickerDidAccept)
    this.#picker.onDidHide(this.#pickerDidHide)

    // TODO(HiDeoo) placeholder
    this.#show()
  }

  #dispose() {
    this.#setAutoCompletionAvailable(false)

    this.#picker.dispose()

    this.onDispose?.()
  }

  async #show() {
    this.#setAutoCompletionAvailable(true)

    this.#picker.busy = true
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

  #switchToInputPicker(options?: { autoCompletion?: boolean; preserveValue?: boolean }) {
    this.#picker.busy = false
    this.#picker.items = []

    if (options?.autoCompletion === false) {
      this.#setAutoCompletionAvailable(false)
    }

    if (options?.preserveValue !== true) {
      this.#picker.value = ''
    }
  }

  #pickerDidAccept = () => {
    if (!this.#didAutoComplete && !this.#selectedMenuFolderItem) {
      const menuSelectedItem = this.#picker.selectedItems[0]

      if (!menuSelectedItem || !PathPicker.isPathPickerMenuFolderItem(menuSelectedItem)) {
        this.#dispose()

        return
      }

      this.#selectedMenuFolderItem = menuSelectedItem
      this.#switchToInputPicker({ autoCompletion: false })

      return
    }

    if (this.#picker.value.length === 0) {
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

    if (!this.#selectedMenuFolderItem) {
      return
    }

    const newPath = path.join(this.#selectedMenuFolderItem.path, this.#picker.value)

    // TODO(HiDeoo) Busy during onPick?
    this.onPick?.(newPath)

    this.#dispose()
  }

  #pickerDidHide = () => {
    this.#dispose()
  }

  autoComplete() {
    this.#didAutoComplete = true
    this.#selectedMenuFolderItem = undefined

    this.#switchToInputPicker({ preserveValue: true })

    // TODO(HiDeoo) Handle auto completion
    // TODO(HiDeoo) Handle multiple auto completion
    // TODO(HiDeoo) Busy state?
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
