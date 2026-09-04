import { describe, it, expect } from 'vitest'
import { normalizePrefix, normalizeBaseUrl, joinUrl } from '../src/normalize.ts'

describe('normalizePrefix', () => {
  it('空值与根路径归一为 /', () => {
    expect(normalizePrefix('')).toBe('/')
    expect(normalizePrefix('   ')).toBe('/')
    expect(normalizePrefix('/')).toBe('/')
  })

  it('补前导斜杠、去末尾斜杠', () => {
    expect(normalizePrefix('api')).toBe('/api')
    expect(normalizePrefix('/api')).toBe('/api')
    expect(normalizePrefix('/api/')).toBe('/api')
    expect(normalizePrefix('api/')).toBe('/api')
  })

  it('两端空白先 trim 再处理', () => {
    expect(normalizePrefix('  /api/  ')).toBe('/api')
  })

  it('多级路径保留内部斜杠，仅处理首尾', () => {
    expect(normalizePrefix('/api/v1/')).toBe('/api/v1')
  })
})

describe('normalizeBaseUrl', () => {
  it('空值原样返回', () => {
    expect(normalizeBaseUrl('')).toBe('')
    expect(normalizeBaseUrl('   ')).toBe('')
  })

  it('移除末尾斜杠（含多个）', () => {
    expect(normalizeBaseUrl('http://x.com')).toBe('http://x.com')
    expect(normalizeBaseUrl('http://x.com/')).toBe('http://x.com')
    expect(normalizeBaseUrl('http://x.com//')).toBe('http://x.com')
  })

  it('不处理内部斜杠', () => {
    expect(normalizeBaseUrl('http://x.com/a/')).toBe('http://x.com/a')
  })
})

describe('joinUrl', () => {
  it('baseUrl 与 path 拼接恰好一个斜杠', () => {
    expect(joinUrl('http://x.com', 'api')).toBe('http://x.com/api')
    expect(joinUrl('http://x.com/', 'api')).toBe('http://x.com/api')
    expect(joinUrl('http://x.com/', '/api')).toBe('http://x.com/api')
    expect(joinUrl('http://x.com', '/api')).toBe('http://x.com/api')
  })

  it('path 为 / 时返回 base 本身', () => {
    expect(joinUrl('http://x.com/', '/')).toBe('http://x.com')
  })

  it('base 为空时返回 path', () => {
    expect(joinUrl('', 'api')).toBe('api')
    expect(joinUrl('', '/api')).toBe('/api')
  })

  it('path 为空时返回 base', () => {
    expect(joinUrl('http://x.com', '')).toBe('http://x.com')
  })

  it('多级 path 拼接', () => {
    expect(joinUrl('http://x.com', 'api/v1/chat')).toBe('http://x.com/api/v1/chat')
  })
})
