<div align="center">
  <img alt="New extension icon" src="https://i.imgur.com/R2xcaBh.png" width="128" />
  <h1 align="center">New</h1>
</div>

<div align="center">
  <p><strong>Quickly create new File(s) & Folder(s).</strong></p>
  <p>
    <a href="https://github.com/HiDeoo/new/actions/workflows/integration.yml">
      <img alt="Integration Status" src="https://github.com/HiDeoo/new/actions/workflows/integration.yml/badge.svg" />
    </a>
    <a href="https://github.com/HiDeoo/new/blob/main/LICENSE">
      <img alt="License" src="https://badgen.net/github/license/HiDeoo/new" />
    </a>
  </p>
  <p>
    <a href="https://i.imgur.com/9IvyqoS.gif" title="Demo of the New extension using fuzzy matching">
      <img alt="Demo of the New extension using fuzzy matching" src="https://i.imgur.com/9IvyqoS.gif" width="675" />
    </a>
  </p>
  <p>
    <a href="https://i.imgur.com/7OnFzbj.gif" title="Demo of the New extension using terminal-style autocomplete">
      <img alt="Demo of the New extension using terminal-style autocomplete" src="https://i.imgur.com/7OnFzbj.gif" width="675" />
    </a>
  </p>
</div>

## Features

- Quickly create new File(s) & Folder(s) from the command palette using either:
  - [Fuzzy matching](https://i.imgur.com/9IvyqoS.gif) to select an existing folder and then provide a relative path.
  - [Terminal-style autocomplete](https://i.imgur.com/7OnFzbj.gif) using the `Tab` key.
- Automatically create missing folder structure if it does not exist.
- Automatically open newly created file(s) in the editor.
- Support for creating folder(s) by ending a path with a `/` character.
- Support for [`files.exclude`](https://code.visualstudio.com/docs/getstarted/settings#_default-settings) settings and [`.gitignore`](https://git-scm.com/docs/gitignore) files.
- Support for [Bash-like brace expansion](https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html), e.g. `Component.{ts,css}` will create the `Component.ts` and `Component.css` files.
- Support for [multi-root workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces).

## Usage

You can use the Visual Studio Code [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and choose either:

- The `New file(s) & folder(s)` command to create new file(s) & folder(s) in the current workspace.
- The `Relative new file(s) & folder(s)` command to create new file(s) & folder(s) relative to the currently opened file in a single step.

## Shortcuts

This extension also provides various [configurable](https://code.visualstudio.com/docs/getstarted/keybindings#_keyboard-shortcuts-editor) keyboard shortcuts to quickly create new file(s) & folder(s).

| macOS                   | Windows / Linux          | Description                                                           |
| ----------------------- | ------------------------ | --------------------------------------------------------------------- |
| `Cmd + Opt + O`         | `Ctrl + Alt + O`         | Create new file(s) & folder(s).                                       |
| `Cmd + Shift + Opt + O` | `Ctrl + Shift + Alt + O` | Create new file(s) & folder(s) relative to the currently opened file. |

## License

Licensed under the MIT License, Copyright © HiDeoo.

See [LICENSE](https://github.com/HiDeoo/new/blob/main/LICENSE) for more information.
