import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { TARGET_LANGUAGES } from "./languages";

export const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "DeepSeek API Key（sk- 开头）。去 https://platform.deepseek.com 注册并创建。",
        default: "",
    },
    baseUrl: {
        type: OptionType.STRING,
        description: "API Base URL（默认官网，一般不用改）",
        default: "https://api.deepseek.com",
    },
    model: {
        type: OptionType.STRING,
        description: "模型名（默认 deepseek-v4-pro）",
        default: "deepseek-v4-pro",
    },
    defaultTargetLanguage: {
        type: OptionType.SELECT,
        description: "【发送侧】边写边译的目标语言（也是文A 按钮快捷换语言时的初始值）",
        options: TARGET_LANGUAGES.map((l, i) => ({
            label: l.label,
            value: l.code,
            default: i === 1,
        })),
    },
    receiveTargetLanguage: {
        type: OptionType.SELECT,
        description: "【接收侧】双击别人消息时翻译的目标语言（右键菜单可快速换）",
        options: TARGET_LANGUAGES.map((l, i) => ({
            label: l.label,
            value: l.code,
            default: i === 0,
        })),
    },
    liveTranslate: {
        type: OptionType.BOOLEAN,
        description: "开启边写边译：输入时在输入框上方显示译文，右侧可一键覆盖",
        default: true,
    },
    allowSelfTranslate: {
        type: OptionType.BOOLEAN,
        description: "允许双击翻译自己发送的消息（默认只翻译他人消息）",
        default: false,
    },
});
