import fs from "node:fs";
import path from "node:path";
import { build, context } from "esbuild";

const watch = process.argv.includes("--watch");
const outDir = "dist";

if (!watch) fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const common = {
	bundle: true,
	target: ["chrome110"],
	format: "iife",
	logLevel: "info",
	sourcemap: false,
};

const entries = [
	{ entryPoints: ["src/content.js"], outfile: `${outDir}/content.js`, globalName: "XeuClipper" },
	{ entryPoints: ["src/popup.js"], outfile: `${outDir}/popup.js` },
	{ entryPoints: ["src/options.js"], outfile: `${outDir}/options.js` },
];

function copyStatic() {
	for (const file of ["manifest.json", "popup.html", "options.html", "popup.css", "options.css"]) {
		fs.copyFileSync(path.join("src", file), path.join(outDir, file));
	}
	fs.cpSync("src/icons", path.join(outDir, "icons"), { recursive: true });
}

copyStatic();

if (watch) {
	const contexts = await Promise.all(entries.map((entry) => context({ ...common, ...entry })));
	await Promise.all(contexts.map((ctx) => ctx.watch()));
	console.log("watching…");
} else {
	await Promise.all(entries.map((entry) => build({ ...common, ...entry })));
	console.log(`built → ${outDir}`);
}
