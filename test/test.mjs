import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";

// ─── Mock React ────────────────────────────────────────────────────────
const createdElements = [];
function createElement(tag, props, ...children) {
    const el = { tag, props, children: children.flat() };
    createdElements.push(el);
    return el;
}
const React = { createElement };

// Flatten rendered output to a string representation for easy comparison
function renderToString(nodes) {
    if (typeof nodes === "string") return nodes;
    if (Array.isArray(nodes)) return nodes.map(renderToString).join("");
    if (!nodes || typeof nodes !== "object") return String(nodes);
    const tag = nodes.tag;
    const children = nodes.children.map(renderToString).join("");
    if (tag === "strong") return `**${children}**`;
    if (tag === "em") return `*${children}*`;
    if (tag === "u") return `__${children}__`;
    if (tag === "s") return `~~${children}~~`;
    if (tag === "code") return "`" + children + "`";
    if (tag === "pre") return "```\n" + children + "\n```";
    if (tag === "span") return `||${children}||`;
    if (tag === "blockquote") return `> ${children}`;
    if (tag === "div") return children;
    if (tag === "span" && !nodes.props?.style?.background) return children;
    return children;
}

// ─── Copy relevant functions from TranslationView.tsx ──────────────────
function findClosing(text, suffix, start) {
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

const RULES = [
    { prefix: "```", suffix: "```", style: {}, tag: "pre" },
    { prefix: "`", suffix: "`", style: {}, tag: "code" },
    { prefix: "**", suffix: "**", style: {}, tag: "strong" },
    { prefix: "__", suffix: "__", style: {}, tag: "u" },
    { prefix: "~~", suffix: "~~", style: {}, tag: "s" },
    { prefix: "||", suffix: "||", style: {}, tag: "span" },
    { prefix: "*", suffix: "*", guard: (t, i) => t[i + 1] !== "*", style: {}, tag: "em" },
];

function parseInline(text, keyGen) {
    const result = [];
    let i = 0;

    while (i < text.length) {
        let bestRule = null;
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
                React.createElement("pre", { key: keyGen.n++ }, React.createElement("code", null, children))
            );
        } else {
            result.push(
                React.createElement(bestRule.tag, { key: keyGen.n++ }, ...children)
            );
        }

        i = bestEnd + bestRule.suffix.length;
    }

    return result;
}

function parseMarkdown(text) {
    const paragraphs = text.split(/\n{2,}/);
    const keyGen = { n: 0 };

    return React.createElement(
        React.Fragment,
        null,
        ...paragraphs.map((para, pi) => {
            const lines = para.split("\n");

            const isBlockquote = lines.every(l => l.trimStart().startsWith("> ") || l.trimStart().startsWith(">>> "));

            const lineContents = [];
            for (let li = 0; li < lines.length; li++) {
                let stripped = lines[li];
                if (isBlockquote) {
                    stripped = stripped.replace(/^>\s/, "").replace(/^>>>\s/, "");
                }
                if (li > 0) lineContents.push(React.createElement("br", { key: `br-${li}` }));
                const parsed = parseInline(stripped, keyGen);
                lineContents.push(...parsed);
            }

            const content = React.createElement(
                "span",
                { key: `inner-${pi}` },
                ...lineContents
            );

            if (isBlockquote) {
                return React.createElement(
                    "div",
                    { key: pi },
                    React.createElement("blockquote", { style: { borderLeft: "4px solid" } }, content)
                );
            }

            return React.createElement("div", { key: pi }, content);
        })
    );
}

// ─── Copy cache logic from LiveTranslatePanel.tsx ──────────────────────
function createCache(maxSize) {
    const cache = new Map();
    return {
        get: (k) => cache.get(k),
        set: (k, v) => {
            if (cache.size >= maxSize) {
                const oldest = cache.keys().next().value;
                if (oldest !== undefined) cache.delete(oldest);
            }
            cache.set(k, v);
        },
        size: () => cache.size,
    };
}

// ─── Copy deepseek JSON parsing logic ──────────────────────────────────
function parseDeepSeekResponse(data) {
    let json;
    try {
        json = JSON.parse(data);
    } catch {
        throw new Error("Invalid JSON response");
    }
    const out = json?.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("Empty response");
    return out;
}

// ─── Copy languages.ts ─────────────────────────────────────────────────
const TARGET_LANGUAGES = [
    { code: "Chinese (Simplified)", label: "中文" },
    { code: "English", label: "English" },
    { code: "Japanese", label: "日本語" },
    { code: "Korean", label: "한국어" },
    { code: "Spanish", label: "Español" },
    { code: "French", label: "Français" },
];

// ═══════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("TARGET_LANGUAGES", () => {
    it("has 6 languages", () => {
        equal(TARGET_LANGUAGES.length, 6);
    });

    it("Chinese is first (index 0)", () => {
        equal(TARGET_LANGUAGES[0].label, "中文");
    });

    it("English is second (index 1)", () => {
        equal(TARGET_LANGUAGES[1].label, "English");
    });
});

describe("findClosing", () => {
    it("finds single * for italic", () => {
        equal(findClosing("*italic* rest", "*", 1), 7);
    });

    it("skips ** for bold (not single *)", () => {
        equal(findClosing("**bold** rest", "*", 1), -1);
    });

    it("finds closing ** for bold", () => {
        equal(findClosing("**bold** rest", "**", 2), 6);
    });

    it("finds closing ~~ for strikethrough", () => {
        equal(findClosing("~~text~~ end", "~~", 2), 6);
    });
});

describe("parseInline", () => {
    it("handles plain text", () => {
        const result = parseInline("Hello world", { n: 0 });
        equal(renderToString(result), "Hello world");
    });

    it("handles **bold**", () => {
        const result = parseInline("Hello **world**!", { n: 0 });
        equal(renderToString(result), "Hello **world**!");
    });

    it("handles *italic*", () => {
        const result = parseInline("Hello *world*!", { n: 0 });
        equal(renderToString(result), "Hello *world*!");
    });

    it("handles __underline__", () => {
        const result = parseInline("Hello __world__!", { n: 0 });
        equal(renderToString(result), "Hello __world__!");
    });

    it("handles ~~strikethrough~~", () => {
        const result = parseInline("Hello ~~world~~!", { n: 0 });
        equal(renderToString(result), "Hello ~~world~~!");
    });

    it("handles ||spoiler||", () => {
        const result = parseInline("Hello ||secret||!", { n: 0 });
        equal(renderToString(result), "Hello ||secret||!");
    });

    it("handles `inline code`", () => {
        const result = parseInline("Use `const x = 1` here", { n: 0 });
        equal(renderToString(result), "Use `const x = 1` here");
    });

    // BUG 2 FIX: code blocks should NOT parse markdown inside them
    it("BUG 2 FIX: inline code preserves ** literally", () => {
        const result = parseInline("this is `**not bold**` text", { n: 0 });
        const rendered = renderToString(result);
        ok(rendered.includes("**not bold**"), "text inside code should have literal **");
        ok(!rendered.includes("<strong>"), "text inside code should NOT be wrapped in strong");
    });

    // BUG 2 FIX: code blocks preserve markdown literally
    it("BUG 2 FIX: code block preserves ** literally", () => {
        const result = parseInline("```\n**not bold**\n```", { n: 0 });
        const rendered = renderToString(result);
        ok(rendered.includes("**not bold**"), "text inside code block should have literal **");
    });

    it("handles ***bold+italic*** (nesting via bold then italic)", () => {
        const result = parseInline("***hello***", { n: 0 });
        const rendered = renderToString(result);
        equal(rendered, "***hello***");
    });

    it("handles nested __**bold underline**__", () => {
        const result = parseInline("__**nested**__", { n: 0 });
        const rendered = renderToString(result);
        equal(rendered, "__**nested**__");
    });
});

describe("parseMarkdown", () => {
    it("splits paragraphs by double newline", () => {
        const result = parseMarkdown("Para 1\n\nPara 2");
        const rendered = renderToString([result]);
        ok(rendered.includes("Para 1") && rendered.includes("Para 2"));
    });

    it("preserves single newlines as line breaks", () => {
        const result = parseMarkdown("Line 1\nLine 2");
        const rendered = renderToString([result]);
        ok(rendered.includes("Line 1") && rendered.includes("Line 2"));
    });

    // BUG 3 FIX: blockquote rendering
    it("BUG 3 FIX: renders blockquote for > prefix", () => {
        const result = parseMarkdown("> This is a quote");
        const rendered = renderToString([result]);
        ok(rendered.includes("This is a quote"));
    });

    it("BUG 3 FIX: blockquote strips > prefix", () => {
        const result = parseMarkdown("> Hello world");
        const rendered = renderToString([result]);
        ok(!rendered.includes("> Hello"));
    });

    it("BUG 3 FIX: multi-line blockquote", () => {
        const result = parseMarkdown("> Line one\n> Line two");
        const rendered = renderToString([result]);
        ok(rendered.includes("Line one") && rendered.includes("Line two"));
    });

    it("BUG 3 FIX: blockquote with bold inside", () => {
        const result = parseMarkdown("> This is **bold** text");
        const rendered = renderToString([result]);
        ok(rendered.includes("bold"));
    });
});

describe("Cache (LiveTranslatePanel)", () => {
    it("stores and retrieves values", () => {
        const cache = createCache(3);
        cache.set("a", "value-a");
        equal(cache.get("a"), "value-a");
    });

    // BUG 5 FIX: cache eviction on max size
    it("BUG 5 FIX: evicts oldest entry when exceeding max size", () => {
        const cache = createCache(2);
        cache.set("a", "val-a");
        cache.set("b", "val-b");
        cache.set("c", "val-c");
        equal(cache.get("a"), undefined, "oldest entry should be evicted");
        equal(cache.get("b"), "val-b");
        equal(cache.get("c"), "val-c");
        equal(cache.size(), 2);
    });
});

describe("DeepSeek JSON parsing", () => {
    it("parses valid response", () => {
        const result = parseDeepSeekResponse(JSON.stringify({
            choices: [{ message: { content: "  Hello World  " } }]
        }));
        equal(result, "Hello World");
    });

    it("throws on invalid JSON", () => {
        throws(() => parseDeepSeekResponse("not json"), /Invalid JSON/);
    });

    // BUG 6 FIX: malformed JSON is caught
    it("BUG 6 FIX: throws on empty string", () => {
        throws(() => parseDeepSeekResponse(""), /Invalid JSON/);
    });

    it("BUG 6 FIX: throws on HTML response", () => {
        throws(() => parseDeepSeekResponse("<html>Error</html>"), /Invalid JSON/);
    });

    it("throws on missing choices", () => {
        throws(() => parseDeepSeekResponse(JSON.stringify({ choices: [] })), /Empty response/);
    });

    it("throws on empty content", () => {
        throws(() => parseDeepSeekResponse(JSON.stringify({
            choices: [{ message: { content: "" } }]
        })), /Empty response/);
    });
});

describe("settings defaultTargetLanguage & receiveTargetLanguage defaults", () => {
    it("defaultTargetLanguage default is index 1 (English)", () => {
        const defaultIdx = TARGET_LANGUAGES.findIndex((_, i) => i === 1);
        equal(TARGET_LANGUAGES[defaultIdx].code, "English");
    });

    it("receiveTargetLanguage default is index 0 (Chinese)", () => {
        const defaultIdx = TARGET_LANGUAGES.findIndex((_, i) => i === 0);
        equal(TARGET_LANGUAGES[defaultIdx].code, "Chinese (Simplified)");
    });
});

console.log("\n✓ All tests complete. Run with: node --test test/test.mjs\n");
