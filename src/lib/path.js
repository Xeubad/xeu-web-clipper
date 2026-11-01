/**
 * 文件名 / 路径模板的清洗
 */

const ILLEGAL = /[\u0000-\u001f\\/:*?<>|]/g;

export function cleanSegment(input, max = 120) {
	const s = String(input ?? "")
		.replace(/["']/g, "")
		.replace(ILLEGAL, "-")
		.replace(/-{2,}/g, "-")
		.replace(/\s+/g, " ")
		.replace(/^[.\s]+|[.\s]+$/g, "")
		.trim();
	if (!s || s === "." || s === "..") {
		throw new Error(`路径片段不合法：${JSON.stringify(input)}`);
	}
	return s.slice(0, max);
}

export function cleanFilename(input) {
	let name = cleanSegment(input, 120)
		.replace(/\.+$/, "")
		.trim();
	if (!name) name = "untitled";
	if (!/\.md$/i.test(name)) name += ".md";
	return name;
}

/** 把渲染后的路径模板拆成安全目录片段 */
export function pathSegments(rendered) {
	const raw = String(rendered ?? "").trim();
	if (!raw) return [];
	if (raw.startsWith("/") || raw.includes("..")) {
		throw new Error(`路径模板不合法：${raw}`);
	}
	return raw
		.split("/")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => cleanSegment(s));
}
