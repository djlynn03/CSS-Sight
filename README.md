# CSS Sight

Remove unused CSS rulesets.

## Features

Highlights CSS rulesets that are unused across HTML, JS, TS, JSX, and TSX files in a workspace.

### `Remove Unused Selector`

Code action to remove the highlighted ruleset.

### `Remove All Unused Selectors in File`

Code action and command to remove every unused ruleset in the current (active) file.
Displays the number of removed rulesets.

### `Remove All Unused Selectors in Workspace`

Command to remove every unused selector in the workspace.
Displays the number of removed rulesets.

### Notes

The extension ignores the same files listed in `.gitignore`.

### Roadmap

- Ignore list for project files
- SCSS/SASS support
- Add "undo" action to success popup

## Contributing

If you'd like to contribute to css-sight, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with a descriptive commit message.
4. Open a pull request to the main repository.

### Reporting Issues

If you encounter any issues with css-sight, please report them in the [issue tracker](https://github.com/djlynn03/css-sight/issues). Be sure to include as much detail as possible, including steps to reproduce the issue.

## Release Notes

### 1.0.0

Initial release of css-sight

### 1.0.2

Bugfixes
