import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  installExtensions: ["esbenp.prettier-vscode", "ecmel.vscode-html-css"],
  // workspaceFolder: "test-workspace",
});
