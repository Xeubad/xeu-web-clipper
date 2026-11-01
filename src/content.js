import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const GUARD = "__xeuClipperLoaded";

if (typeof window !== "undefined" && !window[GUARD]) {
	window[GUARD] = true;
	if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
		chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
			if (msg?.type !== "XEU_CLIP_EXTRACT") return;
			try {
				sendResponse(extract(msg.mode));
			} catch (err) {
				sendResponse({ error: err?.message || String(err) });
			}
			return true;
		});
	}
}

function normalize(s) {
	return String(s ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function dateOnly(value) {
	const s = String(value ?? "").trim();
	const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
	return m ? m[1] : s.slice(0, 32);
}

function meta(names) {
	for (const name of names) {
		const el =
			document.querySelector(`meta[property="${name}"]`) ||
			document.querySelector(`meta[name="${name}"]`);
		const value = el?.getAttribute("content")?.trim();
		if (value) return value;
	}
	return "";
}

function jsonLd() {
	const out = [];
	for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const data = JSON.parse(script.textContent);
			const walk = (node) => {
				if (!node || typeof node !== "object") return;
				if (Array.isArray(node)) {
					node.forEach(walk);
					return;
				}
				if (node["@graph"]) walk(node["@graph"]);
				out.push(node);
				for (const key of ["mainEntity", "itemListElement"]) if (node[key]) walk(node[key]);
			};
			walk(data);
		} catch {
			// 忽略坏 JSON
		}
	}
	return out;
}

function pickJsonLd(fields) {
	for (const field of fields) {
		for (const node of jsonLd()) {
			const v = node[field];
			if (typeof v === "string" && v.trim()) return v.trim();
			if (v && typeof v === "object") {
				if (typeof v.name === "string" && v.name.trim()) return v.name.trim();
				if (Array.isArray(v)) {
					const first = v.find((x) => typeof x?.name === "string");
					if (first) return first.name.trim();
				}
			}
		}
	}
	return "";
}

function selectionHtml() {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return "";
	const text = sel.toString().trim();
	if (text.length < 80) return "";
	const div = document.createElement("div");
	for (let i = 0; i < sel.rangeCount; i++) div.appendChild(sel.getRangeAt(i).cloneContents());
	return div.innerHTML;
}

function absolutize(container) {
	for (const a of container.querySelectorAll("a[href]")) {
		try {
			a.setAttribute("href", new URL(a.getAttribute("href"), location.href).href);
		} catch {}
	}
	for (const img of container.querySelectorAll("img")) {
		const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original");
		if (!src) {
			img.remove();
			continue;
		}
		try {
			img.setAttribute("src", new URL(src, location.href).href);
		} catch {}
	}
}

function clean(container) {
	for (const el of container.querySelectorAll(
		"script,style,noscript,iframe,form,button,input,select,textarea,svg,canvas,nav,aside",
	)) {
		el.remove();
	}
	for (const el of container.querySelectorAll("*")) {
		el.removeAttribute("style");
		// 保留 code 的 class（Turndown 用它识别语言），其余属性由 Turndown 忽略
	}
}

function turndown() {
	const td = new TurndownService({
		headingStyle: "atx",
		hr: "---",
		bulletListMarker: "-",
		codeBlockStyle: "fenced",
		emDelimiter: "*",
	});
	td.use(gfm);
	td.addRule("fencedCodeWithLang", {
		filter: (node) => node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE",
		replacement: (_content, node) => {
			const code = node.firstChild;
			const text = code.textContent.replace(/\n$/, "");
			const lang = (code.getAttribute("class") || "").match(/language-([\w+#.-]+)/)?.[1] || "";
			return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
		},
	});
	return td;
}

export function extract(mode = "readability") {
	const titleMeta = meta(["og:title", "twitter:title"]) || document.title;
	const selection = mode === "selection" ? selectionHtml() : "";

	let article = null;
	if (!selection) {
		const clone = document.cloneNode(true);
		article = new Readability(clone, { charThreshold: 200 }).parse();
	}

	const html = selection || article?.content;
	if (!html) throw new Error("没有提取到正文，试试选中正文后再剪藏");

	const container = document.createElement("div");
	container.innerHTML = html;
	absolutize(container);
	clean(container);

	const title = (article?.title || titleMeta || "").trim();
	const h1 = container.querySelector("h1");
	if (h1 && normalize(h1.textContent) === normalize(title)) h1.remove();

	const markdown = turndown()
		.turndown(container.innerHTML)
		.replace(/^(\s*)[-*] {2,}/gm, "$1- ")
		.replace(/^(\s*\d+\.) {2,}/gm, "$1 ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	if (markdown.length < 120) throw new Error("正文太短，可能是特殊页面；可选中正文后重试");

	const ldAuthor = pickJsonLd(["author", "creator"]);
	const ldPublished = pickJsonLd(["datePublished", "dateCreated", "dateModified"]);
	const timeEl = document.querySelector("time[datetime]");
	const published =
		meta(["article:published_time", "datePublished", "date", "pubdate"]) ||
		ldPublished ||
		timeEl?.getAttribute("datetime") ||
		"";

	return {
		title,
		author: article?.byline || meta(["author", "article:author"]) || ldAuthor || "",
		published: dateOnly(published),
		description: article?.excerpt || meta(["og:description", "description", "twitter:description"]) || "",
		site: article?.siteName || meta(["og:site_name"]) || location.hostname,
		url: location.href,
		host: location.hostname,
		markdown,
		length: markdown.length,
	};
}
