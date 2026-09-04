/**
 * 聊天 UI 类型。已升格至 `@growth-os/types`（迭代计划 2.3：会话事件词汇表的
 * Message 即模型可见历史，ChatMessage 是聊天组件消费的窄角色子集），
 * 此处按 UI 侧引用习惯转发，组件代码无需感知 packages 路径。
 */
export type { ChatMessage } from '@growth-os/types'
