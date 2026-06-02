import { IpcMainInvokeEvent } from "electron";

const TIMEOUT_MS = 120_000;

export async function makeRequest(_: IpcMainInvokeEvent, baseUrl: string, apiKey: string, body: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body,
            signal: controller.signal,
        });
        return { status: res.status, data: await res.text() };
    } catch (e: any) {
        if (e?.name === "AbortError") {
            return { status: -2, data: "请求超时（120 秒），可能是网络慢或 DeepSeek 拥堵" };
        }
        return { status: -1, data: e?.message || "Network error" };
    } finally {
        clearTimeout(timer);
    }
}
