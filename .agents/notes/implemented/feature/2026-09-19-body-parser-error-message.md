# Agent Note: body-parser 解析失败错误文案转译

Status: implemented

## Problem

Nest 默认 JSON body-parser 解析失败时，把 V8 `JSON.parse` 的英文原文（如 `Expected ',' or '}' after property value in JSON at position 35`）直接透给客户端 `message`。错误信封的 `code` 契约正常（`BAD_REQUEST`），但 `message` 是面向人的文案，不应暴露解析器内部细节；Apifox 调试登录端点时实际踩到（用户发送了含全角逗号的 body）。

## Decision/Proposal

- 新增 [body-parser.middleware.ts](../../../apps/server/src/main/body-parser.middleware.ts)：`main.ts` 关闭默认 bodyParser（`bodyParser: false`），用 `registerBodyParsers(app)` 重注册 json + urlencoded（limit 与默认一致 100kb）。
- 解析失败按 body-parser 文档化契约 `type: 'entity.parse.failed'` 精准识别，转译为 `{ code: 'BAD_REQUEST', message: '请求体不是合法的 JSON' }`；其余解析错误（实体过大等）原样上抛。
- `code` 契约不变；[e2e-app.ts](../../../apps/server/test/e2e-app.ts) 镜像同一注册（既有约定：main.ts 全局设置两处同步）。

## Alternatives considered

- **AllExceptionsFilter 按 message 文本模式识别解析错误**：拒绝——`JSON.parse` 报错文案跨 Node 版本会变（"Unexpected token" vs "Expected ',' or '}'"），模式匹配天然脆弱。
- **Filter 对所有裸字符串 400 统一重写文案**：拒绝——会把业务代码未来抛的合法 `BadRequestException('...')` 文案一并吞掉；且违反"message 是人看的、来源应可信"的最小干预原则。
- **维持现状（不转译）**：拒绝——`message` 直接暴露英文技术细节，是本次用户实际报告的毛刺。

## Consequences

- server 新增运行时依赖 `express`（catalog:backend，^5.2.1 与 @nestjs/platform-express 的 peer 对齐）——此前仅 type-only 导入（编译期擦除），自定义 bodyParser 必须运行时导入 `json`/`urlencoded` 工厂，这是 Nest 官方自定义姿势的必要代价。
- e2e 新增 malformed JSON 用例钉住行为（全角逗号 body → 400 + 固定中文文案）。
