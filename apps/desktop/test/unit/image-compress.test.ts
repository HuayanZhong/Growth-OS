import { describe, expect, it } from 'vitest'
import {
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  checkImageEntry,
  computeTargetSize,
  generateImageName,
} from '../../app/utils/image-compress'

/**
 * 附件图片压缩管线的纯逻辑（node 环境）：入口体检、等比尺寸计算、
 * 生成文件名。浏览器路径（解码/画布/toBlob）不在此覆盖，由端到端
 * 手动验证承担（见 tasks 5.1）。
 */

describe('checkImageEntry（入口体检）', () => {
  it.each([...SUPPORTED_IMAGE_TYPES])('白名单格式 %s 通过', (type) => {
    expect(checkImageEntry({ size: 1024, type })).toBeNull()
  })

  it('白名单外格式拒绝（unsupported_type）', () => {
    expect(checkImageEntry({ size: 1024, type: 'image/bmp' })).toBe('unsupported_type')
    expect(checkImageEntry({ size: 1024, type: 'application/pdf' })).toBe('unsupported_type')
    expect(checkImageEntry({ size: 1024, type: '' })).toBe('unsupported_type')
  })

  it('超过大小上限拒绝（too_large）', () => {
    expect(checkImageEntry({ size: MAX_IMAGE_BYTES + 1, type: 'image/png' })).toBe('too_large')
  })

  it('恰好等于大小上限通过（边界）', () => {
    expect(checkImageEntry({ size: MAX_IMAGE_BYTES, type: 'image/png' })).toBeNull()
  })
})

describe('computeTargetSize（等比尺寸）', () => {
  it('横图长边压到 1024，短边等比', () => {
    expect(computeTargetSize(4096, 2048)).toEqual({ width: 1024, height: 512 })
  })

  it('竖图长边压到 1024，短边等比', () => {
    expect(computeTargetSize(1080, 2160)).toEqual({ width: 512, height: 1024 })
  })

  it('小图不放大（原样返回）', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 })
    expect(computeTargetSize(1024, 768)).toEqual({ width: 1024, height: 768 })
  })

  it('正方形直接压到 1024', () => {
    expect(computeTargetSize(4096, 4096)).toEqual({ width: 1024, height: 1024 })
  })

  it('极端长图取整后不小于 1px', () => {
    const target = computeTargetSize(40000, 100)
    expect(target.width).toBe(1024)
    expect(target.height).toBeGreaterThanOrEqual(1)
  })

  it('自定义 maxEdge 生效', () => {
    expect(computeTargetSize(2000, 1000, 500)).toEqual({ width: 500, height: 250 })
  })
})

describe('generateImageName（剪贴板图片名）', () => {
  it('以 image_<时间戳> 生成', () => {
    expect(generateImageName(1790584958491)).toBe('image_1790584958491')
  })

  it('默认取当前时间', () => {
    expect(generateImageName()).toMatch(/^image_\d+$/)
  })
})
