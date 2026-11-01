/**
 * 模板与变量渲染
 */

export const DEFAULT_TEMPLATE = `---
title: {{title_yaml}}
source: {{url_yaml}}
author: {{author_yaml}}
published: {{published_yaml}}
created: {{date}}
description: {{description_yaml}}
tags: {{tags_inline}}
---

{{content}}
`;

/** 生成 YAML 双引号字符串（换行压成空格） */
export function yamlString(value) {
	const s = String(value ?? "")
		.replace(/\r?\n/g, " ")
		.trim();
	return JSON.stringify(s);
}

export function renderTemplate(template, vars) {
	return String(template ?? "").replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, key) => {
		const v = vars[key];
		return v == null ? "" : String(v);
	});
}

export function buildVars({ meta, markdown, tags, now = new Date() }) {
	const pad = (n) => String(n).padStart(2, "0");
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	const list = (tags ?? []).map((t) => String(t).trim()).filter(Boolean);
	const title = meta.title ?? "";
	const author = meta.author ?? "";
	const published = meta.published ?? "";
	const description = meta.description ?? "";
	const url = meta.url ?? "";
	const site = meta.site ?? "";
	const host = meta.host ?? "";

	return {
		// 原始值
		title,
		url,
		host,
		site,
		author,
		published,
		description,
		date,
		time,
		year: String(now.getFullYear()),
		month: pad(now.getMonth() + 1),
		day: pad(now.getDate()),
		content: markdown ?? "",
		tags_inline: `[${list.map((t) => JSON.stringify(t)).join(", ")}]`,
		tags_yaml: list.map((t) => `  - ${yamlString(t)}`).join("\n"),
		tags: list.join(", "),
		// YAML 安全值
		title_yaml: yamlString(title),
		url_yaml: yamlString(url),
		site_yaml: yamlString(site),
		author_yaml: yamlString(author),
		published_yaml: yamlString(published),
		description_yaml: yamlString(description),
	};
}
