import type { SessionEvent } from '@growth-os/types'

/**
 * 录制格式样例：一轮带工具调用的会话（事件升序），供回放测试注入。
 * 即录制-回放测试的 fixture 格式（迭代计划 1.2 / 2.3）。
 */
export const recordedSessionFixture: SessionEvent[] = [
  {
    id: 'evt_001',
    type: 'turn_start',
    timestamp: 1735689600000,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { trigger: 'user' },
  },
  {
    id: 'evt_002',
    type: 'system_prompt',
    timestamp: 1735689600001,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { content: '你是 Growth OS 助手，回答保持简洁。' },
  },
  {
    id: 'evt_003',
    type: 'context_injection',
    timestamp: 1735689600002,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { content: '当前时间：2025-01-01 08:00 (Asia/Shanghai)' },
  },
  {
    id: 'evt_004',
    type: 'user_message',
    timestamp: 1735689600003,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { content: '帮我查一下今天的日期' },
  },
  {
    id: 'evt_005',
    type: 'step_start',
    timestamp: 1735689600004,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { step: 1 },
  },
  {
    id: 'evt_006',
    type: 'assistant_message',
    timestamp: 1735689600005,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: {
      content: '',
      toolCalls: [
        { id: 'call_001', name: 'get_current_time', arguments: '{"timezone":"Asia/Shanghai"}' },
      ],
    },
  },
  {
    id: 'evt_007',
    type: 'tool_call',
    timestamp: 1735689600006,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { callId: 'call_002', name: 'search_web', arguments: '{"query":"今天日期"}' },
  },
  {
    id: 'evt_008',
    type: 'tool_result',
    timestamp: 1735689600007,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { callId: 'call_002', content: '2025-01-01' },
  },
  {
    id: 'evt_009',
    type: 'condensation',
    timestamp: 1735689600008,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { removedEvents: 0 },
  },
  {
    id: 'evt_010',
    type: 'assistant_message',
    timestamp: 1735689600009,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { content: '今天是 2025-01-01。' },
  },
  {
    id: 'evt_011',
    type: 'agent_status_changed',
    timestamp: 1735689600010,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { status: 'idle' },
  },
  {
    id: 'evt_012',
    type: 'turn_end',
    timestamp: 1735689600011,
    sessionId: 'sess_recorded_001',
    agentId: 'agent_001',
    payload: { steps: 1 },
  },
]
