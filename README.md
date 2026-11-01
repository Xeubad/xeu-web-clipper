# Xeu Article Clipper

Chrome / Edge 剪藏扩展：把当前网页正文提取成 Markdown，直接写入 Obsidian vault 的
`content/原始资料/文章/`（或你配置的任意子目录）。

参考了 Obsidian Web Clipper 的核心逻辑：

```
Readability 提取正文 → Turndown 转 Markdown → 模板变量渲染 → 写入目录
```

## 安装

```bash
cd tools/web-clipper
pnpm install
pnpm build
```

然后在浏览器加载：

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 打开「开发者模式」
3. 「加载已解压的扩展程序」→ 选择 `tools/web-clipper/dist`

> `dist/` 是构建产物，已在根 `.gitignore` 中忽略；改源码后重新 `pnpm build`。

## 首次配置

点扩展图标 → 右上角「设置」：

1. 点「选择 content 目录」，选项目里的 `content/`（只选一次，句柄会记住）
2. 确认子目录模板，默认 `原始资料/文章`
3. 按需改文件名模板、标签、冲突策略、frontmatter 模板
4. 保存设置

目录授权丢失时，保存会重新弹一次授权，点允许即可。

## 使用

1. 在文章页点扩展图标
2. 等正文提取完成，检查标题/作者/日期/标签
3. 点「保存到 content」
4. 文件直接出现在 `content/原始资料/文章/`，Obsidian 立刻可见

没有目录权限时可以点「下载 .md」导出到浏览器下载目录。

## 配置项

| 配置 | 说明 | 默认 |
|---|---|---|
| 子目录模板 | 相对 `content/` 的路径，支持 `/` 分层 | `原始资料/文章` |
| 文件名模板 | 生成 `.md` 文件名，非法字符自动替换 | `{{title}}` |
| 重名处理 | 自动加 `-2` / 覆盖 / 跳过 | 自动加 `-2` |
| 提取方式 | Readability 正文 / 选中内容 | 正文 |
| 默认标签 | 逗号分隔 | `clippings` |
| 脱敏 | 内网 IP、密码字段替换为 `x` | 开启 |
| Frontmatter 模板 | 完全可编辑 | 与现有剪藏一致 |

## 模板变量

```
{{title}} {{title_yaml}}
{{url}} {{url_yaml}}
{{author}} {{author_yaml}}
{{published}} {{published_yaml}}
{{description}} {{description_yaml}}
{{site}} {{site_yaml}} {{host}}
{{date}} {{time}} {{year}} {{month}} {{day}}
{{tags}} {{tags_inline}} {{tags_yaml}}
{{content}}
```

带 `_yaml` 的变量会自动转义引号和换行；默认模板使用它们。`{{content}}` 是正文位置。

路径/文件名模板也可以使用这些变量，例如：

- 子目录：`原始资料/文章/{{year}}`
- 文件名：`{{date}}-{{title}}`

## 权限与安全

只申请：

- `activeTab` / `scripting`：点击图标时提取当前页
- `storage`：保存设置
- `downloads`：下载兜底

不需要「读取所有网站」的常驻权限，也不会把内容发送到任何服务器；所有解析和写入都在本地完成。

## 已知限制

- 只支持 Chrome / Edge（依赖 File System Access API）
- 图片保留远程 URL，不下载到本地
- 特殊页面（`chrome://`、扩展商店等）无法注入脚本
- 登录墙/付费墙页面只能提取当前能看到的正文，或改用「选中内容」模式

## 开发

```bash
pnpm watch   # 改 src/ 后自动重建
pnpm test    # 用 linkedom 跑一遍提取 → Markdown 的单测
```

`src/` 结构：

```
content.js   Readability + Turndown，注入到页面
popup.*      预览、编辑、保存
options.*    目录选择与模板配置
lib/         settings / template / path / fs / sanitize
```
