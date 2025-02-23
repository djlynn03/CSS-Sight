import * as vscode from "vscode";
import {
  analyzeFiles,
  extractUsedSelectors,
  getAllCSSSelectors,
  getCSSFiles,
  getOtherFiles,
  getUnusedSelectors,
  getUsedSelectors,
} from "./extractor";
import { diagnosticCollection } from "./extension";

const fullCSSRuleRegex = (selectorName: string) =>
  new RegExp(
    `^[^\\S\\n\\r]*${escapeRegExp(
      selectorName
    )}(?:\\s*|\\s+[^{]+){[^}]*}[\\s\\n\\r]*`,
    "gm"
  );

// /\.unused-class(?:\s*|\s+[^{]+){[^}]*}[\s\n\r]*/ + /a/;

export async function removeUnusedSelectorFunction(
  document: vscode.TextDocument,
  range: vscode.Range
) {
  const text = document.getText(); // Get the document content

  const start = range.start; // Starting position of the selector name
  const startOffset = document.offsetAt(start);

  const end = range.end; // Ending position of the selector name
  const endOffset = document.offsetAt(end);

  const selectorName = text.substring(startOffset, endOffset);

  // Regex to match the full CSS rule including the newline after it
  const ruleRegex = new RegExp(fullCSSRuleRegex(selectorName), "gm");

  let match;

  while ((match = ruleRegex.exec(text)) !== null) {
    const matchStart = document.positionAt(match.index); // Start of the rule
    const matchEnd = document.positionAt(match.index + match[0].length); // End of the rule (including newline)

    // Check if the diagnostic range falls within this rule
    if (start.isAfterOrEqual(matchStart) && end.isBeforeOrEqual(matchEnd)) {
      await removeRange(document, new vscode.Range(matchStart, matchEnd)).then(
        () => {
          // success
          vscode.window.showInformationMessage(`Removed ${selectorName}`);
          analyzeFiles(diagnosticCollection);
        },
        () => {
          // fail
          vscode.window.showErrorMessage(`Failed to remove ${selectorName}`);
        }
      );

      break; // Stop after finding the first match
    }
  }
}

export async function removeAllUnusedSelectorsInFileFunction() {
  const activeEditor = vscode.window.activeTextEditor;

  if (!activeEditor) {
    console.error("No active editor");
    await vscode.window.showErrorMessage("No active editor");
    return;
  }

  if (activeEditor.document.languageId !== "css") {
    console.error("Not a CSS file");
    await vscode.window.showErrorMessage("Not a CSS file");
    return;
  }

  const document = activeEditor.document;
  const otherFiles = await getOtherFiles();

  const allSelectors = getAllCSSSelectors([document.uri]);
  const usedSelectors = await getUsedSelectors(otherFiles);

  const unusedSelectors = await getUnusedSelectors(allSelectors, usedSelectors);

  if (unusedSelectors.size === 0) {
    console.error("No unused selectors found in file");
    await vscode.window.showInformationMessage(
      `No unused selectors found in file`
    );
    return;
  }

  const edit = new vscode.WorkspaceEdit();

  unusedSelectors.forEach(async (selectorName) => {
    const ruleRegex = new RegExp(fullCSSRuleRegex(selectorName), "gm");
    let match;
    while ((match = ruleRegex.exec(document.getText())) !== null) {
      const matchStart = document.positionAt(match.index); // Start of the rule
      const matchEnd = document.positionAt(match.index + match[0].length); // End of the rule (including newline)

      edit.delete(document.uri, new vscode.Range(matchStart, matchEnd));
    }
  });

  await vscode.workspace.applyEdit(edit).then(async (success) => {
    if (success) {
      vscode.window.showInformationMessage(
        `Removed ${unusedSelectors.size} unused selectors`
      );

      await analyzeFiles(diagnosticCollection);
    } else {
      vscode.window.showErrorMessage(`Failed to remove all unused selectors`);
    }
  });
}

export async function removeAllUnusedSelectorsInWorkspaceFunction() {
  const cssFiles = await getCSSFiles();

  var removedSelectorCount = 0;

  const edit = new vscode.WorkspaceEdit();
  const otherFiles = await getOtherFiles();
  const allSelectors = getAllCSSSelectors(cssFiles);

  for (const file of cssFiles) {
    const document = await vscode.workspace.openTextDocument(file);

    const usedSelectors = await getUsedSelectors(otherFiles);

    const unusedSelectors = await getUnusedSelectors(
      allSelectors,
      usedSelectors
    );

    removedSelectorCount += unusedSelectors.size;

    unusedSelectors.forEach((selectorName) => {
      const ruleRegex = new RegExp(fullCSSRuleRegex(selectorName), "gm");
      let match;

      while ((match = ruleRegex.exec(document.getText())) !== null) {
        const matchStart = document.positionAt(match.index); // Start of the rule
        const matchEnd = document.positionAt(match.index + match[0].length); // End of the rule (including newline)

        edit.delete(document.uri, new vscode.Range(matchStart, matchEnd));
      }
    });
  }

  await vscode.workspace.applyEdit(edit).then(async (success) => {
    if (success) {
      vscode.window.showInformationMessage(
        `Removed ${removedSelectorCount} unused selectors`
      );

      await analyzeFiles(diagnosticCollection);
    } else {
      vscode.window.showErrorMessage(`Failed to remove all unused selectors`);
    }
  });
}

export function removeRange(
  document: vscode.TextDocument,
  range: vscode.Range
) {
  const edit = new vscode.WorkspaceEdit();
  edit.delete(document.uri, range);
  return vscode.workspace.applyEdit(edit);
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
