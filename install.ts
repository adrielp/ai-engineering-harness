#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
/**
 * AI Engineering Harness Installer
 *
 * Install as CLI (recommended):
 *   deno install -Agf -n ai-harness \
 *     https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts
 *   ai-harness --tool=claude
 *
 * Direct run:
 *   deno run -A install.ts --tool=claude
 *
 * Private repos — clone and run:
 *   gh repo clone <org>/ai-engineering-harness /tmp/aih -- --depth=1 -q
 *   GITHUB_TOKEN=$(gh auth token) deno run -A /tmp/aih/install.ts --tool=claude
 *   rm -rf /tmp/aih
 *
 * Run --help for full usage.
 */

import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEntry {
  src: string;
  dest: string;
}

interface Component {
  description: string;
  files: FileEntry[];
}

interface ToolConfig {
  target: string;
  components: Record<string, Component>;
}

interface Manifest {
  version: string;
  tools: Record<string, ToolConfig>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function resolveToken(): string | null {
  // 1. GITHUB_TOKEN env var (CI-friendly, standard convention)
  const envToken = Deno.env.get("GITHUB_TOKEN") ?? Deno.env.get("GH_TOKEN");
  if (envToken) return envToken;
  // 2. No token — unauthenticated (works for public repos)
  return null;
}

function fetchWithAuth(url: string, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
    return home + p.slice(1);
  }
  return p;
}

function isRemote(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/** Derive the base raw GitHub URL from the script's import.meta.url */
function deriveBaseUrl(): string | null {
  const url = import.meta.url;
  if (!isRemote(url)) return null;
  // e.g. https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<SHA>/install.ts
  return url.slice(0, url.lastIndexOf("/") + 1);
}

async function loadManifest(baseUrl: string | null, token: string | null): Promise<Manifest> {
  if (baseUrl) {
    const manifestUrl = `${baseUrl}manifest.json`;
    const resp = await fetchWithAuth(manifestUrl, token);
    if (!resp.ok) {
      if ((resp.status === 403 || resp.status === 404) && !token) {
        throw new Error(
          `Failed to fetch manifest (${resp.status}). If this is a private repository, clone and run locally:\n\n` +
          `  gh repo clone <org>/ai-engineering-harness /tmp/aih -- --depth=1 -q\n` +
          `  GITHUB_TOKEN=$(gh auth token) deno run -A /tmp/aih/install.ts --tool=<tool>\n` +
          `  rm -rf /tmp/aih`
        );
      }
      throw new Error(`Failed to fetch manifest from ${manifestUrl}: ${resp.status} ${resp.statusText}`);
    }
    return resp.json() as Promise<Manifest>;
  }
  // Local mode: read from filesystem relative to CWD
  const text = await Deno.readTextFile("manifest.json");
  return JSON.parse(text) as Manifest;
}

async function readFileIfExists(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}

async function fetchRemoteFile(baseUrl: string, src: string, token: string | null): Promise<string> {
  const url = `${baseUrl}${src}`;
  const resp = await fetchWithAuth(url, token);
  if (!resp.ok) {
    if ((resp.status === 403 || resp.status === 404) && !token) {
      throw new Error(
        `Failed to fetch ${src} (${resp.status}). Private repo? Set GITHUB_TOKEN=$(gh auth token)`
      );
    }
    throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
  }
  return resp.text();
}

/**
 * LCS-based unified diff. Computes the longest common subsequence of lines
 * and renders added/removed lines with +/- prefixes.
 */
function renderDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce diff
  const lines: string[] = [];
  let i = m, j = n;
  const stack: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push(`  ${oldLines[i - 1]}`);
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push(`+ ${newLines[j - 1]}`);
      j--;
    } else {
      stack.push(`- ${oldLines[i - 1]}`);
      i--;
    }
  }
  // Reverse since we backtracked
  for (let k = stack.length - 1; k >= 0; k--) {
    lines.push(stack[k]);
  }
  return lines.join("\n");
}

async function readLine(): Promise<string> {
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(1);
  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break;
    if (buf[0] === 10) break; // newline
    chunks.push(buf.slice());
  }
  return new TextDecoder().decode(new Uint8Array(chunks.flatMap((c) => [...c]))).trim();
}

async function promptConfirm(message: string): Promise<boolean> {
  Deno.stdout.writeSync(new TextEncoder().encode(`${message} [y/N] `));
  const input = await readLine();
  return input === "y" || input === "Y";
}

function printHelp(): void {
  console.log(`
AI Engineering Harness Installer

INSTALL AS CLI (recommended, one-time):
  deno install -Agf -n ai-harness \\
    https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts

  Then run:
    ai-harness --tool=claude
    ai-harness --tool=all --interactive

PRIVATE / ENTERPRISE REPOS (clone and run):
  gh repo clone <org>/ai-engineering-harness /tmp/aih -- --depth=1 -q
  GITHUB_TOKEN=$(gh auth token) deno run -A /tmp/aih/install.ts --tool=claude
  rm -rf /tmp/aih

  GITHUB_TOKEN authenticates manifest/file fetches for private content.
  gh handles all git auth automatically.

DIRECT RUN (no install step):
  deno run --allow-read --allow-write --allow-net --allow-env install.ts [options]

OPTIONS:
  --tool=<claude|opencode|gemini|pi|all> Which tool configs to install (required)
  --skill=<name>[,<name>]               Specific component names to install
  --interactive, -i                     Interactive checkbox picker
  --dry-run, -n                         Preview without writing files
  --yes, -y                             Skip confirmation prompts
  --mode=repo                           Show clone+stow instructions instead
  --dest=<path>                         Clone destination for --mode=repo
  --help, -h                            Show this help

EXAMPLES:
  ai-harness --tool=claude                        # Install Claude Code configs
  ai-harness --tool=claude --dry-run              # Preview changes
  ai-harness --tool=claude --skill=agents         # Install only agents
  ai-harness --tool=claude --interactive          # Pick components
  ai-harness --tool=all                           # Install all tools
  ai-harness --mode=repo                          # Clone + stow instructions
`.trim());
}

function printRepoModeInstructions(dest: string): void {
  const expanded = expandHome(dest);
  console.log(`
Repo / Power-User Mode (GNU Stow)
==================================
This mode clones the repository and uses GNU Stow to create symlinks.
The repo must remain at a stable path on your system.

  1. Install GNU Stow:
       macOS:          brew install stow
       Ubuntu/Debian:  sudo apt install stow
       Fedora:         sudo dnf install stow
       Arch:           sudo pacman -S stow

  2. Clone the repository:
       git clone https://github.com/adrielp/ai-engineering-harness.git ${expanded}
       cd ${expanded}

  3. Install symlinks:
       ./setup.sh claude             # Claude Code
       ./setup.sh opencode           # OpenCode
       ./setup.sh gemini             # Gemini CLI
       ./setup.sh pi                 # Pi
       ./setup.sh all                # All four

  4. Update after pulling changes:
       ./setup.sh all --restow
`.trim());
}

// ---------------------------------------------------------------------------
// Interactive picker using stdin (no external dependency)
// ---------------------------------------------------------------------------

async function interactivePicker(components: Array<{ name: string; description: string }>): Promise<string[]> {
  // Minimal TTY-based checkbox: render options, user types space-separated indices
  console.log("\nAvailable components (enter numbers separated by spaces, or 'all'):\n");
  components.forEach((c, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${c.name}] ${c.description}`);
  });
  console.log();

  Deno.stdout.writeSync(new TextEncoder().encode("Select (e.g. 1 3 5, or 'all'): "));
  const input = await readLine();

  if (input.toLowerCase() === "all") {
    return components.map((c) => c.name);
  }

  const indices = input.split(/\s+/).map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= components.length);
  return indices.map((i) => components[i - 1].name);
}

// ---------------------------------------------------------------------------
// Core installer
// ---------------------------------------------------------------------------

interface InstallOptions {
  tool: string;
  skills: string[];
  interactive: boolean;
  dryRun: boolean;
  yes: boolean;
  baseUrl: string | null;
  token: string | null;
}

async function installTool(manifest: Manifest, toolName: string, opts: InstallOptions): Promise<void> {
  const toolConfig = manifest.tools[toolName];
  if (!toolConfig) {
    console.error(`Unknown tool: "${toolName}". Available: ${Object.keys(manifest.tools).join(", ")}`);
    Deno.exit(1);
  }

  const targetDir = expandHome(toolConfig.target);
  const allComponents = Object.entries(toolConfig.components).map(([name, comp]) => ({
    name,
    description: comp.description,
    files: comp.files,
  }));

  let selectedComponents = allComponents;

  if (opts.skills.length > 0) {
    selectedComponents = allComponents.filter((c) => opts.skills.includes(c.name));
    const unknown = opts.skills.filter((s) => !allComponents.find((c) => c.name === s));
    if (unknown.length > 0) {
      console.warn(`  Warning: unknown components for ${toolName}: ${unknown.join(", ")}`);
      console.warn(`  Available: ${allComponents.map((c) => c.name).join(", ")}`);
    }
    if (selectedComponents.length === 0) {
      console.error(`  No valid components matched. Skipping ${toolName}.`);
      return;
    }
  } else if (opts.interactive) {
    const chosen = await interactivePicker(allComponents);
    selectedComponents = allComponents.filter((c) => chosen.includes(c.name));
    if (selectedComponents.length === 0) {
      console.log("No components selected. Skipping.");
      return;
    }
  }

  console.log(`\nInstalling ${toolName} → ${targetDir}`);
  if (opts.dryRun) {
    console.log("  (dry run — no files will be written)\n");
  }

  let installed = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const comp of selectedComponents) {
    // Warn before installing user-specific config files in the default flow
    if (comp.name === "settings" && !opts.yes && opts.skills.length === 0) {
      console.log(`\n  ⚠ The "settings" component contains tool-specific config files`);
      console.log(`    (settings.json, .mcp.json) that may overwrite your existing settings.`);
      if (opts.dryRun) {
        console.log("  [dry-run] would prompt for confirmation");
      } else {
        const ok = await promptConfirm(`  Install settings component?`);
        if (!ok) {
          console.log("  Skipped settings component.");
          skipped += comp.files.length;
          continue;
        }
      }
    }

    for (const fileEntry of comp.files) {
      const destPath = `${targetDir}/${fileEntry.dest}`;

      // Get source content
      let srcContent: string;
      if (opts.baseUrl) {
        srcContent = await fetchRemoteFile(opts.baseUrl, fileEntry.src, opts.token);
      } else {
        srcContent = await Deno.readTextFile(fileEntry.src);
      }

      // Check existing destination
      const existingContent = await readFileIfExists(destPath);

      if (existingContent !== null && existingContent === srcContent) {
        console.log(`  ✓ unchanged  ${fileEntry.dest}`);
        unchanged++;
        continue;
      }

      if (existingContent !== null && existingContent !== srcContent) {
        // Show diff and prompt
        console.log(`\n  ~ conflict   ${fileEntry.dest}`);
        if (!opts.yes) {
          const diff = renderDiff(existingContent, srcContent);
          console.log("  --- existing");
          console.log("  +++ incoming");
          console.log(diff.split("\n").map((l) => "  " + l).join("\n"));
          console.log();

          if (opts.dryRun) {
            console.log("  [dry-run] would overwrite");
            installed++;
            continue;
          }

          const ok = await promptConfirm(`  Overwrite ${fileEntry.dest}?`);
          if (!ok) {
            console.log("  Skipped.");
            skipped++;
            continue;
          }
        }
      }

      if (opts.dryRun) {
        const action = existingContent === null ? "create" : "overwrite";
        console.log(`  + ${action.padEnd(9)}  ${fileEntry.dest}`);
        installed++;
        continue;
      }

      await ensureDir(destPath.slice(0, destPath.lastIndexOf("/")));
      await Deno.writeTextFile(destPath, srcContent);
      const action = existingContent === null ? "installed" : "updated";
      console.log(`  ✓ ${action.padEnd(9)}  ${fileEntry.dest}`);
      installed++;
    }
  }

  console.log(`\n  ${toolName}: ${installed} installed/updated, ${unchanged} unchanged, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args = parseArgs(Deno.args, {
  string: ["tool", "skill", "dest", "mode"],
  boolean: ["interactive", "dry-run", "yes", "help"],
  alias: { h: "help", n: "dry-run", y: "yes", i: "interactive" },
});

if (args.help) {
  printHelp();
  Deno.exit(0);
}

if (args.mode === "repo") {
  const dest = (args.dest as string | undefined) ?? "~/.ai-engineering-harness";
  printRepoModeInstructions(dest);
  Deno.exit(0);
}

if (!args.tool) {
  console.error("Error: --tool is required.\n");
  printHelp();
  Deno.exit(1);
}

const baseUrl = deriveBaseUrl();
const token = resolveToken();
const manifest = await loadManifest(baseUrl, token);

const skillFilter: string[] = args.skill
  ? String(args.skill).split(",").map((s: string) => s.trim()).filter(Boolean)
  : [];

const installOpts: InstallOptions = {
  tool: String(args.tool),
  skills: skillFilter,
  interactive: Boolean(args.interactive),
  dryRun: Boolean(args["dry-run"]),
  yes: Boolean(args.yes),
  baseUrl,
  token,
};

const toolArg = String(args.tool);
const toolsToInstall = toolArg === "all" ? Object.keys(manifest.tools) : [toolArg];

for (const tool of toolsToInstall) {
  await installTool(manifest, tool, installOpts);
}

console.log("\nDone.");
