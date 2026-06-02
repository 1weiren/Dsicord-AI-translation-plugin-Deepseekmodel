# AiTranslate · Discord AI 翻译插件（DeepSeek 模型）

一个 Vencord 插件，让 Discord 拥有 AI 翻译能力：

- 双击别人的消息 → 翻译成你设定的语言，再次双击关闭
- 自己输入时 → 输入框上方显示译文（边写边译），一键覆盖发送
- 支持中 / 英 / 日 / 韩 / 西 / 法 等语言互译
- 基于 **DeepSeek**：质量高、价格低（约 1 元 ≈ 50 万字）

作者：**Concom**

---

## 快速安装

| 平台 | 下载 | 步骤 |
|------|------|------|
| **Windows** | [AiTranslate-Discord.zip](https://github.com/1weiren/Dsicord-AI-translation-plugin-Deepseekmodel/releases/latest) | 解压 → 双击 `安装.bat` → 重启 Discord |
| **macOS** | [AiTranslate-Discord-Mac.tar.gz](https://github.com/1weiren/Dsicord-AI-translation-plugin-Deepseekmodel/releases/latest) | 解压 → 双击 `install.command` → 重启 Discord |

详细说明（含申请 API Key、使用、FAQ）在每个压缩包内的 **使用说明.txt**。

---

---

## 源码结构

```
src/
├── index.tsx                    # 插件入口（双击监听 + 右键菜单）
├── deepseek.ts                  # DeepSeek API 客户端
├── native.ts                    # Electron 主进程 fetch（带超时）
├── settings.ts                  # Vencord 设置定义
├── languages.ts                 # 支持语言列表
├── draft.ts                     # 输入框草稿操作
├── TranslateChatBarButton.tsx   # 输入框旁的「文A」按钮
├── LiveTranslatePanel.tsx       # 边写边译面板
└── TranslationView.tsx          # 消息下方译文展示
```

要本地编译：把 `src/` 复制到 Vencord 源码的 `src/userplugins/aiTranslate/`，然后 `pnpm build`，产物在 `Vencord/dist/`。

---

## 卸载

- Windows：分发包里的 `卸载.bat`
- macOS：分发包里的 `uninstall.command`

---

## License

GPL-3.0-or-later（继承 Vencord）。详见 [LICENSE](./LICENSE)。
