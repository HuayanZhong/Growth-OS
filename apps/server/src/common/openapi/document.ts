/**
 * OpenAPI 文档元信息。main.ts 与 scripts/export-openapi.ts 共用同一份，
 * 避免 DocumentBuilder 参数双处维护漂移；路由前缀/版本（api + URI v1）由
 * 两个入口各自的 setGlobalPrefix/enableVersioning 保持一致。
 */
import { DocumentBuilder } from '@nestjs/swagger'
import type { OpenAPIObject } from '@nestjs/swagger'

/** DocumentBuilder.build() 不含 paths（createDocument 时才补全路由）。 */
export function buildOpenApiConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Growth OS API')
    .setDescription(
      [
        'Growth OS 后端服务 API 文档（自动生成）。',
        '',
        '**响应信封**：成功响应统一为 `{ data: T }`（204 除外）；失败统一为 `ApiErrorEnvelope { code, message, details? }`，`code` 为机器可读错误码，前端按码分支处理。',
        '',
        '**鉴权**：除 health 域外，所有端点均需 Bearer JWT（Supabase Auth access token）——点击右上角 Authorize 输入 token。',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '认证域：当前登录用户')
    .addTag('agents', 'Agent 编排单元（人设 + 模型 + 工具绑定）CRUD')
    .addTag('sessions', '会话生命周期、事件日志、消息投影与回合执行')
    .addTag('skills', 'Skill 技能包注册与目录')
    .addTag('projects', '项目聚合根：串联 agents / sessions / skills / files')
    .addTag('files', '文件元数据与生命周期（骨架：写路径 501）')
    .addTag('audit', '审计日志只读查询')
    .addTag('health', '健康探针（免鉴权、免限流）')
    .build()
}
