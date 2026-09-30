// 模型目录：Auto 单档——实际模型由服务端按请求内容路由（Auto 不发具体模型名，
// 服务端注册表统一管理模型与视觉能力）。接入手动选模型时在此追加条目，
// 并在服务端 model-provider 注册表同步标注能力。
export interface ModelEntry {
  id: string
  name: string
  isDefault: boolean
}

export const MODEL_LIST: ModelEntry[] = [
  { id: 'auto', name: 'Auto', isDefault: true },
  { id: 'deepseek-flash', name: 'DeepSeek', isDefault: false },
]
