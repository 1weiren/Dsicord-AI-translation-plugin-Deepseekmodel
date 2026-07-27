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

interface MatchRule {
    prefix: string;
    suffix: string;
    guard?: (text: string, start: number) => boolean;
    style: React.CSSProperties;
    tag: keyof HTMLElementTagNameMap;
}

function findClosing(text: string, suffix: string, start: number): number {
    if (suffix === "*") {
        for (let j = start; j < text.length; j++) {
            if (text[j] === "*" && text[j + 1] !== "*" && text[j - 1] !== "*") {
                return j;
            }
        }
        return -1;
    }
    return text.indexOf(suffix, start);
}

const RULES: MatchRule[] = [
    { prefix: "```", suffix: "```", style: CODE_BLOCK, tag: "pre" },
    { prefix: "`", suffix: "`", style: INLINE_CODE, tag: "code" },
    { prefix: "**", suffix: "**", style: {}, tag: "strong" },
    { prefix: "__", suffix: "__", style: {}, tag: "u" },
    { prefix: "~~", suffix: "~~", style: {}, tag: "s" },
    { prefix: "||", suffix: "||", style: SPOILER, tag: "span" },
    { prefix: "*", suffix: "*", guard: (t, i) => t[i + 1] !== "*", style: {}, tag: "em" },
];

const CODE_BLOCK: React.CSSProperties = {
    background: "var(--background-secondary)",
    borderRadius: "4px",
    padding: "8px",
    margin: "4px 0",
    fontFamily: "var(--font-code)",
    fontSize: "0.85em",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    display: "block",
};

const INLINE_CODE: React.CSSProperties = {
    background: "var(--background-secondary)",
    padding: "1px 4px",
    borderRadius: "3px",
    fontFamily: "var(--font-code)",
    fontSize: "0.9em",
};

const SPOILER: React.CSSProperties = {
    background: "var(--background-secondary)",
    borderRadius: "3px",
    padding: "0 2px",
};

const BLOCKQUOTE: React.CSSProperties = {
    borderLeft: "4px solid var(--background-modifier-accent, #4e5058)",
    paddingLeft: "8px",
    color: "var(--text-muted)",
    display: "block",
    margin: "4px 0",
};

function parseInline(text: string, keyGen: { n: number }): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < text.length) {
        let bestRule: MatchRule | null = null;
        let bestEnd = -1;

        for (const rule of RULES) {
            if (rule.guard && !rule.guard(text, i)) continue;
            if (!text.startsWith(rule.prefix, i)) continue;
            const innerStart = i + rule.prefix.length;
            const end = findClosing(text, rule.suffix, innerStart);
            if (end !== -1) {
                bestRule = rule;
                bestEnd = end;
                break;
            }
        }

        if (!bestRule || bestEnd === -1) {
            result.push(text.slice(i));
            break;
        }

        const innerStart = i + bestRule.prefix.length;
        const innerText = text.slice(innerStart, bestEnd);
        const noParse = bestRule.tag === "pre" || bestRule.tag === "code";
        const children = noParse ? [innerText] : parseInline(innerText, keyGen);

        if (bestRule.tag === "pre") {
            result.push(
                <pre key={keyGen.n++} style={bestRule.style}>
                    <code>{children}</code>
                </pre>
            );
        } else {
            result.push(
                React.createElement(bestRule.tag, { key: keyGen.n++, style: bestRule.style }, ...children)
            );
        }

        i = bestEnd + bestRule.suffix.length;
    }

    return result;
}

function parseMarkdown(text: string): React.ReactNode {
    const paragraphs = text.split(/\n{2,}/);
    const keyGen = { n: 0 };

    return (
        <>
            {paragraphs.map((para, pi) => {
                const lines = para.split("\n");

                const isBlockquote = lines.every(l => l.trimStart().startsWith("> ") || l.trimStart().startsWith(">>> "));

                const content = (
                    <>
                        {lines.map((line, li) => {
                            let stripped = line;
                            if (isBlockquote) {
                                stripped = stripped.replace(/^>\s/, "").replace(/^>>>\s/, "");
                            }
                            return (
                                <span key={li}>
                                    {li > 0 && <br />}
                                    {parseInline(stripped, keyGen)}
                                </span>
                            );
                        })}
                    </>
                );

                if (isBlockquote) {
                    return (
                        <div key={pi} style={{ marginBottom: pi < paragraphs.length - 1 ? "8px" : 0 }}>
                            <blockquote style={BLOCKQUOTE}>
                                {content}
                            </blockquote>
                        </div>
                    );
                }

                return (
                    <div key={pi} style={{ marginBottom: pi < paragraphs.length - 1 ? "8px" : 0 }}>
                        {content}
                    </div>
                );
            })}
        </>
    );
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
                lineHeight: "1.8",
            }}
        >
            <span style={{ fontSize: "0.75em", opacity: 0.7, marginRight: "6px" }}>AI 译</span>
            {parseMarkdown(text)}
        </div>
    );
}
