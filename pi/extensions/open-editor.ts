/**
 * Open Editor
 *
 * Opens files from the current working directory in the user's default
 * terminal editor. Resolves the editor from $VISUAL → $EDITOR → vi.
 *
 * Usage:
 *   /edit [path]   Slash command with tab-completion over cwd files.
 *                  No path → opens the current working directory
 *                  (like `nvim .` / `code .`).
 *   ctrl+shift+e   Keyboard shortcut → file picker over cwd.
 *
 * Terminal editors (nvim, vim, nano, helix, emacs, …) block pi while
 * open; the TUI is suspended for full terminal control and resumed on
 * exit. GUI editors (code, cursor, subl, zed, …) are launched detached
 * so pi stays interactive.
 *
 * Strictly user-facing — no LLM-callable tool is registered; agents
 * have built-in `read` and `edit` already.
 */

import { spawn, spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem } from "@mariozechner/pi-tui";

// Editors that open in their own window / don't occupy the terminal.
// We launch these detached so pi keeps running.
const GUI_EDITORS = new Set([
	"code",
	"code-insiders",
	"cursor",
	"windsurf",
	"subl",
	"sublime_text",
	"mate",
	"atom",
	"gedit",
	"kate",
	"zed",
]);

// Directories skipped by the non-git file walk fallback.
const EXCLUDED_DIRS = new Set([
	"node_modules",
	".git",
	".hg",
	".svn",
	"dist",
	"build",
	".next",
	".nuxt",
	"target",
	".venv",
	"venv",
	"__pycache__",
	".tox",
	".mypy_cache",
	".pytest_cache",
	".cache",
	".turbo",
	".parcel-cache",
]);

const MAX_WALK_ENTRIES = 5000;
const LIST_CACHE_MS = 2000;
const MAX_COMPLETIONS = 50;

interface ResolvedEditor {
	command: string;
	argv: string[];
	isGui: boolean;
}

function resolveEditor(): ResolvedEditor {
	const raw = (process.env.VISUAL || process.env.EDITOR || "vi").trim();
	// Simple whitespace split. Covers `EDITOR="nvim -R"`, `EDITOR="code --wait"`.
	// Does not honor POSIX shell quoting — documented limitation.
	const parts = raw.split(/\s+/).filter(Boolean);
	const command = parts[0] || "vi";
	const argv = parts.slice(1);
	const isGui = GUI_EDITORS.has(basename(command).toLowerCase());
	return { command, argv, isGui };
}

// ──────────────────────────────────────────────────────────────────────
// File listing (git ls-files → bounded walk fallback) with small cache
// ──────────────────────────────────────────────────────────────────────

interface CacheEntry {
	at: number;
	files: string[];
}

const listCache = new Map<string, CacheEntry>();
const listInflight = new Map<string, Promise<string[]>>();

function walkFiles(cwd: string): string[] {
	const out: string[] = [];
	const stack: string[] = [""];
	while (stack.length > 0 && out.length < MAX_WALK_ENTRIES) {
		const rel = stack.pop()!;
		const abs = rel ? join(cwd, rel) : cwd;
		let entries;
		try {
			entries = readdirSync(abs, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const e of entries) {
			if (out.length >= MAX_WALK_ENTRIES) break;
			const entryRel = rel ? `${rel}/${e.name}` : e.name;
			if (e.isDirectory()) {
				if (EXCLUDED_DIRS.has(e.name)) continue;
				stack.push(entryRel);
			} else if (e.isFile()) {
				out.push(entryRel);
			}
		}
	}
	return out.sort();
}

async function listFiles(pi: ExtensionAPI, cwd: string): Promise<string[]> {
	const cached = listCache.get(cwd);
	const now = Date.now();
	if (cached && now - cached.at < LIST_CACHE_MS) return cached.files;

	const inflight = listInflight.get(cwd);
	if (inflight) return inflight;

	const p = (async (): Promise<string[]> => {
		let files: string[] = [];
		try {
			const res = await pi.exec(
				"git",
				["ls-files", "-co", "--exclude-standard"],
				{ timeout: 2000, cwd },
			);
			if (res.code === 0 && res.stdout) {
				files = res.stdout.split("\n").map((s) => s.trim()).filter(Boolean).sort();
			}
		} catch {
			// fall through to walk
		}
		if (files.length === 0) {
			files = walkFiles(cwd);
		}
		listCache.set(cwd, { at: Date.now(), files });
		return files;
	})();

	listInflight.set(cwd, p);
	try {
		return await p;
	} finally {
		listInflight.delete(cwd);
	}
}

/** Synchronous accessor for tab-completion. Kicks off async refresh if cold. */
function listFilesSync(pi: ExtensionAPI, cwd: string): string[] | null {
	const cached = listCache.get(cwd);
	if (cached && Date.now() - cached.at < LIST_CACHE_MS) return cached.files;
	// Prime cache in background; return whatever we have (possibly stale).
	void listFiles(pi, cwd);
	return cached ? cached.files : null;
}

// ──────────────────────────────────────────────────────────────────────
// Open + picker
// ──────────────────────────────────────────────────────────────────────

async function openFile(ctx: ExtensionContext, relPath: string): Promise<void> {
	const absPath = resolve(ctx.cwd, relPath);
	let isDir = false;
	try {
		const s = statSync(absPath);
		if (s.isDirectory()) {
			isDir = true;
		} else if (!s.isFile()) {
			ctx.ui.notify(`Not a file or directory: ${relPath}`, "error");
			return;
		}
	} catch {
		ctx.ui.notify(`Path not found: ${relPath}`, "error");
		return;
	}
	void isDir; // reserved for future per-kind behavior; editors handle both uniformly

	const editor = resolveEditor();

	if (editor.isGui) {
		try {
			const child = spawn(editor.command, [...editor.argv, absPath], {
				detached: true,
				stdio: "ignore",
				env: process.env,
				cwd: ctx.cwd,
			});
			child.on("error", (err) => {
				ctx.ui.notify(`Editor failed: ${err.message}`, "error");
			});
			child.unref();
			ctx.ui.notify(`Opened ${relPath || "."} in ${editor.command}`, "info");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(`Failed to launch ${editor.command}: ${msg}`, "error");
		}
		return;
	}

	// Terminal editor: suspend TUI, run blocking, resume.
	if (!ctx.hasUI) {
		ctx.ui.notify("Terminal editor requires an interactive TUI", "error");
		return;
	}

	const exitCode = await ctx.ui.custom<number | null>((tui, _theme, _kb, done) => {
		tui.stop();
		process.stdout.write("\x1b[2J\x1b[H");
		let status: number | null = null;
		let spawnError: Error | null = null;
		try {
			const result = spawnSync(editor.command, [...editor.argv, absPath], {
				stdio: "inherit",
				env: process.env,
				cwd: ctx.cwd,
			});
			if (result.error) spawnError = result.error;
			status = result.status;
		} catch (err) {
			spawnError = err instanceof Error ? err : new Error(String(err));
		}
		tui.start();
		tui.requestRender(true);
		if (spawnError) {
			// Surface after TUI comes back so the toast renders.
			queueMicrotask(() =>
				ctx.ui.notify(`Failed to launch ${editor.command}: ${spawnError!.message}`, "error"),
			);
		}
		done(status);
		return { render: () => [], invalidate: () => {} };
	});

	if (exitCode != null && exitCode !== 0) {
		ctx.ui.notify(`${editor.command} exited with code ${exitCode}`, "warning");
	}
}

async function pickAndOpen(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const files = await listFiles(pi, ctx.cwd);
	if (files.length === 0) {
		ctx.ui.notify("No files found in cwd", "warning");
		return;
	}
	const choice = await ctx.ui.select("Open file", files);
	if (!choice) return;
	await openFile(ctx, choice);
}

// ──────────────────────────────────────────────────────────────────────
// Extension entrypoint
// ──────────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	// Warm the file list cache on session start so the first tab-complete
	// and the first ctrl+e feel instant.
	pi.on("session_start", (_event, ctx) => {
		void listFiles(pi, ctx.cwd);
	});

	pi.registerCommand("edit", {
		description: "Open a file in $VISUAL/$EDITOR (no arg = picker)",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			// Best-effort synchronous lookup; primes cache in background.
			// ctx.cwd not available here — fall back to process.cwd().
			const files = listFilesSync(pi, process.cwd());
			if (!files) return null;
			const matches = files.filter((f) => f.startsWith(prefix)).slice(0, MAX_COMPLETIONS);
			if (matches.length === 0) return null;
			return matches.map((value) => ({ value, label: value }));
		},
		handler: async (args, ctx) => {
			const target = (args ?? "").trim();
			// No arg: open cwd in the editor (like `nvim .` / `code .`).
			await openFile(ctx, target === "" ? "." : target);
		},
	});

	pi.registerShortcut("ctrl+shift+e", {
		description: "Open file in $VISUAL/$EDITOR",
		handler: async (ctx) => {
			await pickAndOpen(pi, ctx);
		},
	});
}
