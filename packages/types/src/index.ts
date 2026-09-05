// @growth-os/types 包入口：整个 monorepo 的类型分发
// 包内只放跨包共享的类型契约（zod schema / IPC 契约等），不承载运行逻辑

export { z } from 'zod'

export { loginSchema, registerSchema } from './auth.ts'
export type { LoginInput, RegisterInput, AuthApiMap } from './auth.ts'

export type { ApiErrorEnvelope } from './api/error-envelope.ts'

// ---- HTTP API 契约基建（迭代计划 2.6）----
export type {
  HttpMethod,
  ApiSuccess,
  HttpEndpoint,
  AnyHttpEndpoint,
  EndpointRequest,
  EndpointResponse,
  EndpointMethod,
} from './api/http.ts'

export type { Agent, CreateAgentInput, UpdateAgentInput, AgentsApiMap } from './api/agents.ts'
export type {
  SessionRecord,
  CreateSessionInput,
  UpdateSessionInput,
  SessionsApiMap,
} from './api/sessions.ts'
export type { Skill, CreateSkillInput, UpdateSkillInput, SkillsApiMap } from './api/skills.ts'
export type { FileRecord, FileUploadInput, FilesApiMap } from './api/files.ts'
export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectsApiMap,
} from './api/projects.ts'
export type { HealthApiMap } from './api/health.ts'

export type {
  MessageRole,
  ToolCallRef,
  Message,
  ChatMessage,
  MessageEventType,
  BookkeepingEventType,
  SessionEventType,
  UserMessagePayload,
  AssistantMessagePayload,
  ToolCallPayload,
  ToolResultPayload,
  SystemPromptPayload,
  ContextInjectionPayload,
  MessageEventPayloadMap,
  SessionEvent,
  TypedSessionEvent,
  EventFilter,
  SessionEventLog,
} from './events/session.ts'

export {
  type IpcChannelMap,
  type IpcChannelName,
  type IpcRequest,
  type IpcResponse,
  type DesktopAPI,
  type UpdateCheckResult,
} from './utils/ipc-channels.ts'
