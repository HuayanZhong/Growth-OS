---
alwaysApply: false
description: 字体集成规则（Tailwind CSS v4 + Google Fonts）：品牌/艺术字体本地打包 woff2 禁 CDN；中文字体按 unicode-range 分片按需加载；font-display: swap + 回退栈防护；仅 400 字重的字体加 [font-synthesis:none]；字体文件按字体分子目录存放；语义令牌经 @theme 暴露。新增字体、替换字体、处理字体加载不出来时使用。
---

# 字体规范（本地化 + 按需加载 + 加载防护）

**适用场景**：引入品牌/艺术字体、替换字体、排查字体加载失败。

**要点**：

1. **本地打包，禁止 CDN**：品牌字体一律以 woff2 文件放 `src/assets/fonts/<font-name>/`，`@font-face` 的 `src` 相对 styles 目录引用（`url('../assets/fonts/...')`），严禁保留 `fonts.googleapis.com` / `fonts.gstatic.com` 外链——桌面端必须离线可用。漏替换的 CDN 外链会导致浏览器 font error 且无法离线回退。
2. **中文字体按 unicode-range 分片，禁止合并单文件**：中文艺术体从 Google Fonts 抓取时保留原始分片结构（92+ 个 woff2 + latin 分片），浏览器按字符集按需加载（实测标题"欢迎回来"仅请求 3 个分片）；合并成全量单文件会使单个字体体积数十 MB，违背按需加载。
3. **加载防护三件套，缺一不可**：
   - `font-display: swap`：字体加载中先显示回退字体，不阻塞渲染。
   - `font-family` 回退栈：语义令牌中目标字体后跟回退链，如 `'Caveat', 'ZCOOL QingKe HuangYou', ui-sans-serif, system-ui, sans-serif`。
   - 本地打包：无 CDN 即无加载失败路径。
4. **仅 400 字重的字体加 `[font-synthesis:none]`**（如 ZCOOL 庆科黄油体）：禁用浏览器合成加粗，避免无对应字重时笔画拉伸变形；variable 字体（如 Caveat 400-700）正常使用 `font-bold`。
5. **语义令牌经 `@theme` 暴露**：在 UI 包 `src/styles/main.css` 声明 `--font-brand` 生成 `font-brand` 工具类，业务代码只引用工具类，不写具体字体名（颜色令牌规则见 [colors.md](colors.md)）。
6. **字体文件按字体分子目录**：`src/assets/fonts/<font-name>/<file>.woff2`（如 `fonts/caveat/`、`fonts/zcool/`），禁止多字体平铺在一个目录。
7. **改动字体文件后同步验证**：移动/改名字体文件时，必须同步更新所有 `@font-face` 的 `src` 路径，并重新生产构建确认字体仍进产物。

**示例**：

```css
@font-face {
  font-family: 'ZCOOL QingKe HuangYou';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/zcool/zcool-5.woff2') format('woff2');
  unicode-range: /* Google Fonts 原始分片，原样保留 */;
}

@theme {
  --font-brand: 'Caveat', 'ZCOOL QingKe HuangYou', ui-sans-serif, system-ui, sans-serif;
}
```

```vue
<h1 class="font-brand text-2xl tracking-tight text-base-content [font-synthesis:none]">欢迎回来</h1>
```

**验证**：

1. `rg -n 'fonts\.googleapis\.com|fonts\.gstatic\.com' packages/ui` 无匹配（无外链残留）。
2. 生产构建成功，产物 `_nuxt/` 下 woff2 全部带哈希（含 zcool-* 分片与 latin）。
3. 浏览器 Network 面板：无 font error；只加载页面实际用到的字符分片（而非全部字体）。
