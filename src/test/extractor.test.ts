import * as assert from "assert";
import * as vscode from "vscode";

import * as testable from "./testables";

suite("Extractor Test Suite", () => {
  test("extractCSSSelectors should return a set of CSS selectors", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: ".test-class {} #test-id {}",
    });
    const expectedSelectors = new Set([".test-class", "#test-id"]);

    const actualSelectors = await testable.extractor.extractAllSelectors(
      document.getText()
    );

    assert.deepStrictEqual(actualSelectors, expectedSelectors);
  });

  test("extractUsedSelectorsInHTML should return a set of used CSS selectors for HTML", () => {
    const fileContent = `<div class="test-class"><p id="test-id">test-class</p></div>`;
    const expectedSelectors = new Set([
      "html",
      "head",
      "body",
      ".test-class",
      "#test-id",
      "div",
      "p",
    ]);

    const actualSelectors =
      testable.extractor.extractSelectorsInHTML(fileContent);

    assert.deepStrictEqual(actualSelectors, expectedSelectors);
  });

  test("extractUsedSelectorsInJS should return a set of used CSS selectors for JS", () => {
    const fileContent = `
        document.getElementById("navbar");
        document.querySelector(".menu-item");
        element.classList.add("active", "hidden");
    `;
    const expectedSelectors = new Set([
      "#navbar",
      ".menu-item",
      ".active",
      ".hidden",
    ]);

    const actualSelectors =
      testable.extractor.extractSelectorsInJS(fileContent);

    assert.deepStrictEqual(actualSelectors, expectedSelectors);
  });

  test("extractUsedSelectorsInJSX should return a set of used CSS selectors for JSX", () => {
    const fileContent = `
        const App = () => {
            return <section id="hero" className="page-section main-content">
                <button className="btn large">Click</button>
            </section>;
        };
    `;

    const expectedSelectors = new Set([
      "section",
      "#hero",
      ".page-section",
      ".main-content",
      "button",
      ".btn",
      ".large",
    ]);

    const actualSelectors =
      testable.extractor.extractSelectorsInJSX(fileContent);

    assert.deepStrictEqual(actualSelectors, expectedSelectors);
  });

  test("extractUsedSelectors should ignore inline JavaScript", async () => {
    const fileContent = `<div onclick="alert('test')"><script>function test(){ "use strict"; console.log("test"); }</script><p id="test-id">test-class</p></div>`;
    const document = await vscode.workspace.openTextDocument({
      content: fileContent,
      language: "html",
    });

    const expectedSelectors = new Set([
      "#test-id",
      "div",
      "p",
      "script",
      "body",
      "head",
      "html",
    ]);

    const actualSelectors = testable.extractor.extractUsedSelectors(document);

    assert.deepStrictEqual(actualSelectors, expectedSelectors);
  });

  test("getUnusedSelectors should return a set of unused CSS selectors", async () => {
    const cssContent = `.unused-class {} #unused-id {} .used-class {} #used-id {}`;

    const htmlContent = `<div class="used-class"><p id="used-id">used-class</p></div>`;
    const document = await vscode.workspace.openTextDocument({
      content: htmlContent,
      language: "html",
    });

    const expectedSelectors = new Set([".unused-class", "#unused-id"]);

    const allSelectors = await testable.extractor.extractAllSelectors(
      cssContent
    );
    const usedSelectors = await testable.extractor.extractUsedSelectors(
      document
    );

    const actualSelectors = await testable.extractor.getUnusedSelectors(
      allSelectors,
      usedSelectors
    );

    assert.deepStrictEqual(actualSelectors, expectedSelectors);
  });
});
