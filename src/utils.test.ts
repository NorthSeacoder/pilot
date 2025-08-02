import { describe, test, expect } from 'vitest'
import { hello } from './utils.js'

describe('utils', () => {
  test('hello function', () => {
    expect(hello('world')).toBe('Hello, world!')
  })

  test('hello function with empty string', () => {
    expect(hello('')).toBe('Hello, !')
  })

  test('hello function with Chinese name', () => {
    expect(hello('世界')).toBe('Hello, 世界!')
  })
})
