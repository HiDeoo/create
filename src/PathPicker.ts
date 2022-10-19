import path from 'node:path'

import { type QuickPick, window, commands, QuickPickItemKind, type InputBox } from 'vscode'

export class PathPicker {
  onDispose?: () => void
  onPick?: (newPath: string) => void

  #didAutoComplete = false
  #picker: QuickPick<PathPickerMenuItem>
  #input?: InputBox
  #selectedMenuFolderItem: PathPickerMenuFolderItem | undefined

  static isPathPickerMenuFolderItem(item: PathPickerMenuItem): item is PathPickerMenuFolderItem {
    return (item as PathPickerMenuSeparatorItem).kind !== QuickPickItemKind.Separator
  }

  constructor(private readonly menuItems: Promise<PathPickerMenuItem[]>) {
    this.#picker = window.createQuickPick()
    this.#picker.onDidAccept(this.#pickerDidAccept)
    this.#picker.onDidHide(this.#dispose)

    // TODO(HiDeoo) placeholder
    this.#show()
  }

  #dispose = () => {
    this.#setAutoCompletionAvailable(false)

    this.#picker.dispose()
    this.#input?.dispose()

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
    const pickerValue = this.#picker.value

    this.#picker.dispose()

    this.#input = window.createInputBox()
    this.#input.onDidAccept(this.#inputDidAccept)
    this.#input.onDidHide(this.#dispose)

    if (options?.preserveValue) {
      this.#input.value = pickerValue
    }

    if (options?.autoCompletion === false) {
      this.#setAutoCompletionAvailable(false)
    }

    // TODO(HiDeoo) placeholder
    this.#input.show()
  }

  #pickerDidAccept = () => {
    const menuSelectedItem = this.#picker.selectedItems[0]

    if (!menuSelectedItem || !PathPicker.isPathPickerMenuFolderItem(menuSelectedItem)) {
      // TODO(HiDeoo) Show warning? Validation message?
      return
    }

    this.#selectedMenuFolderItem = menuSelectedItem
    this.#switchToInputPicker({ autoCompletion: false })
  }

  #inputDidAccept = () => {
    if (!this.#input || this.#input.value.length === 0) {
      // TODO(HiDeoo) Show warning? Validation message?
      return
    }

    this.#didPick()
  }

  #didPick() {
    if (!this.#selectedMenuFolderItem || !this.#input) {
      return
    }

    const newPath = path.join(this.#selectedMenuFolderItem.path, this.#input.value)

    // TODO(HiDeoo) Busy during onPick?
    this.onPick?.(newPath)

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
