// .vue 单文件组件模块声明（供 vue-tsc 解析类型；相对导入 .vue 需要此 shim）
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
