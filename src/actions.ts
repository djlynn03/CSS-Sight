import * as vscode from "vscode";

export class UnusedCSSCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private diagnosticCollection: vscode.DiagnosticCollection) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    context.diagnostics.forEach((diagnostic) => {
      if (diagnostic.code === "css-sight(unusedSelector)") {
        const singleSelectorAction = new vscode.CodeAction(
          "Remove Unused Selector",
          vscode.CodeActionKind.QuickFix
        );

        // Command to apply the edit
        singleSelectorAction.command = {
          title: "CSS Sight: Remove Unused Selector",
          command: "css-sight.removeUnusedSelector",
          arguments: [document, diagnostic.range],
        };

        singleSelectorAction.isPreferred = true;

        const allSelectorAction = new vscode.CodeAction(
          "Remove All Unused Selectors in File",
          vscode.CodeActionKind.QuickFix
        );

        // Command to apply the edit
        allSelectorAction.command = {
          title: "CSS Sight: Remove All Unused Selectors in File",
          command: "css-sight.removeAllUnusedSelectorsInFile",
          arguments: [document],
        };

        allSelectorAction.isPreferred = false;

        actions.push(singleSelectorAction, allSelectorAction);
      }
    });

    return actions;
  }
}
