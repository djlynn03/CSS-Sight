import * as vscode from "vscode";
import { analyzeFiles } from "./extractor";
import { UnusedCSSCodeActionProvider } from "./actions";
import {
  removeAllUnusedSelectorsInFileFunction,
  removeAllUnusedSelectorsInWorkspaceFunction,
  removeUnusedSelectorFunction,
} from "./commands";

export let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  // Create a collection to hold diagnostics (warnings for unused selectors)
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("unusedCSS");

  // Watch for changes in relevant files
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{css,html,js,ts,jsx,tsx}"
  );

  watcher.onDidChange((_) => analyzeFiles(diagnosticCollection));
  watcher.onDidCreate((_) => analyzeFiles(diagnosticCollection));
  watcher.onDidDelete((_) => analyzeFiles(diagnosticCollection));

  // Analyze all files on startup
  analyzeFiles(diagnosticCollection);

  vscode.workspace.onDidChangeTextDocument(
    (event: vscode.TextDocumentChangeEvent) => {
      // Only handle events for the document you are interested in (e.g., CSS)
      if (event.document.languageId === "css") {
        analyzeFiles(diagnosticCollection);
      }
    }
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "css" },
      new UnusedCSSCodeActionProvider(diagnosticCollection),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  context.subscriptions.push(diagnosticCollection, watcher);

  const removeUnusedSelector = vscode.commands.registerCommand(
    "css-sight.removeUnusedSelector",
    (document: vscode.TextDocument, range: vscode.Range) =>
      removeUnusedSelectorFunction(document, range)
  );

  const removeAllUnusedSelectorsInFile = vscode.commands.registerCommand(
    "css-sight.removeAllUnusedSelectorsInFile",
    removeAllUnusedSelectorsInFileFunction
  );

  const removeAllUnusedSelectorsInWorkspace = vscode.commands.registerCommand(
    "css-sight.removeAllUnusedSelectorsInWorkspace",
    removeAllUnusedSelectorsInWorkspaceFunction
  );

  context.subscriptions.push(
    removeUnusedSelector,
    removeAllUnusedSelectorsInFile,
    removeAllUnusedSelectorsInWorkspace
  );

  console.log("CSS Sight initialized");

  (global as any).testExtensionContext = context;
}

// TODO - sass, scss, etc
// TODO - add ignore list
// TODO - add undo actions in success popup

export function deactivate() {
  diagnosticCollection.clear();
}
