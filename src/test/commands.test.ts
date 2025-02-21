import { strict as assert } from "assert";
import * as vscode from "vscode";

import * as testable from "./testables";
import path from "path";

suite("Commands Test Suite", () => {
  const testWorkspacePath = path.join(__dirname, "./test-workspace");
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("css-sight");

  setup(() => {
    vscode.workspace.updateWorkspaceFolders(0, 0, {
      uri: vscode.Uri.file(testWorkspacePath),
      name: "Test Workspace",
    });

    // await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test("Should find CSS and HTML files in test workspace", async () => {
    const htmlFiles = await vscode.workspace.findFiles("**/*.html");
    const cssFiles = await vscode.workspace.findFiles("**/*.css");

    assert.equal(htmlFiles.length, 1, "Expected to find 1 HTML file");
    assert.equal(cssFiles.length, 2, "Expected to find 1 CSS file");

    const cssDocument = await vscode.workspace.openTextDocument(cssFiles[0]);
    assert.ok(
      cssDocument.getText().includes(".used-class"),
      "CSS file should contain '.used-class'"
    );
  });

  test("removeUnusedSelectorFunction should remove unused CSS selector", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: ".unused-class {} .used-class {}",
    });

    const range = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 13)
    );

    // await testable.commands.removeUnusedSelectorFunction(document, range);
    await vscode.commands.executeCommand(
      "css-sight.removeUnusedSelector",
      document,
      range
    );

    assert.equal(document.getText(), ".used-class {}");
  });

  test("removeAllUnusedSelectorsInFileFunction should remove all unused CSS selectors in file", async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    const htmlFiles = await vscode.workspace.findFiles("**/*.html");
    const cssFiles = await vscode.workspace.findFiles("**/*.css");
    const jsFiles = await vscode.workspace.findFiles("**/*.js");
    const jsxFiles = await vscode.workspace.findFiles("**/*.jsx");

    assert.equal(htmlFiles.length, 1);
    assert.equal(cssFiles.length, 2);
    assert.equal(jsFiles.length, 1);
    assert.equal(jsxFiles.length, 1);

    const cssUri = cssFiles.find((file) => file.fsPath.endsWith("style.css"));
    assert.ok(cssUri, "Expected to find 'style.css' file");

    let cssDocument = await vscode.workspace.openTextDocument(cssUri);

    await vscode.window.showTextDocument(cssDocument);

    await testable.commands.removeAllUnusedSelectorsInFileFunction();

    assert.equal(
      cssDocument.getText(),
      ".used-class {\r\n}\r\n/* .unused-class-in-comment {\r\n} */\r\n.used-class-jsx {\r\n}\r\n.used-class-js {\r\n}\r\n"
    );
  });

  test("removeAllUnusedSelectorsInWorkspaceFunction should remove all unused CSS selectors in workspace", async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    const htmlFiles = await vscode.workspace.findFiles("**/*.html");
    const cssFiles = await vscode.workspace.findFiles("**/*.css");
    const jsFiles = await vscode.workspace.findFiles("**/*.js");
    const jsxFiles = await vscode.workspace.findFiles("**/*.jsx");

    assert.equal(htmlFiles.length, 1);
    assert.equal(cssFiles.length, 2);
    assert.equal(jsFiles.length, 1);
    assert.equal(jsxFiles.length, 1);

    await testable.extractor.analyzeFiles(diagnosticCollection);

    cssFiles.forEach((cssFile) => {
      assert.strictEqual(diagnosticCollection.get(cssFile)?.length, 3);
    });

    await testable.commands.removeAllUnusedSelectorsInWorkspaceFunction();
    await testable.extractor.analyzeFiles(diagnosticCollection);

    cssFiles.forEach((cssFile) => {
      assert.strictEqual(diagnosticCollection.get(cssFile)?.length, 0);
    });

    diagnosticCollection.dispose();
  });
});
