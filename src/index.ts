import { commands, type ExtensionContext } from 'vscode'

import { Picker } from './libs/Picker'

export function activate(context: ExtensionContext): void {
  let picker: Picker | undefined

  context.subscriptions.push(
    commands.registerCommand('new.pick', () => {
      picker = new Picker()
      picker.onPick = onPick
      picker.onDispose = () => (picker = undefined)
    }),
    commands.registerCommand('new.tab', () => {
      picker?.autoComplete()
    })
  )
}

function onPick(value: string) {
  console.error(value)
}
