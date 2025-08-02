import { defineConfig } from 'tsup'

export default defineConfig({
  entryPoints: ['src/index.ts', 'src/cli/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
  minify: true,
  treeshake: true,
  cjsInterop: true,
  // 复制模板文件
  publicDir: false,
  onSuccess: async () => {
    // 手动复制模板文件
    await import('fs-extra').then(async (fs) => {
      await fs.copy('src/modules/testing/templates/testing-strategy.yaml', 'dist/modules/testing/templates/testing-strategy.yaml')
      await fs.copy('src/modules/testing/templates/vitest.config.template', 'dist/modules/testing/templates/vitest.config.template')
      await fs.copy('src/modules/testing/templates/test-setup.template', 'dist/modules/testing/templates/test-setup.template')
    })
  },
  // metafile: true,
})
