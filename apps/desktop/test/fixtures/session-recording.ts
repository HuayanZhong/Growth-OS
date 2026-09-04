import type { SessionEvent } from '@growth-os/types'

/**
 * 会话录制 fixture（迭代计划 1.2 P0）：一轮带工具调用的完整 agent turn（事件升序）。
 * 这是录制-回放的 fixture 格式——阶段三 sessions 域的事件查询返回同构数据；
 * 更换/追加真实录制产物只需替换本文件。
 */
export const sessionRecordingFixture: SessionEvent[] = [
  {
    id: 'evt_001',
    type: 'agent_created',
    timestamp: 1735689600000,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { name: 'Growth OS 助手' },
  },
  {
    id: 'evt_002',
    type: 'turn_start',
    timestamp: 1735689600001,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { trigger: 'user' },
  },
  {
    id: 'evt_003',
    type: 'system_prompt',
    timestamp: 1735689600002,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { content: '你是 Growth OS 助手，回答保持简洁。' },
  },
  {
    id: 'evt_004',
    type: 'context_injection',
    timestamp: 1735689600003,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { content: '当前时间：2025-01-01 08:00 (Asia/Shanghai)' },
  },
  {
    id: 'evt_005',
    type: 'user_message',
    timestamp: 1735689600004,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { content: '帮我查一下今天的日期' },
  },
  {
    id: 'evt_006',
    type: 'step_start',
    timestamp: 1735689600005,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { step: 1 },
  },
  {
    id: 'evt_007',
    type: 'assistant_message',
    timestamp: 1735689600006,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: {
      content: '',
      toolCalls: [
        { id: 'call_001', name: 'get_current_time', arguments: '{"timezone":"Asia/Shanghai"}' },
      ],
    },
  },
  {
    id: 'evt_008',
    type: 'tool_call',
    timestamp: 1735689600007,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: {
      callId: 'call_001',
      name: 'get_current_time',
      arguments: '{"timezone":"Asia/Shanghai"}',
    },
  },
  {
    id: 'evt_009',
    type: 'tool_result',
    timestamp: 1735689600008,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { callId: 'call_001', content: '2025-01-01' },
  },
  {
    id: 'evt_010',
    type: 'step_end',
    timestamp: 1735689600009,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { step: 1 },
  },
  {
    id: 'evt_011',
    type: 'assistant_message',
    timestamp: 1735689600010,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { content: '今天是 2025-01-01。' },
  },
  {
    id: 'evt_012',
    type: 'turn_end',
    timestamp: 1735689600011,
    sessionId: 'sess_replay_001',
    agentId: 'agent_001',
    payload: { outcome: 'completed' },
  },
]
