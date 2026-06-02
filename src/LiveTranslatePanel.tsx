import { useForceUpdater } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { DraftStore, DraftType, React, ReactDOM, useEffect, useRef, useState } from "@webpack/common";

import { translateWithDeepSeek } from "./deepseek";
import { setDraft } from "./draft";
import { TARGET_LANGUAGES } from "./languages";
import { settings } from "./settings";

const FluxDispatcher = findByPropsLazy("dispatch", "subscribe");

const cache = new Map<string, string>();
const MIN_CHARS = 3;
const DEBOUNCE_MS = 500;

function langLabel(code: string): string {
    return TARGET_LANGUAGES.find(l => l.code === code)?.label ?? code;
}

function findInsertParent(): HTMLElement | null {
    const editor = document.querySelector<HTMLElement>('[data-slate-editor="true"]');
    if (!editor) return null;
    let el: HTMLElement | null = editor;
    for (let i = 0; i < 8 && el; i++) {
        if (el.tagName === "FORM") return el;
        el = el.parentElement;
    }
    return editor.parentElement;
}

function Panel({ channelId }: { channelId: string; }) {
    const forceUpdate = useForceUpdater();
    const draft = (() => {
        try { return (DraftStore.getDraft(channelId, DraftType.ChannelMessage) ?? "").trim(); }
        catch { return ""; }
    })();

    useEffect(() => {
        const onChange = () => forceUpdate();
        FluxDispatcher.subscribe("DRAFT_CHANGE", onChange);
        return () => FluxDispatcher.unsubscribe("DRAFT_CHANGE", onChange);
    }, [forceUpdate]);

    const [translation, setTranslation] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const targetLang = settings.use(["defaultTargetLanguage"]).defaultTargetLanguage as string;

    useEffect(() => {
        if (!draft || draft.length < MIN_CHARS) {
            setTranslation("");
            return;
        }
        const key = `${targetLang}::${draft}`;
        const cached = cache.get(key);
        if (cached) {
            setTranslation(cached);
            return;
        }
        const handle = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await translateWithDeepSeek(draft, targetLang);
                if (result) {
                    cache.set(key, result);
                    setTranslation(result);
                }
            } catch (e) {
                console.error("[AiTranslate] live", e);
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [draft, targetLang]);

    if (!draft || draft.length < MIN_CHARS) return null;
    if (!translation && !loading) return null;

    const display = loading && !translation ? "翻译中…" : translation;
    const isSame = !!translation && translation.trim() === draft;

    return (
        <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "6px 12px",
            margin: "0 16px 4px",
            background: "var(--background-secondary, var(--background-secondary-alt, #2b2d31))",
            border: "1px solid var(--background-modifier-hover, var(--background-modifier-accent, #3f4147))",
            borderRadius: "8px",
            fontFamily: "var(--font-primary, inherit)",
            fontSize: "14px",
            color: "var(--text-normal, #dbdee1)",
        }}>
            <span style={{
                fontSize: "11px",
                color: "var(--text-muted, #949ba4)",
                flexShrink: 0,
                lineHeight: "20px",
            }}>
                {langLabel(targetLang)}
            </span>
            <span style={{
                flex: 1,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
                lineHeight: "20px",
                opacity: loading ? 0.6 : 1,
            }}>
                {display}
            </span>
            <button
                disabled={loading || !translation || isSame}
                onClick={() => {
                    if (!translation) return;
                    setDraft(channelId, translation);
                    setTranslation("");
                }}
                title="用译文覆盖输入框"
                style={{
                    flexShrink: 0,
                    background: isSame ? "var(--background-modifier-hover, #3f4147)" : "var(--brand-experiment, #5865f2)",
                    color: "var(--white-500, #ffffff)",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontFamily: "var(--font-primary, inherit)",
                    cursor: loading || !translation || isSame ? "default" : "pointer",
                    opacity: loading || !translation || isSame ? 0.5 : 1,
                }}
            >
                覆盖
            </button>
        </div>
    );
}

export function LiveTranslateMount({ channelId }: { channelId: string; }) {
    const [parent, setParent] = useState<HTMLElement | null>(null);
    const liveOn = settings.use(["liveTranslate"]).liveTranslate;

    useEffect(() => {
        if (!liveOn) {
            setParent(null);
            return;
        }
        const target = findInsertParent();
        if (!target) return;
        const div = document.createElement("div");
        div.setAttribute("data-ai-translate-panel", "");
        target.parentElement?.insertBefore(div, target);
        setParent(div);
        return () => {
            div.remove();
            setParent(null);
        };
    }, [liveOn, channelId]);

    if (!liveOn || !parent) return null;
    return ReactDOM.createPortal(<Panel channelId={channelId} />, parent);
}
