import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [solid()],
  base: process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/",
});
