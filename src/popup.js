import { rootHandle, ensurePermission, writeMarkdown } from "./lib/fs.js";
import { cleanFilename, pathSegments } from "./lib/path.js";
import { sanitizeMarkdown } from "./lib/sanitize.js";
import { getSettings, parseTags } from "./lib/settings.js";
import { buildVars, renderTemplate } from "./lib/template.js";

const $ = (id) => document.getElementById(id);
const fields = {
	title: $("title"),
	author: $("author"),
	published: $("published"),
	description: $("description"),
	tags: $("tags"),
	preview: $("preview"),
	target: $("targetPath"),
	status: $("status"),
	save: $("save"),
	download: $("download"),
};

let settings = null;
let markdown = "";
let baseMeta = { url: "", host: "", site: "" };

function setStatus(text, kind = "") {
	fields.status.textContent = text;
	fields.status.className = `status ${kind}`.trim();
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

function currentMeta() {
	return {
		...baseMeta,
		title: fields.title.value.trim(),
		author: fields.author.value.trim(),
		published: fields.published.value.trim(),
		description: fields.description.value.trim(),
	};
}

function buildOutput() {
	const tags = parseTags(fields.tags.value);
	const body = settings.sanitize ? sanitizeMarkdown(markdown) : markdown;
	const vars = buildVars({ meta: currentMeta(), markdown: body, tags });
	return {
		vars,
		content: renderTemplate(settings.template, vars),
	};
}

function renderPreview() {
	try {
		const { vars, content } = buildOutput();
		const segments = pathSegments(renderTemplate(settings.pathTemplate, vars));
		const filename = cleanFilename(renderTemplate(settings.filenameTemplate, vars));
		fields.preview.value = content;
		fields.target.textContent = `content/${[...segments, filename].join("/")}`;
	} catch (err) {
		fields.target.textContent = `路径/文件名模板有误：${err.message}`;
	}
}

async function extractArticle() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) throw new Error("找不到当前标签页");
	if (/^(chrome|edge|about|devtools|chrome-extension):/i.test(tab.url ?? "")) {
		throw new Error("浏览器内部页面无法剪藏，请在普通网页上使用");
	}

	await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });

	let res;
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			res = await chrome.tabs.sendMessage(tab.id, {
				type: "XEU_CLIP_EXTRACT",
				mode: settings.mode,
			});
			break;
		} catch (err) {
			if (attempt === 2) throw err;
			await sleep(120);
		}
	}
	if (!res) throw new Error("页面没有响应");
	if (res.error) throw new Error(res.error);
	return res;
}

async function init() {
	settings = await getSettings();
	fields.tags.value = settings.defaultTags;

	for (const el of [fields.title, fields.author, fields.published, fields.description, fields.tags]) {
		el.addEventListener("input", renderPreview);
	}

	$("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

	fields.save.addEventListener("click", async () => {
		fields.save.disabled = true;
		try {
			const handle = await rootHandle.get();
			if (!handle) {
				setStatus("还没有选择 content 目录，点右上角「设置」选择一次", "error");
				return;
			}
			const granted = await ensurePermission(handle, true);
			if (!granted) {
				setStatus("目录没有写入权限，请重新授权", "error");
				return;
			}
			const { vars, content } = buildOutput();
			const segments = pathSegments(renderTemplate(settings.pathTemplate, vars));
			const filename = cleanFilename(renderTemplate(settings.filenameTemplate, vars));
			const res = await writeMarkdown({
				root: handle,
				segments,
				filename,
				content,
				conflict: settings.conflict,
			});
			setStatus(`✓ 已保存：${res.path}`, "ok");
		} catch (err) {
			setStatus(`保存失败：${err.message}`, "error");
		} finally {
			fields.save.disabled = false;
		}
	});

	fields.download.addEventListener("click", async () => {
		try {
			const { vars, content } = buildOutput();
			const filename = cleanFilename(renderTemplate(settings.filenameTemplate, vars));
			const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
			await chrome.downloads.download({ url, filename, saveAs: true });
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
			setStatus(`已下载 ${filename}`, "ok");
		} catch (err) {
			setStatus(`下载失败：${err.message}`, "error");
		}
	});

	try {
		const article = await extractArticle();
		baseMeta = { url: article.url, host: article.host, site: article.site };
		markdown = article.markdown;
		fields.title.value = article.title;
		fields.author.value = article.author;
		fields.published.value = article.published;
		fields.description.value = article.description;
		renderPreview();
		setStatus(`已提取 ${article.length} 字符${article.author ? ` · ${article.author}` : ""}`, "ok");
	} catch (err) {
		setStatus(`提取失败：${err.message}`, "error");
		fields.save.disabled = true;
		fields.download.disabled = true;
	}
}

init();
