// 模型目录：模型后端接入前的前端静态登记（TaskComposer 模型选择共用），
// 接入后替换为 server 接口数据；条目按需增删
export interface ModelEntry {
  id: string
  name: string
  isDefault: boolean
}

export const MODEL_LIST: ModelEntry[] = [
  { id: 'auto', name: 'Auto', isDefault: true },
  { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', isDefault: false },
]
