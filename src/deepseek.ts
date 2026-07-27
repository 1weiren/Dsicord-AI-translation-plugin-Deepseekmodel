import { PluginNative } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import { settings } from "./settings";

const Native = VencordNative.pluginHelpers.AiTranslate as PluginNative<typeof import("./native")>;

export async function translateWithDeepSeek(text: string, targetLang: string): Promise<string> {
    const { apiKey, baseUrl, model } = settings.store;
    if (!apiKey) {
        showToast("请先在 Vencord 设置中配置 DeepSeek API Key", Toasts.Type.FAILURE);
        throw new Error("API key not configured");
    }

    const body = JSON.stringify({
        model,
        messages: [
            {
                role: "system",
                content: `You are a professional translator. Translate the user's text into ${targetLang}. Output only the translation, no explanations, no quotes, no additional text. Follow the punctuation of the original text strictly for sentence boundaries — do not merge or split sentences differently from the source. Preserve all Markdown formatting exactly as-is, including **bold**, *italic*, __underline__, ~~strikethrough~~, \`inline code\`, \`\`\`code blocks\`\`\`, ||spoiler||, > blockquotes, and list markers. Keep all line breaks and blank lines unchanged.`,
            },
            { role: "user", content: text },
        ],
        stream: false,
        max_tokens: 4000,
    });

    const { status, data } = await Native.makeRequest(baseUrl, apiKey, body);

    if (status === -2) {
        showToast(data, Toasts.Type.FAILURE);
        throw new Error("Timeout");
    }
    if (status === -1) {
        showToast(`网络错误: ${data}`, Toasts.Type.FAILURE);
        throw new Error("Network error: " + data);
    }
    if (status !== 200) {
        showToast(`翻译失败 (${status}): ${data.slice(0, 120)}`, Toasts.Type.FAILURE);
        throw new Error(`DeepSeek API error ${status}`);
    }

    let json: any;
    try {
        json = JSON.parse(data);
    } catch {
        showToast(`翻译返回非 JSON 数据: ${data.slice(0, 120)}`, Toasts.Type.FAILURE);
        throw new Error("Invalid JSON response");
    }
    const out = json.choices?.[0]?.message?.content?.trim();
    if (!out) {
        showToast("翻译返回空内容", Toasts.Type.FAILURE);
        throw new Error("Empty response");
    }
    if (json.choices?.[0]?.finish_reason === "length") {
        showToast("译文较长已被截断（4000 tokens 上限）", Toasts.Type.MESSAGE);
    }
    return out;
}
