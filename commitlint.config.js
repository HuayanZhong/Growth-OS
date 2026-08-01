/**
 * Commitlint 配置。
 *
 * 规则来源：.trae/rules/git-commit-message.md
 * 格式：<type>(<scope>): <subject>
 */
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * 动态扫描 monorepo 目录生成 scope 列表。
 * 新增包时自动纳入，无需手动维护此配置。
 */
function getPackageScopes(dir) {
  try {
    return readdirSync(join(rootDir, dir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

const scopes = [
  ...getPackageScopes('apps'),
  ...getPackageScopes('packages'),
  ...getPackageScopes('tooling'),
  // 非目录型 scope
  'turbo', // turbo.json
  'deps', // 根依赖或统一版本升级
  'repo', // 仓库级配置（根目录文件）
  'docs', // docs/
]

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'build',
        'chore',
        'ci',
        'docs',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'scope-enum': [2, 'always', scopes],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [0],
    'subject-full-stop': [0],
    'header-max-length': [2, 'always', 72],
    'subject-max-length': [2, 'always', 72],
    'body-leading-blank': [1, 'always'],
  },
}
