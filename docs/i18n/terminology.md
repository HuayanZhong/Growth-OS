# Terminology

Terminology-guided translation table for bilingual docs. Product names, tool names, and canonical terms stay in English; this table fixes the translation for the rest.

| English                                                      | 中文                   | Notes                           |
| ------------------------------------------------------------ | ---------------------- | ------------------------------- |
| Growth OS                                                    | Growth OS              | product name, never translated  |
| desktop shell / desktop app                                  | 桌面壳 / 桌面端        |                                 |
| main process                                                 | 主进程                 | Electron                        |
| preload script                                               | preload 脚本           |                                 |
| renderer                                                     | 渲染进程               |                                 |
| IPC channel                                                  | IPC 通道               |                                 |
| secure bridge                                                | 安全桥接               | contextBridge                   |
| shared library / package                                     | 共享库 / 包            | pnpm workspace package          |
| leaf package                                                 | 叶子包                 | no dependents                   |
| barrel export                                                | barrel 导出            | `src/index.ts`                  |
| dependency graph / topology                                  | 依赖图 / 拓扑          |                                 |
| catalog (`catalog:*`)                                        | pnpm catalog           |                                 |
| design system                                                | 设计系统               |                                 |
| semantic color token                                         | 语义色 token           |                                 |
| class passthrough / `cn()` merge                             | 类透传 / `cn()` 合并   |                                 |
| entity                                                       | 实体                   | MikroORM                        |
| migration                                                    | 迁移                   |                                 |
| seeder                                                       | 种子（数据）           | SeedManager                     |
| metadata provider                                            | 元数据提供器           | TsMorphMetadataProvider         |
| session pooler / direct connection / transaction pooler      | 会话池 / 直连 / 事务池 | Supabase 连接方式               |
| Supabase                                                     | Supabase               | never translated                |
| Nuxt / Vue / NestJS / MikroORM / Electron / Turborepo / pnpm | 同左                   | tool names, never translated    |
| thin pointer                                                 | 薄指针                 | CLAUDE.md                       |
| single source of truth                                       | 单一真相源             |                                 |
| Agent Note                                                   | Agent Note             | never translated                |
| detail doc                                                   | 详情文档               | tier below the architecture map |
| tier taxonomy                                                | 分层体系               | docs/AGENTS.md                  |
| doc gate                                                     | 文档门禁               | verify:docs                     |
| known limitation                                             | 已知限制               | README section                  |
| working tree / workspace                                     | 工作区                 |                                 |
| repo verification suite                                      | 仓库验证套件           | test → typecheck → lint         |
