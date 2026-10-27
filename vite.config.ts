import { defineConfig, type Plugin } from "vite"
import solid from "vite-plugin-solid"

const BUILD_ID = Date.now().toString(36)

const versionFile = (): Plugin => ({
  name: "emit-version-json",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ id: BUILD_ID }) })
  },
})

export default defineConfig({
  plugins: [solid(), versionFile()],
  base: "/",
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
})
