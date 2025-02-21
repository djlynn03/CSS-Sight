import * as assert from "assert";
import * as vscode from "vscode";

import * as testable from "./testables";

suite("Highlighter Test Suite", () => {
  test("reportUnusedSelector should report unused CSS selectors", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: ".unused-class {}",
    });
    const unusedSelectors = new Set(["unused-class"]);
    const diagnosticCollection =
      vscode.languages.createDiagnosticCollection("css-sight");

    testable.highlighter.reportUnusedSelector(
      document,
      unusedSelectors,
      diagnosticCollection
    );

    const diagnostics = diagnosticCollection.get(document.uri);
    assert.strictEqual(diagnostics?.length, 1);
    assert.strictEqual(
      diagnostics![0].message,
      "Unused CSS selector: unused-class"
    );
    assert.strictEqual(
      diagnostics![0].severity,
      vscode.DiagnosticSeverity.Warning
    );
    assert.strictEqual(diagnostics![0].code, "css-sight(unusedSelector)");

    diagnosticCollection.dispose();
    vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("reportUnusedSelector should not report used CSS selectors", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: ".used-class {}",
    });
    const unusedSelectors = new Set([]);
    const diagnosticCollection =
      vscode.languages.createDiagnosticCollection("css-sight");

    testable.highlighter.reportUnusedSelector(
      document,
      unusedSelectors,
      diagnosticCollection
    );

    const diagnostics = diagnosticCollection.get(document.uri);
    assert.strictEqual(diagnostics?.length, 0);

    diagnosticCollection.dispose();
    vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("reportUnusedSelector should not report CSS selectors in comments", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: ".unused-class-in-comment {} /* .unused-class-in-comment {} */",
    });
    const unusedSelectors = new Set([".unused-class-in-comment"]);
    const diagnosticCollection =
      vscode.languages.createDiagnosticCollection("css-sight");

    testable.highlighter.reportUnusedSelector(
      document,
      unusedSelectors,
      diagnosticCollection
    );

    const diagnostics = diagnosticCollection.get(document.uri);
    assert.strictEqual(
      diagnostics?.length,
      1,
      new TypeError("Inputs are not identical")
    );

    diagnosticCollection.dispose();
    vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });
});
