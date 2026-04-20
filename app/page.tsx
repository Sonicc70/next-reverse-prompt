"use client";

import { useState, useRef, useEffect } from "react";

interface AnalysisResult {
  detailedPrompt: string;
  intent: string;
  keyElements: string[];
  suggestedImprovements: string[];
  promptScore: number;
}

export default function Home() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCharCount(inputPrompt.length);
  }, [inputPrompt]);

  const handleSubmit = async () => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/reverse-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputPrompt }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze prompt");
      }

      const data = await res.json();
      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.detailedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "#00ff88";
    if (score >= 60) return "#ffd700";
    return "#ff6b6b";
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    return "Weak";
  };

  return (
    <div className="app-container">
      {/* Background grid */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="glow-orb glow-1" aria-hidden="true" />
      <div className="glow-orb glow-2" aria-hidden="true" />

      <main className="main">
        {/* Header */}
        <header className="header">
          <div className="logo-row">
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M4 14C4 8.477 8.477 4 14 4s10 4.477 10 10-4.477 10-10 10S4 19.523 4 14z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 14h8M14 10l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="14" cy="14" r="2" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h1 className="site-title">Prompt Reverse Engineer</h1>
              <p className="site-tagline">Decode the intent. Reconstruct the perfect prompt.</p>
            </div>
          </div>
        </header>

        {/* Input Section */}
        <section className="input-section">
          <div className="input-card">
            <div className="input-header">
              <label className="input-label" htmlFor="prompt-input">
                <span className="label-num">01</span>
                <span>Paste your prompt or idea</span>
              </label>
              <span className={`char-count ${charCount > 2000 ? "char-over" : ""}`}>
                {charCount.toLocaleString()} chars
              </span>
            </div>

            <textarea
              id="prompt-input"
              ref={textareaRef}
              className="prompt-textarea"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g. 'write me a story about a robot' or paste any prompt you want to reverse engineer..."
              rows={6}
              maxLength={5000}
            />

            <div className="input-footer">
              <span className="keyboard-hint">
                <kbd>⌘</kbd><kbd>↵</kbd> to analyze
              </span>
              <button
                className={`analyze-btn ${loading ? "loading" : ""}`}
                onClick={handleSubmit}
                disabled={loading || !inputPrompt.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reverse Engineer
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
        </section>

        {/* Loading skeleton */}
        {loading && (
          <section className="skeleton-section">
            <div className="skeleton-card">
              <div className="skeleton-line w-40" />
              <div className="skeleton-block" />
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-50" />
            </div>
          </section>
        )}

        {/* Results */}
        {result && !loading && (
          <section className="results-section" ref={resultRef}>
            {/* Score strip */}
            <div className="score-strip">
              <div className="score-left">
                <span className="score-label-text">Original Prompt Quality</span>
                <div className="score-bar-track">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${result.promptScore}%`,
                      background: scoreColor(result.promptScore),
                    }}
                  />
                </div>
              </div>
              <div className="score-badge" style={{ borderColor: scoreColor(result.promptScore), color: scoreColor(result.promptScore) }}>
                <span className="score-num">{result.promptScore}</span>
                <span className="score-level">{scoreLabel(result.promptScore)}</span>
              </div>
            </div>

            {/* Intent card */}
            <div className="result-card intent-card">
              <div className="card-header">
                <span className="card-num">01</span>
                <h2 className="card-title">Detected Intent</h2>
              </div>
              <p className="intent-text">{result.intent}</p>
            </div>

            {/* Key Elements */}
            <div className="result-card elements-card">
              <div className="card-header">
                <span className="card-num">02</span>
                <h2 className="card-title">Key Elements Identified</h2>
              </div>
              <ul className="elements-list">
                {result.keyElements.map((el, i) => (
                  <li key={i} className="element-item">
                    <span className="element-bullet" />
                    {el}
                  </li>
                ))}
              </ul>
            </div>

            {/* Reconstructed Prompt */}
            <div className="result-card prompt-card">
              <div className="card-header">
                <span className="card-num">03</span>
                <h2 className="card-title">Reconstructed Prompt</h2>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="reconstructed-prompt">
                {result.detailedPrompt}
              </div>
            </div>

            {/* Improvements */}
            <div className="result-card improvements-card">
              <div className="card-header">
                <span className="card-num">04</span>
                <h2 className="card-title">Suggested Improvements</h2>
              </div>
              <ol className="improvements-list">
                {result.suggestedImprovements.map((imp, i) => (
                  <li key={i} className="improvement-item">
                    <span className="imp-num">{String(i + 1).padStart(2, "0")}</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Reanalyze */}
            <div className="reanalyze-row">
              <button className="reanalyze-btn" onClick={() => { setResult(null); setInputPrompt(""); textareaRef.current?.focus(); }}>
                Start over
              </button>
              <button className="reanalyze-btn primary" onClick={() => { setInputPrompt(result.detailedPrompt); setResult(null); }}>
                Refine reconstructed prompt →
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Reverse Prompt Engineer</span>
        <span className="footer-dot">·</span>
        <span>Powered by Claude</span>
      </footer>
    </div>
  );
}
