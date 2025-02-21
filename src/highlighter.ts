import * as vscode from "vscode";

export function reportUnusedSelector(
  document: vscode.TextDocument,
  unusedSelectors: Set<string>,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();

  unusedSelectors.forEach((unusedSelector) => {
    const regex = new RegExp(
      `(?<!,\\n|[\\w,>* ])[^\\S\\n]*(${unusedSelector})(?!(?:[\\w-*]+))`,
      "gm"
    );

    let match;
    while ((match = regex.exec(text)) !== null) {
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match[0].length)
      );
      const diagnostic = new vscode.Diagnostic(
        range,
        `Unused CSS selector: ${unusedSelector}`,
        vscode.DiagnosticSeverity.Warning
      );
      diagnostic.code = "css-sight(unusedSelector)";
      diagnostics.push(diagnostic);
    }
  });

  diagnosticCollection.set(document.uri, diagnostics);
}
