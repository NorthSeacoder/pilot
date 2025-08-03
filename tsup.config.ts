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
    // 手动复制模板文件和目录结构
    await import('fs-extra').then(async (fs) => {
      // 递归复制整个templates目录
      await fs.copy('src/modules/testing/templates', 'dist/modules/testing/templates')
    })
  },
  // metafile: true,
})
