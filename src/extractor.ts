import * as vscode from "vscode";

import * as fs from "fs";
import postcss, { rule } from "postcss";
import { reportUnusedSelector } from "./highlighter";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import * as cheerio from "cheerio";

export function getFileContent(filePath: string): Set<string> {
  const cssContent = fs.readFileSync(filePath, "utf8");
  return extractAllSelectors(cssContent);
}

export function extractAllSelectors(cssContent: string) {
  const root = postcss.parse(cssContent);
  const selectorNames = new Set<string>();
  root.walkRules((rule) => {
    rule.selectors.forEach((selector) => selectorNames.add(selector));
  });

  return selectorNames;
}

export function extractSelectorsInHTML(fileContent: string) {
  try {
    const $ = cheerio.load(fileContent);
    const selectorNames = new Set<string>();

    $("*").each((_, element) => {
      const classes = $(element).attr("class");
      const ids = $(element).attr("id");
      const tags = (element as any).tagName;

      if (classes) {
        classes.split(" ").forEach((cls) => selectorNames.add("." + cls));
      }
      if (ids) {
        selectorNames.add("#" + ids);
      }
      if (tags) {
        selectorNames.add(tags);
      }
    });
    return selectorNames;
  }
  catch {
    return new Set<string>();
  }
}

export function extractSelectorsInJS(fileContent: string) {
  try {
    const ast = babelParser.parse(fileContent, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    const selectors = new Set<string>();

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.type === "MemberExpression") {
          const { object, property } = path.node.callee;

          // classList.add("btn")
          if (
            object.type === "MemberExpression" &&
            object.property.type === "Identifier" &&
            object.property.name === "classList" &&
            property.type === "Identifier" &&
            property.name === "add"
          ) {
            path.node.arguments.forEach((arg) => {
              if (arg.type === "StringLiteral") {
                selectors.add(`.${arg.value}`);
              }
            });
          }

          // document.getElementById("header")
          if (
            object.type === "Identifier" &&
            object.name === "document" &&
            property.type === "Identifier" &&
            property.name === "getElementById"
          ) {
            const arg = path.node.arguments[0];
            if (arg && arg.type === "StringLiteral") {
              selectors.add(`#${arg.value}`);
            }
          }

          // document.querySelector(".btn")
          if (
            object.type === "Identifier" &&
            object.name === "document" &&
            property.type === "Identifier" &&
            property.name === "querySelector"
          ) {
            const arg = path.node.arguments[0];
            if (arg && arg.type === "StringLiteral") {
              selectors.add(arg.value); // Keep raw selector (.btn, #header, etc.)
            }
          }
        }
      },
    });

    return selectors;
  } catch {
    return new Set<string>();
  }
}

export function extractSelectorsInJSX(code: string): Set<string> {
  try {
    const ast = babelParser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });

    const selectors = new Set<string>();

    traverse(ast, {
      JSXOpeningElement(path) {
        // Get tag name (e.g., div, button)
        if (path.node.name.type === "JSXIdentifier") {
          selectors.add(path.node.name.name);
        }

        // Extract className="..."
        path.node.attributes.forEach((attr) => {
          if (attr.type === "JSXAttribute" && attr.name.name === "className") {
            const value = attr.value;
            if (value && value.type === "StringLiteral") {
              value.value
                .split(/\s+/)
                .forEach((cls) => selectors.add(`.${cls}`));
            }
          }

          // Extract id="..."
          if (attr.type === "JSXAttribute" && attr.name.name === "id") {
            const value = attr.value;
            if (value && value.type === "StringLiteral") {
              selectors.add(`#${value.value}`);
            }
          }
        });
      },
    });
    return selectors;
  } catch {
    return new Set<string>();
  }
}

export function extractUsedSelectors(
  document: vscode.TextDocument
): Set<string> {
  let selectors = new Set<string>();
  const text = document.getText();

  if (document.languageId === "html") {
    selectors = extractSelectorsInHTML(text);
  } else if (
    document.languageId === "javascript" ||
    document.languageId === "typescript"
  ) {
    selectors = extractSelectorsInJS(text);
  } else if (
    document.languageId === "javascriptreact" ||
    document.languageId === "typescriptreact"
  ) {
    selectors = extractSelectorsInJSX(text);
  } else {
    vscode.window.showErrorMessage("Unsupported file type.");
    return selectors;
  }
  return selectors;
}

export async function getUnusedSelectors(
  cssSelectors: Set<string>,
  usedSelectors: Set<string>
) {
  return new Set(
    [...cssSelectors].filter(
      (cls) => !usedSelectors.has(cls) && !cls.match(/[><:% ]|(.+[.#].+)/)
    )
  );
}

export async function getGitIgnore() {
  return await vscode.workspace.findFiles(".gitignore");
}

export async function buildIgnoreGlob() {
  // use gitignore to build glob string like **/node_modules/**
  const gitIgnore = await getGitIgnore();
  if (gitIgnore.length === 0) {
    return "**/node_modules/**";
  }
  const gitIgnoreContent = fs.readFileSync(gitIgnore[0].fsPath, "utf8");
  const ignoreLines = gitIgnoreContent.split("\n");
  const ignoreGlob = ignoreLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      if (line.startsWith("/")) {
        line = line.substring(1);
      }
      if (line.endsWith("/")) {
        line = line.substring(0, line.length - 1);
      }
      return `**/${line}/**`;
    })
    .join(",");
  return `**/{${ignoreGlob}}`;
}

export async function getCSSFiles() {
  return await vscode.workspace.findFiles("**/*.css", await buildIgnoreGlob());
}

export async function getOtherFiles() {
  const files = await vscode.workspace.findFiles("**/*.{html,js,ts,jsx,tsx}", await buildIgnoreGlob());
  return files.filter((uri) => uri.scheme === "file");
}

export function getAllCSSSelectors(cssFiles: vscode.Uri[]) {
  const cssSelectors = new Set<string>();

  for (const file of cssFiles) {
    const selectors = getFileContent(file.fsPath);
    selectors.forEach((cls) => cssSelectors.add(cls));
  }
  return cssSelectors;
}

export async function getUsedSelectors(files: vscode.Uri[]) {
  const usedSelectors = new Set<string>();

  for (const file of files) {
    const document = await vscode.workspace.openTextDocument(file);
    const selectors = extractUsedSelectors(document);
    selectors.forEach((cls) => usedSelectors.add(cls));
  }

  return usedSelectors;
}

export async function analyzeFiles(
  diagnosticCollection: vscode.DiagnosticCollection
) {
  const cssFiles = await getCSSFiles();
  const otherFiles = await getOtherFiles();

  const allSelectors = getAllCSSSelectors(cssFiles);
  const usedSelectors = await getUsedSelectors(otherFiles);

  const unusedSelectors = await getUnusedSelectors(allSelectors, usedSelectors);

  for (const file of cssFiles) {
    const document = await vscode.workspace.openTextDocument(file);
    reportUnusedSelector(document, unusedSelectors, diagnosticCollection);
  }
}
