"use client";

import { useState, useRef, DragEvent } from "react";
import Header from "@/components/Header";
import { LanguageProvider } from "@/i18n/LanguageContext";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  X,
} from "lucide-react";

interface ImportResponse {
  ok?: boolean;
  error?: string;
  stats?: {
    totalRows: number;
    validRows: number;
    skipped: number;
    districts: number;
    projects: number;
    communities: number;
    fileSizeBytes: number;
  };
  commits?: { transactions?: string; hierarchy?: string };
  message?: string;
}

function AdminUploadContent() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setResult({ error: "Only .csv files are supported" });
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    if (!file || !password) return;
    setBusy(true);
    setBusyText("Compressing CSV…");
    setResult(null);
    try {
      // Gzip the CSV in the browser so the Vercel 4.5MB body limit
      // becomes a 25-30MB CSV limit instead. CompressionStream is
      // supported in all modern browsers (Chrome 80+, FF 113+, Safari 16.4+).
      let payload: Blob = file;
      let compressedFlag = "";
      if (typeof CompressionStream !== "undefined") {
        try {
          const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
          payload = await new Response(stream).blob();
          compressedFlag = "gzip";
        } catch {
          // Fall back to uncompressed upload if compression fails
          payload = file;
        }
      }
      setBusyText("Uploading & processing on server…");

      const fd = new FormData();
      fd.append("file", payload, file.name);
      fd.append("password", password);
      fd.append("originalSize", String(file.size));
      if (compressedFlag) fd.append("compressed", compressedFlag);

      const res = await fetch("/api/admin/import-csv", {
        method: "POST",
        body: fd,
      });

      // Server may return non-JSON on infra errors (413 from Vercel proxy,
      // 504 timeout, etc.) — handle gracefully.
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        const sizeMb = (file.size / 1024 / 1024).toFixed(1);
        setResult({
          error:
            res.status === 413
              ? `File too large (${sizeMb} MB). Even after gzip compression the upload exceeds Vercel's 4.5MB limit. Use the CLI flow instead — see docs/UPDATE_DATA.md.`
              : `Server returned ${res.status} ${res.statusText}. ${text.slice(0, 200)}`,
        });
        return;
      }

      const json: ImportResponse = await res.json();
      setResult(json);
      if (res.ok) setFile(null);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
      setBusyText("");
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Lock className="h-5 w-5 text-accent" />
            Admin — Update Transaction Data
          </h1>
          <p className="mt-1 text-sm text-muted">
            Upload a fresh ADREC CSV. The server parses it, commits the
            JSON to GitHub, and Vercel auto-redeploys (~2 min after upload).
          </p>
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Admin password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set in Vercel env: ADMIN_PASSWORD"
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>

        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/10"
              : file
              ? "border-positive/50 bg-positive/5"
              : "border-card-border bg-card-bg hover:border-accent/50 hover:bg-accent/5"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-positive" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="rounded-full p-1 text-muted hover:bg-input-bg"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="mx-auto mb-2 h-10 w-10 text-muted" />
              <p className="text-sm font-semibold text-foreground">
                Drop your CSV here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted">
                Standard ADREC export format · max 4 MB
              </p>
            </>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!file || !password || busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? busyText || "Working…" : "Upload & deploy"}
        </button>

        {/* Result */}
        {result && result.ok && result.stats && (
          <div className="mt-6 rounded-xl border border-positive/40 bg-positive/10 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-positive" />
              <p className="text-sm font-semibold text-positive">Success — committed to GitHub</p>
            </div>
            <p className="mb-3 text-sm text-foreground">{result.message}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Valid rows" value={result.stats.validRows.toLocaleString()} />
              <Stat label="Skipped" value={result.stats.skipped.toLocaleString()} />
              <Stat label="Districts" value={result.stats.districts.toString()} />
              <Stat label="Projects" value={result.stats.projects.toString()} />
              <Stat label="Communities" value={result.stats.communities.toString()} />
              <Stat label="JSON size" value={`${(result.stats.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`} />
            </div>
            {result.commits && (
              <div className="mt-3 space-y-1 text-xs">
                {result.commits.transactions && (
                  <a href={result.commits.transactions} target="_blank" rel="noreferrer" className="block text-accent hover:underline">
                    View transactions.json commit →
                  </a>
                )}
                {result.commits.hierarchy && (
                  <a href={result.commits.hierarchy} target="_blank" rel="noreferrer" className="block text-accent hover:underline">
                    View hierarchy.json commit →
                  </a>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Vercel detects the push and rebuilds in ~2 min. Check{" "}
              <a href="https://adxb-interact.vercel.app/" target="_blank" rel="noreferrer" className="text-accent underline">
                production
              </a>{" "}
              after the deploy completes.
            </p>
          </div>
        )}

        {result && result.error && (
          <div className="mt-6 rounded-xl border border-negative/40 bg-negative/10 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-negative" />
              <p className="text-sm font-semibold text-negative">Upload failed</p>
            </div>
            <p className="text-sm text-foreground">{result.error}</p>
            {result.stats && (
              <p className="mt-2 text-xs text-muted">
                Parsed {result.stats.validRows} rows, skipped {result.stats.skipped}.
              </p>
            )}
          </div>
        )}

        {/* Setup instructions */}
        <details className="mt-8 rounded-lg border border-card-border bg-card-bg p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            First time? Set these env vars in Vercel
          </summary>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-foreground">
            <p>In your Vercel project → Settings → Environment Variables, add:</p>
            <ul className="ms-4 list-disc space-y-1.5 text-muted">
              <li><code className="rounded bg-input-bg px-1.5 py-0.5 text-foreground">ADMIN_PASSWORD</code> — any strong secret you choose</li>
              <li><code className="rounded bg-input-bg px-1.5 py-0.5 text-foreground">GITHUB_TOKEN</code> — fine-grained PAT with <strong>Contents: Read &amp; write</strong> on this repo (<a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noreferrer" className="text-accent underline">create one here</a>)</li>
              <li><code className="rounded bg-input-bg px-1.5 py-0.5 text-foreground">GITHUB_OWNER</code> = <code>Leovech</code></li>
              <li><code className="rounded bg-input-bg px-1.5 py-0.5 text-foreground">GITHUB_REPO</code> = <code>adxb-interact</code></li>
              <li><code className="rounded bg-input-bg px-1.5 py-0.5 text-foreground">GITHUB_BRANCH</code> = <code>main</code> (optional)</li>
            </ul>
            <p className="text-muted">After saving env vars, Vercel needs a redeploy for them to apply.</p>
          </div>
        </details>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function AdminUploadPage() {
  return (
    <LanguageProvider>
      <AdminUploadContent />
    </LanguageProvider>
  );
}
