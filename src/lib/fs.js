/**
 * File System Access：目录句柄持久化 + 写入 Markdown
 */

const DB_NAME = "xeu-clipper";
const STORE = "handles";
const ROOT_KEY = "root";

function openDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function putHandle(handle) {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(handle, ROOT_KEY);
		tx.oncomplete = resolve;
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}

async function getHandle() {
	const db = await openDb();
	const handle = await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).get(ROOT_KEY);
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return handle;
}

async function deleteHandle() {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(ROOT_KEY);
		tx.oncomplete = resolve;
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}

export const rootHandle = {
	save: putHandle,
	get: getHandle,
	clear: deleteHandle,
};

export async function ensurePermission(handle, request = false) {
	const opts = { mode: "readwrite" };
	let state = await handle.queryPermission(opts);
	if (state === "granted") return true;
	if (!request) return false;
	state = await handle.requestPermission(opts);
	return state === "granted";
}

async function exists(dir, name) {
	try {
		await dir.getFileHandle(name, { create: false });
		return true;
	} catch (err) {
		if (err?.name === "NotFoundError") return false;
		throw err;
	}
}

function withSuffix(name, n) {
	return name.replace(/(\.md)$/i, `-${n}$1`);
}

/**
 * @param {FileSystemDirectoryHandle} root 用户选择的 content/ 目录
 * @param {string[]} segments 相对目录片段
 * @param {string} filename 已清洗的文件名（.md）
 * @param {string} content
 * @param {"rename"|"overwrite"|"skip"} conflict
 */
export async function writeMarkdown({ root, segments, filename, content, conflict = "rename" }) {
	let dir = root;
	for (const seg of segments) {
		dir = await dir.getDirectoryHandle(seg, { create: true });
	}

	let name = filename;
	const taken = await exists(dir, name);
	if (taken) {
		if (conflict === "skip") throw new Error(`文件已存在：${name}`);
		if (conflict === "rename") {
			let i = 2;
			while (await exists(dir, withSuffix(filename, i))) i++;
			name = withSuffix(filename, i);
		}
	}

	const file = await dir.getFileHandle(name, { create: true });
	const writable = await file.createWritable();
	await writable.write(content);
	await writable.close();

	return { filename: name, path: [...segments, name].join("/") };
}
