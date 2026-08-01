/**
 * Commitlint 配置。
 *
 * 规则来源：.trae/rules/git-commit-message.md
 * 格式：<type>(<scope>): <subject>
 *
 * scope 为推荐项而非强制项：规则文件列出推荐枚举（包名 / turbo / deps / repo / docs），
 * 但 commitlint 不拦截未命中枚举的 scope，避免每次提交被 scope 卡住。
 */
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
    // scope 可选且不强制枚举（scope-enum 交由规则文件推荐，配置不拦截）
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [0],
    'subject-full-stop': [0],
    'header-max-length': [2, 'always', 72],
    'subject-max-length': [2, 'always', 72],
    'body-leading-blank': [1, 'always'],
  },
}
