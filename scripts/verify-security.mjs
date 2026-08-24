import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyCredentialPattern = [
  "AKIA[0-9A-Z]{16}",
  "ASIA[0-9A-Z]{16}",
  "gh[pousr]_[A-Za-z0-9_]{20,}",
  "github_pat_[A-Za-z0-9_]{20,}",
  "-----BEGIN [A-Z ]*PRIVATE KEY-----",
  "sk-[A-Za-z0-9]{20,}",
  "postgres(ql)?://[^[:space:]@/]+:[^[:space:]@/]+@",
].join("|");
const trackedCredentialPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /ASIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{20,}/,
  /postgres(?:ql)?:\/\/[^\s@/]+:[^\s@/]+@/,
];
const textExtensions = new Set([".css", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".yml", ".yaml"]);
const findings = new Set();

function git(args, allowNoMatches = false) {
  try {
    return execFileSync("git", ["-c", `safe.directory=${projectRoot}`, ...args], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowNoMatches && error && typeof error === "object" && "status" in error && error.status === 1) return "";
    throw error;
  }
}

function addFinding(description, file) {
  findings.add(`${description}: ${file}`);
}

const trackedFiles = git(["ls-files", "-z"]).split("\0").filter(Boolean);
for (const file of trackedFiles) {
  if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example") {
    addFinding("Tracked environment file", file);
  }
  if (/\.(?:key|pem|p12|pfx)$/i.test(file)) {
    addFinding("Tracked private-key or certificate file", file);
  }
  if (file.startsWith("public/") && /(?:^|\/)(?:data|source|dataset|terraria-dataset)(?:\/|$)/i.test(file)) {
    addFinding("Raw dataset published from public", file);
  }

  const fullPath = path.join(projectRoot, file);
  if (!existsSync(fullPath) || !textExtensions.has(path.extname(file))) continue;
  const content = readFileSync(fullPath, "utf8");

  if (trackedCredentialPatterns.some((pattern) => pattern.test(content))) {
    addFinding("Supported credential pattern in tracked file", file);
  }
  if (file.startsWith("src/") && content.includes("dangerouslySetInnerHTML")) {
    addFinding("Unsafe HTML rendering API", file);
  }
  if (file.startsWith("src/app/api/") && content.includes(".formData(")) {
    addFinding("Unexpected file-upload API route", file);
  }
  if (file.startsWith("src/") && /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)/.test(content)) {
    addFinding("Public client environment variable suggests a secret", file);
  }
}

for (const commit of git(["rev-list", "--all"]).trim().split("\n").filter(Boolean)) {
  const paths = git(["grep", "-I", "-l", "-E", historyCredentialPattern, commit, "--"], true)
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const file of paths) {
    addFinding(`Supported credential pattern in Git history at ${commit.slice(0, 12)}`, file);
  }
}

if (findings.size > 0) {
  console.error("Security verification failed. No credential values are printed.");
  for (const finding of [...findings].sort()) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Security verification passed: no supported credential patterns or unsafe repository boundaries found.");
}
