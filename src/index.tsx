import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Menu, MessageStore, UserStore } from "@webpack/common";

import { translateWithDeepSeek } from "./deepseek";
import { TARGET_LANGUAGES } from "./languages";
import { settings } from "./settings";
import { TranslateChatBarButton, TranslateChatIcon } from "./TranslateChatBarButton";
import { clearTranslation, hasTranslation, setTranslation, TranslationView } from "./TranslationView";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message?.content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    const current = settings.store.receiveTargetLanguage;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem id="vc-ai-translate-lang" label="AI 翻译目标语言">
            {TARGET_LANGUAGES.map(lang => (
                <Menu.MenuRadioItem
                    key={lang.code}
                    id={`vc-ai-translate-lang-${lang.code}`}
                    label={lang.label}
                    group="vc-ai-translate-lang"
                    checked={current === lang.code}
                    action={() => { settings.store.receiveTargetLanguage = lang.code; }}
                />
            ))}
        </Menu.MenuItem>
    ));
};

function parseMessageDom(el: HTMLElement): { channelId: string; messageId: string; } | null {
    const wrapper = el.closest<HTMLElement>('[id^="chat-messages-"]');
    if (!wrapper) return null;
    const parts = wrapper.id.split("-");
    if (parts.length < 4) return null;
    return { channelId: parts[2], messageId: parts[3] };
}

async function onDoubleClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest('[id^="message-content-"]')) return;

    const ids = parseMessageDom(target);
    if (!ids) return;

    const msg = MessageStore.getMessage(ids.channelId, ids.messageId);
    if (!msg?.content) return;

    if (!settings.store.allowSelfTranslate) {
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (currentUserId && msg.author?.id === currentUserId) return;
    }

    if (hasTranslation(ids.messageId)) {
        clearTranslation(ids.messageId);
        return;
    }

    const lang = settings.store.receiveTargetLanguage;
    setTranslation(ids.messageId, "AI 翻译中…");
    try {
        const result = await translateWithDeepSeek(msg.content, lang);
        if (result) setTranslation(ids.messageId, result);
        else clearTranslation(ids.messageId);
    } catch (err) {
        console.error("[AiTranslate] dblclick", err);
        clearTranslation(ids.messageId);
    }
}

export default definePlugin({
    name: "AiTranslate",
    description: "用 DeepSeek 翻译消息：双击别人消息翻译（再双击关闭），右键菜单换目标语言；输入框上方边写边译。",
    authors: [{ name: "Concom", id: 0n }],
    settings,
    contextMenus: {
        message: messageCtxPatch,
    },
    renderMessageAccessory: ({ message }: { message: Message; }) => (
        <TranslationView messageId={message.id} />
    ),
    chatBarButton: {
        icon: TranslateChatIcon,
        render: TranslateChatBarButton,
    },
    start() {
        document.addEventListener("dblclick", onDoubleClick);
    },
    stop() {
        document.removeEventListener("dblclick", onDoubleClick);
    },
});
