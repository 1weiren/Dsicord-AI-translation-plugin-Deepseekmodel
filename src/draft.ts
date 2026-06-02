import { findByPropsLazy } from "@webpack";
import { DraftStore, DraftType } from "@webpack/common";

const DraftActions = findByPropsLazy("saveDraft", "clearDraft");
const SlateTransforms = findByPropsLazy("insertText", "wrapNodes", "splitNodes");
const SlateEditor = findByPropsLazy("range", "withoutNormalizing", "unhangRange");

function getReactFiber(el: any): any {
    const key = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
    return key ? el[key] : null;
}

function findSlateEditor(el: HTMLElement): any {
    let fiber: any = getReactFiber(el);
    while (fiber) {
        const editor = fiber.memoizedProps?.editor;
        if (editor && typeof editor.apply === "function" && Array.isArray(editor.children)) {
            return editor;
        }
        fiber = fiber.return;
    }
    return null;
}

function fallback(channelId: string, text: string) {
    DraftActions.saveDraft(channelId, DraftType.ChannelMessage, text);
}

export function getDraft(channelId: string): string {
    return DraftStore.getDraft(channelId, DraftType.ChannelMessage) ?? "";
}

export function setDraft(channelId: string, text: string): void {
    const el = document.querySelector<HTMLElement>('[data-slate-editor="true"]');
    if (!el) {
        fallback(channelId, text);
        return;
    }

    const editor = findSlateEditor(el);
    if (!editor) {
        console.warn("[AiTranslate] Slate editor instance not found via fiber");
        fallback(channelId, text);
        return;
    }

    el.focus();

    try {
        const fullRange = SlateEditor.range(editor, []);
        SlateTransforms.select(editor, fullRange);
        SlateTransforms.insertText(editor, text);
    } catch (e) {
        console.error("[AiTranslate] Slate transforms failed", e);
        fallback(channelId, text);
    }
}
