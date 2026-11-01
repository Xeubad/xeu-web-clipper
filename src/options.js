import { rootHandle, ensurePermission } from "./lib/fs.js";
import { getSettings, saveSettings } from "./lib/settings.js";
import { DEFAULT_TEMPLATE } from "./lib/template.js";

const $ = (id) => document.getElementById(id);
const fields = {
	pathTemplate: $("pathTemplate"),
	filenameTemplate: $("filenameTemplate"),
	conflict: $("conflict"),
	mode: $("mode"),
	defaultTags: $("defaultTags"),
	sanitize: $("sanitize"),
	template: $("template"),
	dirStatus: $("dirStatus"),
	saveStatus: $("saveStatus"),
};

function setDirStatus(text, kind = "") {
	fields.dirStatus.textContent = text;
	fields.dirStatus.className = `status ${kind}`.trim();
}

function setSaveStatus(text, kind = "") {
	fields.saveStatus.textContent = text;
	fields.saveStatus.className = `status ${kind}`.trim();
}

async function showHandle() {
	const handle = await rootHandle.get();
	if (!handle) {
		setDirStatus("未选择目录。点上面的按钮选择 content/");
		return;
	}
	const granted = await ensurePermission(handle, false);
	setDirStatus(
		`当前目录：${handle.name}${granted ? "" : "（需要重新授权，保存时会提示）"}`,
		granted ? "ok" : "",
	);
}

async function init() {
	const settings = await getSettings();
	fields.pathTemplate.value = settings.pathTemplate;
	fields.filenameTemplate.value = settings.filenameTemplate;
	fields.conflict.value = settings.conflict;
	fields.mode.value = settings.mode;
	fields.defaultTags.value = settings.defaultTags;
	fields.sanitize.checked = settings.sanitize;
	fields.template.value = settings.template;
	await showHandle();

	$("pickDir").addEventListener("click", async () => {
		try {
			if (!window.showDirectoryPicker) {
				throw new Error("当前浏览器不支持 File System Access，请用 Chrome / Edge");
			}
			const handle = await window.showDirectoryPicker({
				id: "xeu-content-root",
				mode: "readwrite",
				startIn: "documents",
			});
			await rootHandle.save(handle);
			const granted = await ensurePermission(handle, true);
			setDirStatus(`已选择：${handle.name}${granted ? "" : "（未授权写入）"}`, granted ? "ok" : "error");
		} catch (err) {
			if (err?.name === "AbortError") return;
			setDirStatus(`选择失败：${err.message}`, "error");
		}
	});

	$("clearDir").addEventListener("click", async () => {
		await rootHandle.clear();
		setDirStatus("已清除目录，保存前需要重新选择");
	});

	$("resetTemplate").addEventListener("click", () => {
		fields.template.value = DEFAULT_TEMPLATE;
	});

	$("save").addEventListener("click", async () => {
		await saveSettings({
			pathTemplate: fields.pathTemplate.value.trim(),
			filenameTemplate: fields.filenameTemplate.value.trim(),
			conflict: fields.conflict.value,
			mode: fields.mode.value,
			defaultTags: fields.defaultTags.value.trim(),
			sanitize: fields.sanitize.checked,
			template: fields.template.value,
		});
		setSaveStatus("设置已保存", "ok");
		setTimeout(() => setSaveStatus(""), 2000);
	});
}

init();
