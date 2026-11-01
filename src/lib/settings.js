import { DEFAULT_TEMPLATE } from "./template.js";

export const DEFAULTS = {
	pathTemplate: "原始资料/文章",
	filenameTemplate: "{{title}}",
	template: DEFAULT_TEMPLATE,
	defaultTags: "clippings",
	conflict: "rename", // rename | overwrite | skip
	mode: "readability", // readability | selection
	sanitize: true,
};

export async function getSettings() {
	const stored = await chrome.storage.local.get(DEFAULTS);
	return { ...DEFAULTS, ...stored };
}

export async function saveSettings(patch) {
	await chrome.storage.local.set(patch);
}

export function parseTags(input) {
	return String(input ?? "")
		.split(/[,，]/)
		.map((s) => s.trim())
		.filter(Boolean);
}
