"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Clipboard,
  Clock3,
  CloudUpload,
  Download,
  FileSearch,
  FileText,
  Flag,
  Gauge,
  Home,
  ListChecks,
  Loader2,
  Scale,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useMemo, useState } from "react";

import type { AnalysisResult } from "@/lib/ai/schemas";
import {
  MAX_DOCUMENT_CHARS,
  SINGLE_PASS_DOCUMENT_CHARS,
} from "@/lib/document/limits";
import { estimateTokens } from "@/lib/document/metrics";
import { SAMPLE_CONTRACT } from "@/lib/sample-contract";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

type AnalyzeResponse = {
  analysisId: string;
  documentId: string;
  result: AnalysisResult;
  model: string;
  usage: { inputTokens?: number; outputTokens?: number };
  warnings: string[];
  document: {
    characterCount: number;
    estimatedTokens: number;
    storedFullText: boolean;
  };
};

type ExtractResponse = {
  text: string;
  filename: string | null;
  extension: ".txt" | ".pdf" | ".docx";
  characterCount: number;
  estimatedTokens: number;
  warning: string | null;
};

const verdictStyles = {
  favorable: {
    label: "Favorable",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    badgeTone: "green" as const,
  },
  neutral: {
    label: "Neutral",
    className: "border-cyan-200 bg-cyan-50 text-cyan-950",
    badgeTone: "blue" as const,
  },
  risky: {
    label: "Risky",
    className: "border-red-200 bg-red-50 text-red-950",
    badgeTone: "red" as const,
  },
};

export function ClarityDocApp() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#07142f]">
      <LandingHero />
    </main>
  );
}

export function ClarityDocDashboard() {
  const [text, setText] = useState("");
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [inputSource, setInputSource] = useState<"paste" | "upload" | "sample">(
    "paste",
  );
  const [storeFullText, setStoreFullText] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const stats = useMemo(
    () => ({
      characters: text.length,
      estimatedTokens: estimateTokens(text),
      isTooLarge: text.length > MAX_DOCUMENT_CHARS,
      willChunk: text.length > SINGLE_PASS_DOCUMENT_CHARS,
    }),
    [text],
  );

  function loadSampleContract() {
    setText(SAMPLE_CONTRACT);
    setOriginalFilename(null);
    setInputSource("sample");
    setAnalysis(null);
    setError(null);
    setNotice("Sample contract loaded.");
  }

  async function extractFileText() {
    if (!file) {
      setError("Choose a .txt, .pdf, or .docx file first.");
      return;
    }

    setIsExtracting(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents/extract", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiEnvelope<ExtractResponse>;

      if (!body.ok) {
        throw new Error(body.error);
      }

      setText(body.data.text);
      setOriginalFilename(body.data.filename);
      setInputSource("upload");
      setAnalysis(null);
      setNotice(
        body.data.warning ??
          `Extracted ${body.data.characterCount.toLocaleString()} characters.`,
      );
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "File extraction failed.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function analyze() {
    if (!text.trim()) {
      setError("Paste text, load the sample, or extract an uploaded document.");
      return;
    }

    if (stats.isTooLarge) {
      setError(
        "This document is too large for analysis. Split it into smaller files.",
      );
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setNotice(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/documents/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          originalFilename,
          inputSource,
          storeFullText,
        }),
      });
      const body = (await response.json()) as ApiEnvelope<AnalyzeResponse>;

      if (!body.ok) {
        throw new Error(body.error);
      }

      setAnalysis(body.data);
      setNotice(body.data.warnings[0] ?? "Analysis complete.");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Analysis failed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function downloadJson() {
    if (!analysis) {
      return;
    }

    const blob = new Blob([JSON.stringify(analysis.result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `claritydoc-analysis-${analysis.analysisId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function analyzeAnother() {
    setText("");
    setOriginalFilename(null);
    setInputSource("paste");
    setFile(null);
    setAnalysis(null);
    setError(null);
    setNotice(null);
  }

  return (
    <DashboardShell onNewAnalysis={analyzeAnother}>
      <section id="analyzer" className="space-y-6">
        <div className="w-full space-y-6">
          {!analysis ? (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <Badge tone="blue">Document analyzer</Badge>
                  <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
                    New contract analysis
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Upload or paste a business document. ClarityDoc will turn it
                    into a summary, risk review, obligations, deadlines, and
                    before-signing actions.
                  </p>
                </div>
                <Button variant="secondary" onClick={loadSampleContract}>
                  <FileText aria-hidden="true" className="h-4 w-4" />
                  Load sample contract
                </Button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="overflow-hidden">
                  <CardHeader className="items-start">
                    <div>
                      <CardTitle>Analyze a Document</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Add a document, review extracted text, then analyze.
                      </p>
                    </div>
                    <Badge tone={stats.willChunk ? "amber" : "slate"}>
                      {stats.characters.toLocaleString()} chars
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ProgressSteps
                      activeStep={isAnalyzing ? "analyze" : "add"}
                    />

                    <Tabs defaultValue="paste">
                      <TabsList
                        aria-label="Document input methods"
                        className="mt-5 grid w-full grid-cols-2"
                      >
                        <TabsTrigger value="paste">Paste Text</TabsTrigger>
                        <TabsTrigger value="upload">Upload File</TabsTrigger>
                      </TabsList>
                      <TabsContent value="paste">
                        <label
                          htmlFor="document-text"
                          className="text-sm font-semibold text-slate-900"
                        >
                          Contract or document text
                        </label>
                        <textarea
                          id="document-text"
                          value={text}
                          onChange={(event) => {
                            setText(event.target.value);
                            setInputSource("paste");
                            setOriginalFilename(null);
                            setAnalysis(null);
                          }}
                          className="mt-2 min-h-72 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="Paste contract, NDA, lease, SOW, vendor agreement, or clinic paperwork..."
                        />
                      </TabsContent>
                      <TabsContent value="upload">
                        <label
                          htmlFor="document-upload"
                          className="text-sm font-semibold text-slate-900"
                        >
                          Upload document
                        </label>
                        <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
                          <CloudUpload
                            aria-hidden="true"
                            className="mx-auto h-10 w-10 text-blue-600"
                          />
                          <p className="mt-3 text-sm font-semibold text-slate-900">
                            Drop your file here or browse
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            PDF, DOCX, TXT under 10MB
                          </p>
                          <input
                            id="document-upload"
                            type="file"
                            accept=".txt,.pdf,.docx"
                            onChange={(event) =>
                              setFile(event.target.files?.[0] ?? null)
                            }
                            className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                          />
                        </div>
                        <Button
                          className="mt-3 w-full"
                          variant="secondary"
                          onClick={extractFileText}
                          disabled={isExtracting || !file}
                        >
                          {isExtracting ? (
                            <Loader2
                              aria-hidden="true"
                              className="h-4 w-4 animate-spin"
                            />
                          ) : (
                            <Upload aria-hidden="true" className="h-4 w-4" />
                          )}
                          Extract text
                        </Button>
                        {originalFilename ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Loaded: {originalFilename}
                          </p>
                        ) : null}
                      </TabsContent>
                    </Tabs>

                    <DocumentStats stats={stats} />

                    <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={storeFullText}
                        onChange={(event) =>
                          setStoreFullText(event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>
                        Store full document text with this analysis. By default
                        ClarityDoc stores only a hash, preview, filename, and
                        structured result.
                      </span>
                    </label>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <Button
                        onClick={analyze}
                        disabled={
                          isAnalyzing || !text.trim() || stats.isTooLarge
                        }
                        data-testid="analyze-button"
                      >
                        {isAnalyzing ? (
                          <Loader2
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin"
                          />
                        ) : (
                          <FileSearch aria-hidden="true" className="h-4 w-4" />
                        )}
                        Analyze
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={loadSampleContract}
                        data-testid="load-sample-button"
                      >
                        <FileText aria-hidden="true" className="h-4 w-4" />
                        Load sample contract
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <StatusPanel
                    error={error}
                    notice={notice}
                    isAnalyzing={isAnalyzing}
                  />
                  <DashboardPreviewPanel
                    characterCount={stats.characters}
                    estimatedTokens={stats.estimatedTokens}
                  />
                  <Card id="privacy" className="border-blue-100 bg-white">
                    <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
                      <div className="flex gap-3">
                        <ShieldCheck
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 flex-none text-blue-700"
                        />
                        <div>
                          <p className="font-semibold text-slate-950">
                            Private by default
                          </p>
                          <p className="mt-1">
                            Full document text is not stored unless you opt in.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Scale
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 flex-none text-amber-700"
                        />
                        <p>
                          ClarityDoc provides informational contract analysis,
                          not legal advice or attorney-client privilege.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <>
              <StatusPanel
                error={error}
                notice={notice}
                isAnalyzing={isAnalyzing}
              />
              <ResultsView
                analysis={analysis}
                originalFilename={originalFilename}
                onDownloadJson={downloadJson}
              />
            </>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <FileSearch aria-hidden="true" className="h-5 w-5" />
      </span>
      {!compact ? (
        <span className="text-xl font-bold tracking-normal text-slate-950">
          ClarityDoc
        </span>
      ) : null}
    </div>
  );
}

function LandingHero() {
  return (
    <header className="bg-white">
      <nav className="border-b border-slate-200">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <LogoMark />
          <div className="hidden items-center gap-12 text-sm font-medium text-slate-700 md:flex">
            <a href="#how-it-works" className="hover:text-blue-700">
              How it works
            </a>
            <a href="#privacy" className="hover:text-blue-700">
              Privacy
            </a>
            <a href="#how-it-works" className="hover:text-blue-700">
              About
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-5"
            >
              Log in
            </a>
            <a
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Try it free
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(540px,1.08fr)] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <Badge tone="blue" className="w-fit">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            AI-powered contract analysis
          </Badge>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl font-bold leading-[0.95] tracking-normal text-[#07142f] sm:text-6xl lg:text-7xl">
            Know what you&apos;re signing{" "}
            <span className="text-blue-600">before</span> you sign it.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Upload any contract or agreement and get plain-English insights
            about risks, obligations, deadlines, and what to negotiate.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/dashboard"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Upload aria-hidden="true" className="h-4 w-4" />
              Analyze a document
            </a>
            <a
              href="/dashboard"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              Try sample contract
            </a>
          </div>
          <div className="mt-10 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
            <TrustItem
              icon={ShieldCheck}
              title="Secure & private by default"
              text="Full text is not stored unless you choose to."
            />
            <TrustItem
              icon={CheckCircle2}
              title="Fast first pass"
              text="Get the key issues before you commit."
            />
            <TrustItem
              icon={Users}
              title="Built for business teams"
              text="Founders, freelancers, clinics, and SMBs."
            />
          </div>
        </div>

        <LandingPreview />
      </section>

      <div
        id="how-it-works"
        className="border-t border-slate-100 bg-[#f7fbff] px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <FeatureCard
            icon={FileText}
            title="Plain-English Summary"
            text="Get a clear, concise overview of the contract in simple language."
          />
          <FeatureCard
            icon={Flag}
            title="Risk Flags"
            text="See what could cost you later, grouped by severity."
            tone="red"
          />
          <FeatureCard
            icon={CalendarClock}
            title="Key Obligations + Deadlines"
            text="Know what happens by when, and who is responsible."
            tone="green"
          />
        </div>
      </div>
    </header>
  );
}

function LandingPreview() {
  return (
    <div className="relative hidden min-h-[520px] items-center lg:flex">
      <div className="absolute inset-y-8 right-0 w-[92%] rounded-lg border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)]" />
      <div className="relative grid w-full grid-cols-[160px_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <aside className="border-r border-slate-200 bg-slate-50 p-5">
          <LogoMark compact />
          <button className="mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-xs font-semibold text-white">
            <span>+</span> New analysis
          </button>
          <div className="mt-6 space-y-2 text-xs font-medium text-slate-600">
            {["Summary", "Risks", "Obligations", "Actions"].map(
              (item, index) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-md px-3 py-2",
                    index === 0 && "bg-blue-50 text-blue-700",
                  )}
                >
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="mt-10 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Private by default</p>
            <p className="mt-1">Documents stay yours.</p>
          </div>
        </aside>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">
                Service Agreement.pdf
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Uploaded May 20, 2024 - 12 pages
              </p>
            </div>
            <Badge tone="green">Analyzed</Badge>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <PreviewCard title="Verdict">
              <p className="text-3xl font-semibold text-red-600">Risky</p>
              <div className="mt-4 h-2 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" />
              <Gauge className="mt-4 h-10 w-10 text-slate-500" />
            </PreviewCard>
            <PreviewCard title="Top risks found">
              {[
                "Broad indemnity",
                "Limitation of liability",
                "Auto renewal",
              ].map((risk, index) => (
                <div
                  key={risk}
                  className="mt-2 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-700">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        index === 0
                          ? "bg-red-500"
                          : index === 1
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                      )}
                    />
                    {risk}
                  </span>
                  <Badge tone={index === 0 ? "red" : "amber"}>Risk</Badge>
                </div>
              ))}
            </PreviewCard>
            <PreviewCard title="Before you sign">
              {[
                "Negotiate liability cap",
                "Clarify termination",
                "Review renewal",
              ].map((action) => (
                <div key={action} className="mt-3 flex gap-2 text-xs">
                  <ShieldAlert
                    aria-hidden="true"
                    className="h-4 w-4 text-amber-600"
                  />
                  <span className="font-medium text-slate-800">{action}</span>
                </div>
              ))}
            </PreviewCard>
          </div>
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex gap-6 border-b border-slate-200 text-xs font-semibold text-slate-500">
              <span className="border-b-2 border-blue-600 pb-3 text-blue-700">
                Analysis
              </span>
              <span>Plain-English Summary</span>
              <span>Risk Details</span>
              <span>Clauses</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-950">
              This agreement shifts several business risks to the contractor.
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
              <li>
                - Provider liability is capped while obligations continue.
              </li>
              <li>- Payment timing depends on review and acceptance.</li>
              <li>- Renewal and termination terms need clarification.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold text-slate-950">{title}</span>
        <span className="block text-xs leading-5 text-slate-500">{text}</span>
      </span>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  tone = "blue",
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  text: string;
  tone?: "blue" | "red" | "green";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-600",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <span
        className={cn(
          "inline-flex h-16 w-16 items-center justify-center rounded-lg",
          tones[tone],
        )}
      >
        <Icon aria-hidden="true" className="h-8 w-8" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
      <a
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
      >
        See how it works <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </a>
    </article>
  );
}

function DashboardShell({
  children,
  onNewAnalysis,
}: {
  children: ReactNode;
  onNewAnalysis: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#07142f]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <DashboardSidebar onNewAnalysis={onNewAnalysis} />
        <div className="min-w-0">
          <DashboardMobileHeader onNewAnalysis={onNewAnalysis} />
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1480px]">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardMobileHeader({
  onNewAnalysis,
}: {
  onNewAnalysis: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="ClarityDoc home">
          <LogoMark />
        </Link>
        <Button onClick={onNewAnalysis}>
          <span className="text-lg leading-none">+</span>
          New
        </Button>
      </div>
    </header>
  );
}

function DashboardSidebar({ onNewAnalysis }: { onNewAnalysis: () => void }) {
  const navItems = [
    { label: "Overview", icon: Home, active: true },
    { label: "Risks", icon: ShieldAlert, comingSoon: true },
    { label: "Obligations", icon: Clipboard, comingSoon: true },
    { label: "Clauses", icon: FileText, comingSoon: true },
    { label: "Reports", icon: Clock3, comingSoon: true },
    { label: "Settings", icon: Settings, comingSoon: true },
  ];

  return (
    <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-20 items-center px-7">
        <Link href="/" aria-label="ClarityDoc home">
          <LogoMark />
        </Link>
      </div>

      <div className="px-7">
        <Button className="w-full justify-center" onClick={onNewAnalysis}>
          <span className="text-xl leading-none">+</span>
          New Analysis
        </Button>
      </div>

      <nav className="mt-8 space-y-1 px-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const className = cn(
            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition",
            item.active
              ? "bg-blue-50 text-blue-700"
              : "cursor-not-allowed text-slate-400",
          );

          if (item.active) {
            return (
              <Link key={item.label} href="/dashboard" className={className}>
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }

          return (
            <div
              key={item.label}
              aria-disabled="true"
              className={className}
              title={`${item.label} is coming soon`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{item.label}</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-slate-500">
                Soon
              </span>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto space-y-6 px-7 py-7">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-blue-700" />
            <p className="font-bold text-slate-950">Private by default</p>
          </div>
          <p className="mt-2">
            We do not store your full documents unless you choose to.
          </p>
          <p className="mt-3 font-semibold text-slate-500">
            Privacy controls coming soon
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
            AO
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              John Doe
            </p>
            <p className="text-xs text-slate-500">Free Plan</p>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="ml-auto h-4 w-4 text-slate-500"
          />
        </div>
      </div>
    </aside>
  );
}

function PreviewCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-normal text-slate-500">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ProgressSteps({
  activeStep,
}: {
  activeStep: "add" | "analyze" | "results";
}) {
  const steps = [
    { id: "add", label: "Add Document" },
    { id: "review", label: "Review" },
    { id: "analyze", label: "Analyze" },
    { id: "results", label: "Results" },
  ] as const;
  const activeIndex =
    activeStep === "add" ? 0 : activeStep === "analyze" ? 2 : 3;

  return (
    <ol className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium text-slate-500">
      {steps.map((step, index) => {
        const complete = index <= activeIndex;
        return (
          <li key={step.id} className="space-y-2">
            <span
              className={cn(
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full border",
                complete
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-400",
              )}
            >
              {complete ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </span>
            <span className={complete ? "text-blue-700" : undefined}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DocumentStats({
  stats,
}: {
  stats: {
    characters: number;
    estimatedTokens: number;
    isTooLarge: boolean;
    willChunk: boolean;
  };
}) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-2 divide-x divide-slate-200 text-sm">
        <div className="p-3">
          <p className="text-xs font-medium text-slate-500">Extracted text</p>
          <p className="mt-1 font-semibold text-slate-950">
            {stats.characters.toLocaleString()} characters
          </p>
        </div>
        <div className="p-3">
          <p className="text-xs font-medium text-slate-500">Estimated length</p>
          <p className="mt-1 font-semibold text-slate-950">
            ~{stats.estimatedTokens.toLocaleString()} tokens
          </p>
        </div>
      </div>
      <div className="border-t border-slate-200 p-3 text-xs leading-5 text-slate-500">
        {stats.isTooLarge
          ? "This document is too large for analysis."
          : stats.willChunk
            ? "Large document mode will use chunked consolidation."
            : "Within single-pass analysis size."}
      </div>
    </div>
  );
}

function DashboardPreviewPanel({
  characterCount,
  estimatedTokens,
}: {
  characterCount: number;
  estimatedTokens: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>What You&apos;ll Get</CardTitle>
        <Badge tone="slate">Live preview</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="Characters" value={characterCount} />
          <MiniMetric label="Est. tokens" value={estimatedTokens} />
        </div>
        <div className="space-y-3">
          {[
            ["Summary", "Plain-English business summary"],
            ["Risks", "Severity-ranked risky clauses"],
            ["Review", "Contract text and clause focus"],
            ["Actions", "Negotiation checklist before signing"],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-lg font-bold text-slate-950">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function StatusPanel({
  error,
  notice,
  isAnalyzing,
}: {
  error: string | null;
  notice: string | null;
  isAnalyzing: boolean;
}) {
  if (isAnalyzing) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="space-y-4 text-sm text-blue-950">
          <div className="flex items-center gap-3">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Analyzing your document...
          </div>
          <div className="space-y-2 text-xs text-blue-900">
            {[
              "Extracting parties",
              "Identifying obligations",
              "Checking deadlines",
              "Reviewing risky clauses",
              "Preparing action checklist",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-2">
                {index < 3 ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-emerald-600"
                  />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-blue-300" />
                )}
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex gap-3 text-sm leading-6 text-red-950">
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 flex-none"
          />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (notice) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="text-sm text-emerald-950">{notice}</CardContent>
      </Card>
    );
  }

  return null;
}

function ResultsView({
  analysis,
  originalFilename,
  onDownloadJson,
}: {
  analysis: AnalyzeResponse;
  originalFilename: string | null;
  onDownloadJson: () => void;
}) {
  const result = analysis.result;
  const verdict = verdictStyles[result.verdict];
  const highRisks = result.risks.filter((risk) => risk.severity === "high");
  const mediumRisks = result.risks.filter((risk) => risk.severity === "medium");
  const documentName = originalFilename ?? titleCase(result.document_type);
  const sourceLabel = originalFilename ? "Uploaded document" : "Sample text";
  const urgentActions = result.actions.filter(
    (action) => action.priority === "urgent",
  );

  return (
    <div
      className="mx-auto max-w-[1040px] space-y-4 print:max-w-none"
      data-testid="results-view"
    >
      <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-bold leading-tight tracking-normal text-slate-950 sm:text-4xl">
            <span>{documentName}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:text-sm">
            <span>Analyzed {formatShortDate(new Date())}</span>
            <span aria-hidden="true">•</span>
            <span>{result.document_type}</span>
            <span aria-hidden="true">•</span>
            <span>
              {sourceLabel}, {analysis.document.characterCount.toLocaleString()}{" "}
              chars
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onDownloadJson}>
            <Download aria-hidden="true" className="h-4 w-4" />
            Download report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.65fr)_repeat(4,minmax(100px,0.35fr))] lg:gap-4">
        <Card
          className={cn(
            "col-span-2 overflow-hidden border-l-4 shadow-sm lg:col-span-1",
            verdict.className,
          )}
          data-testid="verdict-card"
        >
          <CardContent className="grid gap-4 p-4 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-white/80 text-red-600 shadow-sm ring-1 ring-red-100">
              <ShieldAlert aria-hidden="true" className="h-9 w-9" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-red-700">
                Verdict
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold tracking-normal text-slate-950">
                {verdict.label}
              </h2>
              <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-6 text-slate-700">
                {result.verdict_reason}
              </p>
            </div>
          </CardContent>
        </Card>

        <MetricTile
          icon={ShieldAlert}
          value={result.risks.length}
          label="Risks"
          sublabel={`${highRisks.length} High • ${mediumRisks.length} Medium`}
          tone="red"
        />
        <MetricTile
          icon={FileSearch}
          value={result.obligations.length}
          label="Obligations"
          sublabel={`${result.obligations.filter((item) => item.importance === "high").length} high importance`}
          tone="blue"
        />
        <MetricTile
          icon={CalendarClock}
          value={result.deadlines.length}
          label="Deadlines"
          sublabel={result.deadlines[0]?.date_or_timeframe ?? "None found"}
          tone="green"
        />
        <MetricTile
          icon={ListChecks}
          value={result.actions.length}
          label="Action Items"
          sublabel={`${urgentActions.length} urgent`}
          tone="amber"
        />
      </div>

      {analysis.warnings.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="text-sm leading-6 text-amber-950">
            {analysis.warnings.join(" ")}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultCard icon={Share2} title="Plain-English Summary">
          <SummaryList summary={result.summary} />
        </ResultCard>

        <ResultCard icon={Flag} title="Top Risks">
          <TopRisksTable risks={result.risks.slice(0, 3)} />
        </ResultCard>

        <ResultCard
          icon={CheckSquare}
          title="What You Need To Do Before You Sign"
        >
          <ActionList actions={result.actions.slice(0, 4)} />
        </ResultCard>

        <ResultCard icon={CalendarClock} title="Key Obligations & Deadlines">
          <ObligationDeadlineTable
            obligations={result.obligations.slice(0, 4)}
            deadlines={result.deadlines.slice(0, 4)}
          />
        </ResultCard>
      </div>

      <Card className="border-slate-200 bg-transparent shadow-none">
        <CardContent className="flex gap-2 px-0 py-0 text-xs leading-5 text-slate-500">
          <Scale aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
          <span>{result.disclaimer}</span>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryList({ summary }: { summary: string }) {
  const lines = splitSummary(summary);

  return (
    <div className="space-y-3 text-sm leading-6 text-slate-700">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  value,
  label,
  sublabel,
  tone,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: number;
  label: string;
  sublabel: string;
  tone: "red" | "amber" | "blue" | "green";
}) {
  const tones = {
    red: "text-red-600 bg-red-50",
    amber: "text-violet-700 bg-violet-50",
    blue: "text-blue-700 bg-blue-50",
    green: "text-emerald-700 bg-emerald-50",
  };

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm"
      title={sublabel}
      aria-label={`${value} ${label}. ${sublabel}`}
    >
      <div className="flex min-h-[108px] flex-col items-center justify-center">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            tones[tone],
          )}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="mt-2 text-3xl font-bold leading-none tracking-normal text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{label}</p>
          <p className="sr-only">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}

function TopRisksTable({ risks }: { risks: AnalysisResult["risks"] }) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No specific risk flags were identified from the submitted text.
      </p>
    );
  }

  const highRisks = risks.filter((risk) => risk.severity === "high");
  const otherRisks = risks.filter((risk) => risk.severity !== "high");

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div data-testid="risk-group-high">
        {highRisks.map((risk, index) => (
          <RiskTableRow
            key={`${risk.title}-${index}`}
            index={index}
            risk={risk}
          />
        ))}
      </div>
      {otherRisks.map((risk, index) => (
        <RiskTableRow
          key={`${risk.title}-${index}`}
          index={highRisks.length + index}
          risk={risk}
        />
      ))}
    </div>
  );
}

function RiskTableRow({
  index,
  risk,
}: {
  index: number;
  risk: AnalysisResult["risks"][number];
}) {
  const tone =
    risk.severity === "high"
      ? "red"
      : risk.severity === "medium"
        ? "amber"
        : "green";

  return (
    <article className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[34px_minmax(0,1fr)_78px] sm:items-center">
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
          risk.severity === "high"
            ? "bg-red-50 text-red-600"
            : risk.severity === "medium"
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700",
        )}
      >
        {index + 1}
      </span>
      <div>
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {risk.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">
          {risk.explanation}
        </p>
      </div>
      <Badge className="justify-center rounded-md px-2 py-1" tone={tone}>
        {titleCase(risk.severity)}
      </Badge>
    </article>
  );
}

function ObligationDeadlineTable({
  obligations,
  deadlines,
}: {
  obligations: AnalysisResult["obligations"];
  deadlines: AnalysisResult["deadlines"];
}) {
  if (obligations.length === 0 && deadlines.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No explicit obligations or deadlines were identified.
      </p>
    );
  }

  const rows = obligations.map((obligation, index) => ({
    id: `${obligation.party}-${index}`,
    label: obligation.obligation,
    party: obligation.party,
    due:
      obligation.deadline ?? deadlines[index]?.date_or_timeframe ?? "Ongoing",
    source: obligation.source_reference ?? deadlines[index]?.source_reference,
    complete: obligation.importance !== "high",
  }));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_116px_108px] sm:items-center"
        >
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border",
                row.complete
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white",
              )}
            >
              {row.complete ? (
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              ) : null}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {row.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">{row.party}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-emerald-700">{row.due}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500 sm:justify-end">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
            <p className="truncate">
              {row.source ?? (row.due === "Ongoing" ? "Ongoing" : row.due)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionList({ actions }: { actions: AnalysisResult["actions"] }) {
  return (
    <div className="space-y-3" data-testid="actions-list">
      {actions.map((action, index) => (
        <div
          key={`${action.action}-${index}`}
          className="grid grid-cols-[24px_minmax(0,1fr)] gap-3"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-6 text-slate-800">{action.action}</p>
            {action.deadline ? (
              <p className="mt-1 text-xs font-medium text-slate-500">
                {action.deadline}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="break-inside-avoid shadow-sm">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon aria-hidden="true" className="h-4 w-4 text-slate-600" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">{children}</CardContent>
    </Card>
  );
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function splitSummary(summary: string): string[] {
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return [summary];
  }

  return sentences.slice(0, 5);
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1));
}
