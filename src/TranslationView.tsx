import { useEffect, useState } from "@webpack/common";

const translations = new Map<string, string>();
const listeners = new Set<() => void>();

export function setTranslation(messageId: string, text: string) {
    translations.set(messageId, text);
    listeners.forEach(l => l());
}

export function clearTranslation(messageId: string) {
    translations.delete(messageId);
    listeners.forEach(l => l());
}

export function hasTranslation(messageId: string): boolean {
    return translations.has(messageId);
}

export function TranslationView({ messageId }: { messageId: string; }) {
    const [, force] = useState(0);
    useEffect(() => {
        const update = () => force(n => n + 1);
        listeners.add(update);
        return () => { listeners.delete(update); };
    }, []);

    const text = translations.get(messageId);
    if (!text) return null;

    return (
        <div
            style={{
                marginTop: "4px",
                fontSize: "0.9em",
                color: "var(--text-muted)",
                borderLeft: "2px solid var(--brand-experiment)",
                paddingLeft: "8px",
                userSelect: "text",
            }}
        >
            <span style={{ fontSize: "0.75em", opacity: 0.7, marginRight: "6px" }}>AI 译</span>
            {text}
        </div>
    );
}
