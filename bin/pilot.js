#!/usr/bin/env node
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { main } = require('../dist/cli/index.cjs')

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
