import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ShieldAlert, Layers, Droplets, Flame, Zap, Anchor,
  BookOpen, FileText, Database, Sparkles, ChevronRight, Activity,
  Files, Trash2, Plus, RefreshCw, Eye, FolderPlus
} from 'lucide-react';
import '../digitize.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Category icon helper ───────────────────────────────────────────────────────
function getCatIcon(cat) {
  if (cat?.includes('stuck'))   return <Anchor    size={18} color="#ef4444" />;
  if (cat?.includes('circ'))    return <Droplets  size={18} color="#ea580c" />;
  if (cat?.includes('kick'))    return <Flame     size={18} color="#dc2626" />;
  if (cat?.includes('vibrat'))  return <Zap       size={18} color="#f59e0b" />;
  if (cat?.includes('instab'))  return <Layers    size={18} color="#8b5cf6" />;
  if (cat?.includes('break'))   return <Activity  size={18} color="#0284c7" />;
  return <ShieldAlert size={18} color="#16a34a" />;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DocumentDigitization({
  onNavigateToLanding,
  onNavigateToKnowledge,
  onNavigateToDashboard,
  onNavigateToFeatures
}) {
  // Mode: 'single' | 'batch'
  const [mode, setMode] = useState('single');

  // Single mode state
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Batch mode state
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [batchCompleted, setBatchCompleted] = useState(false);
  const [batchFilterDoc, setBatchFilterDoc] = useState('all');

  const resultsRef = useRef(null);
  const fileInputRef = useRef(null);
  const batchFileInputRef = useRef(null);

  // Auto scroll down to extracted results once extraction finishes
  useEffect(() => {
    if ((result || error || batchCompleted) && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [result, error, batchCompleted]);

  // ── Single file handlers ───────────────────────────────────────────────────
  const onSingleFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleSingleUpload = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setResult(null);
    setError(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API}/api/digitize`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Server error');
      }

      setResult(data);

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message || 'Network error — please check that the backend is running.');
    } finally {
      setProcessing(false);
    }
  };

  const resetSingle = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Batch file handlers ────────────────────────────────────────────────────
  const onBatchFileChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((f, i) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${i}`,
      file: f,
      status: 'pending',
      result: null,
      error: null
    }));

    setBatchFiles(prev => [...prev, ...newItems]);
    setBatchCompleted(false);
    if (e.target) e.target.value = '';
  }, []);

  const handleBatchDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    if (!dropped.length) return;

    if (mode === 'single') {
      setFile(dropped[0]);
      setResult(null);
      setError(null);
    } else {
      const newItems = dropped.map((f, i) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${i}`,
        file: f,
        status: 'pending',
        result: null,
        error: null
      }));
      setBatchFiles(prev => [...prev, ...newItems]);
      setBatchCompleted(false);
    }
  }, [mode]);

  const removeBatchItem = (id) => {
    if (batchProcessing) return;
    setBatchFiles(prev => prev.filter(item => item.id !== id));
  };

  const clearBatch = () => {
    if (batchProcessing) return;
    setBatchFiles([]);
    setBatchCompleted(false);
    setBatchProgress({ current: 0, total: 0, currentName: '' });
  };

  const handleBatchUpload = async () => {
    if (!batchFiles.length || batchProcessing) return;

    setBatchProcessing(true);
    setBatchCompleted(false);

    const pendingItems = batchFiles.filter(item => item.status !== 'done');
    const totalCount = pendingItems.length;
    let processedCount = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i];
      if (item.status === 'done') continue;

      setBatchProgress({
        current: processedCount + 1,
        total: totalCount,
        currentName: item.file.name
      });

      // Set item to processing
      setBatchFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing', error: null } : f));

      const form = new FormData();
      form.append('file', item.file);

      try {
        const res = await fetch(`${API}/api/digitize`, {
          method: 'POST',
          body: form,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'Digitization failed');
        }

        const isDup = !data.error && (data.items_saved?.length === 0) && (data.duplicate_of > 0 || data.duplicates_skipped?.length > 0);

        setBatchFiles(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: data.error ? 'error' : (isDup ? 'duplicate' : 'done'),
          result: data,
          error: data.error || null
        } : f));
      } catch (err) {
        setBatchFiles(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'error',
          error: err.message || 'Processing failed'
        } : f));
      }

      processedCount++;
    }

    setBatchProcessing(false);
    setBatchCompleted(true);
  };

  // ── Calculated counts ──────────────────────────────────────────────────────
  const isDone = Boolean(result && !error);
  const isFailed = Boolean(error);
  const savedCount = result?.items_saved?.length ?? 0;
  const extractedCount = result?.items_extracted?.length ?? 0;

  // Batch calculated aggregates
  const batchTotalSaved = batchFiles.reduce((acc, f) => acc + (f.result?.items_saved?.length || 0), 0);
  const batchTotalExtracted = batchFiles.reduce((acc, f) => acc + (f.result?.items_extracted?.length || 0), 0);
  const batchTotalDuplicates = batchFiles.reduce((acc, f) => acc + (f.result?.duplicate_of || f.result?.duplicates_skipped?.length || 0), 0);
  const batchCompletedCount = batchFiles.filter(f => f.status === 'done' || f.status === 'duplicate').length;
  const batchErrorCount = batchFiles.filter(f => f.status === 'error').length;

  // Flattened extracted items for batch view
  const allBatchExtractedItems = batchFiles.flatMap(f => {
    const items = f.result?.items_extracted || [];
    return items.map(item => ({
      ...item,
      sourceDocName: f.file.name,
      sourceDocId: f.id
    }));
  });

  const filteredBatchItems = batchFilterDoc === 'all'
    ? allBatchExtractedItems
    : allBatchExtractedItems.filter(item => item.sourceDocId === batchFilterDoc);

  return (
    <div className="digi-page" onDrop={handleBatchDrop} onDragOver={(e) => e.preventDefault()}>
      {/* ── Topbar ── */}
      <header className="digi-topbar">
        <button type="button" className="digi-back-btn" onClick={onNavigateToLanding}>
          <ArrowLeft size={14} />
          <span>Home</span>
        </button>

        {onNavigateToFeatures && (
          <button type="button" className="digi-back-btn" onClick={onNavigateToFeatures}>
            <span>Features</span>
          </button>
        )}

        {onNavigateToDashboard && (
          <button type="button" className="digi-back-btn" onClick={onNavigateToDashboard}>
            <span>Live Telemetry</span>
          </button>
        )}

        <div className="digi-title">
          <Sparkles size={18} color="#7c3aed" />
          <h1>AI Document Digitization</h1>
        </div>

        <button
          type="button"
          className="digi-back-btn"
          onClick={onNavigateToKnowledge}
          style={{ marginLeft: 'auto', color: '#0284c7', borderColor: '#bae6fd' }}
        >
          <BookOpen size={14} />
          <span>Knowledge Base</span>
        </button>
      </header>

      {/* ── Main Content Container ── */}
      <main className="digi-content">
        {/* Hero Section */}
        <section className="digi-hero">
          <h2>Turn Drilling Documents<br />Into Searchable Knowledge</h2>
          <p>
            {mode === 'single'
              ? 'Upload a single well report, SPE paper, or daily drilling incident PDF.'
              : 'Upload multiple well logs, incident reports, and SPE papers simultaneously for automated batch ingestion.'}
          </p>
        </section>

        {/* Mode Selector Toggle: Single vs Batch */}
        <div className="digi-mode-switch-wrapper">
          <div className="digi-mode-switch">
            <button
              type="button"
              className={`digi-mode-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              <FileText size={16} />
              <span>Normal (Single File)</span>
            </button>
            <button
              type="button"
              className={`digi-mode-btn ${mode === 'batch' ? 'active' : ''}`}
              onClick={() => setMode('batch')}
            >
              <Files size={16} />
              <span>Batch Upload</span>
              <span className="digi-mode-pill">Multiple</span>
            </button>
          </div>
        </div>

        {/* ── MODE 1: SINGLE DOCUMENT UPLOAD ── */}
        {mode === 'single' && (
          <div className="digi-center-box">
            {/* SVG Filter for Doodle Jitter */}
            <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <defs>
                <filter id="doodle-jitter" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>

            {/* Doodle Upload Component */}
            <label className="doodle-upload-container" tabIndex={0}>
              <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept=".pdf,.txt,.md,.csv"
                onChange={onSingleFileChange}
              />
              <div className="doodle-folder">
                <div className="folder-back">
                  <div className="folder-tab" />
                </div>
                <div className="doodle-papers">
                  <div className="paper file-1">
                    <div className="scribble-line" />
                    <div className="scribble-line short" />
                    <div className="scribble-line" />
                  </div>
                  <div className="paper file-2">
                    <svg viewBox="0 0 24 24" className="doodle-image-icon">
                      <rect x={3} y={3} width={18} height={18} rx={2} fill="none" stroke="currentColor" strokeWidth={2} />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                      <path d="M21 15l-5-5L5 21" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div className="folder-front">
                  <svg className="folder-smile" viewBox="0 0 24 24">
                    <path d="M 7 14 Q 12 19 17 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="doodle-btn">
                <span className="btn-text">
                  {file ? 'Change file' : 'Choose a file'}
                </span>
              </div>

              <svg className="doodle-decor sparkle-1" viewBox="0 0 24 24">
                <path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z" fill="var(--btn-hover)" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <svg className="doodle-decor star-1" viewBox="0 0 24 24">
                <path d="M12 2L15 9L22 10L17 15L18.5 22L12 18.5L5.5 22L7 15L2 10L9 9L12 2Z" fill="var(--accent-blue)" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <svg className="doodle-paperclip" viewBox="0 0 24 24">
                <path d="M 12 4 L 12 18 C 12 20 9 20 9 18 L 9 6 C 9 3 15 3 15 6 L 15 16 C 15 18 13 18 13 16 L 13 8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </label>

            {/* File Info Badge */}
            {file && (
              <div className="digi-file-badge">
                <FileText size={18} color="#0284c7" />
                <div style={{ overflow: 'hidden' }}>
                  <div className="digi-file-name">{file.name}</div>
                  <div className="digi-file-size">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              type="button"
              className="digi-upload-btn"
              onClick={isDone ? resetSingle : handleSingleUpload}
              disabled={!file || processing}
            >
              {processing ? (
                <>
                  <Loader2 size={16} style={{ animation: 'digiSpin 1s linear infinite' }} />
                  <span>Extracting & Ingesting…</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>{isDone ? 'Upload Another Document' : 'Extract & Ingest to Knowledge Base'}</span>
                </>
              )}
            </button>

            {isDone && (
              <button
                type="button"
                onClick={resetSingle}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear & start over
              </button>
            )}
          </div>
        )}

        {/* ── MODE 2: BATCH MULTI-FILE UPLOAD ── */}
        {mode === 'batch' && (
          <div className="digi-batch-panel">
            {/* SVG Filter for Doodle Jitter */}
            <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <defs>
                <filter id="doodle-jitter-batch" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>

            {/* Batch Doodle Drop Zone */}
            <label className="doodle-upload-container" tabIndex={0}>
              <input
                ref={batchFileInputRef}
                className="hidden-file-input"
                type="file"
                multiple
                accept=".pdf,.txt,.md,.csv"
                onChange={onBatchFileChange}
              />
              <div className="doodle-folder">
                <div className="folder-back">
                  <div className="folder-tab" />
                </div>
                <div className="doodle-papers">
                  <div className="paper file-1" style={{ transform: 'rotate(-12deg) translateY(-8px)' }}>
                    <div className="scribble-line" />
                    <div className="scribble-line short" />
                  </div>
                  <div className="paper file-2" style={{ transform: 'rotate(12deg) translateY(-8px)' }}>
                    <div className="scribble-line" />
                    <div className="scribble-line short" />
                  </div>
                  <div className="paper" style={{ left: '38px', bottom: '15px', zIndex: 3, transform: 'rotate(-2deg)' }}>
                    <div className="scribble-line" />
                    <div className="scribble-line short" />
                  </div>
                </div>
                <div className="folder-front">
                  <svg className="folder-smile" viewBox="0 0 24 24">
                    <path d="M 7 14 Q 12 19 17 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="doodle-btn">
                <span className="btn-text">
                  {batchFiles.length > 0 ? '+ Add More Files' : 'Choose Multiple Files'}
                </span>
              </div>

              <svg className="doodle-decor sparkle-1" viewBox="0 0 24 24">
                <path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 0Z" fill="var(--btn-hover)" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <svg className="doodle-decor star-1" viewBox="0 0 24 24">
                <path d="M12 2L15 9L22 10L17 15L18.5 22L12 18.5L5.5 22L7 15L2 10L9 9L12 2Z" fill="var(--accent-blue)" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <svg className="doodle-paperclip" viewBox="0 0 24 24">
                <path d="M 12 4 L 12 18 C 12 20 9 20 9 18 L 9 6 C 9 3 15 3 15 6 L 15 16 C 15 18 13 18 13 16 L 13 8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </label>

            {/* Batch Files Queue Card */}
            {batchFiles.length > 0 && (
              <div className="digi-batch-queue-card">
                <div className="digi-batch-queue-header">
                  <div className="digi-batch-queue-title">
                    <Files size={17} color="#0284c7" />
                    <span>Selected Documents</span>
                    <span className="digi-batch-queue-count">{batchFiles.length}</span>
                  </div>

                  <div className="digi-batch-header-actions">
                    <button
                      type="button"
                      className="digi-batch-small-btn"
                      onClick={() => batchFileInputRef.current?.click()}
                      disabled={batchProcessing}
                    >
                      <Plus size={13} />
                      <span>Add files</span>
                    </button>
                    <button
                      type="button"
                      className="digi-batch-small-btn digi-batch-small-btn--danger"
                      onClick={clearBatch}
                      disabled={batchProcessing}
                    >
                      <Trash2 size={13} />
                      <span>Clear all</span>
                    </button>
                  </div>
                </div>

                <div className="digi-batch-file-list">
                  {batchFiles.map((item) => {
                    let statusPillClass = 'pending';
                    let statusText = 'Queued';

                    if (item.status === 'processing') {
                      statusPillClass = 'processing';
                      statusText = 'Extracting…';
                    } else if (item.status === 'done') {
                      statusPillClass = 'done';
                      const count = item.result?.items_saved?.length ?? 0;
                      statusText = `✓ Saved (${count})`;
                    } else if (item.status === 'duplicate') {
                      statusPillClass = 'duplicate';
                      statusText = '🛡️ Duplicate';
                    } else if (item.status === 'error') {
                      statusPillClass = 'error';
                      statusText = 'Failed';
                    }

                    return (
                      <div
                        key={item.id}
                        className={`digi-batch-file-item digi-batch-file-item--${item.status}`}
                      >
                        <div className="digi-batch-file-icon">
                          <FileText size={16} color="#475569" />
                        </div>

                        <div className="digi-batch-file-details">
                          <div className="digi-batch-filename" title={item.file.name}>
                            {item.file.name}
                          </div>
                          <div className="digi-batch-filemeta">
                            <span>{(item.file.size / 1024).toFixed(1)} KB</span>
                            {item.error && (
                              <span style={{ color: '#dc2626', marginLeft: 6 }}>
                                · {item.error}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`digi-batch-status-pill digi-batch-status-pill--${statusPillClass}`}>
                          {item.status === 'processing' && (
                            <Loader2 size={12} style={{ animation: 'digiSpin 1s linear infinite' }} />
                          )}
                          {statusText}
                        </span>

                        {!batchProcessing && item.status !== 'done' && (
                          <button
                            type="button"
                            className="digi-batch-item-del"
                            onClick={() => removeBatchItem(item.id)}
                            title="Remove file"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Batch Processing Progress Box */}
            {batchProcessing && (
              <div className="digi-batch-progress">
                <div className="digi-batch-progress-header">
                  <span>Processing {batchProgress.current} of {batchProgress.total} documents…</span>
                  <span>{Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)}%</span>
                </div>
                <div className="digi-batch-progress-track">
                  <div
                    className="digi-batch-progress-fill"
                    style={{ width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%` }}
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Current: <strong>{batchProgress.currentName}</strong>
                </div>
              </div>
            )}

            {/* Batch Action Button */}
            <button
              type="button"
              className="digi-upload-btn"
              onClick={handleBatchUpload}
              disabled={batchFiles.length === 0 || batchProcessing || (batchCompleted && batchFiles.every(f => f.status === 'done' || f.status === 'duplicate'))}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} style={{ animation: 'digiSpin 1s linear infinite' }} />
                  <span>Processing Batch…</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>
                    {batchCompleted
                      ? 'Batch Ingestion Complete'
                      : `Extract & Ingest All (${batchFiles.length} ${batchFiles.length === 1 ? 'Doc' : 'Docs'})`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── SINGLE MODE RESULTS ── */}
        {mode === 'single' && (isDone || isFailed || error) && (
          <div className="digi-results" ref={resultsRef}>
            {/* Error Banner */}
            {error && (
              <div className="digi-error-banner">
                <XCircle size={28} color="#dc2626" />
                <div>
                  <h3>Extraction Failed</h3>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Success Banner (New items saved) */}
            {isDone && !error && savedCount > 0 && (
              <div className="digi-saved-banner">
                <CheckCircle2 size={28} color="#16a34a" />
                <div>
                  <h3>✓ {savedCount} Knowledge Base {savedCount === 1 ? 'Entry' : 'Entries'} Saved Successfully</h3>
                  <p>New drilling risk records are now indexed and searchable in your Knowledge Base.</p>
                  {result?.note && (
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4, fontStyle: 'italic' }}>
                      {result.note}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = result?.items_saved?.[0] || result?.items_extracted?.[0];
                    if (onNavigateToKnowledge) {
                      onNavigateToKnowledge({
                        targetItemId: target?.item_id,
                        searchQuery: target?.title || '',
                        highlightItemIds: (result?.items_saved || []).map(s => s.item_id).filter(Boolean),
                        autoOpenDoc: true
                      });
                    }
                  }}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    background: '#16a34a', color: 'white', border: 'none',
                    borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <span>View in KB</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* Duplicate Check Banner (All items were already in KB) */}
            {isDone && !error && savedCount === 0 && (result?.duplicate_of > 0 || result?.duplicates_skipped?.length > 0) && (
              <div className="digi-saved-banner" style={{ background: '#fefce8', borderColor: '#fef08a' }}>
                <CheckCircle2 size={28} color="#ca8a04" />
                <div>
                  <h3 style={{ color: '#854d0e' }}>🛡️ Duplicate Check Active: {result.duplicate_of} Existing {result.duplicate_of === 1 ? 'Record' : 'Records'} Identified</h3>
                  <p style={{ color: '#a16207' }}>These drilling hazards were already cataloged in your Knowledge Base. Duplicate checking kept your database clean.</p>
                  {result?.note && (
                    <div style={{ fontSize: '0.75rem', color: '#713f12', marginTop: 4, fontStyle: 'italic' }}>
                      {result.note}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstDup = result.duplicates_skipped?.[0] || result.items_extracted?.[0];
                    if (onNavigateToKnowledge) {
                      onNavigateToKnowledge({
                        targetItemId: firstDup?.existing_id || firstDup?.item_id,
                        searchQuery: firstDup?.title || '',
                        autoOpenDoc: true
                      });
                    }
                  }}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    background: '#ca8a04', color: 'white', border: 'none',
                    borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(202, 138, 4, 0.25)'
                  }}
                >
                  <span>View in KB</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* Extracted Items List */}
            {result?.items_extracted?.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="#7c3aed" />
                    Extracted Knowledge Entries ({extractedCount})
                  </h3>
                  {result.engine_used && (
                    <span style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                      Engine: {result.engine_used}
                    </span>
                  )}
                </div>

                {result.items_extracted.map((item, idx) => (
                  <div
                    key={item.item_id || idx}
                    className="digi-result-card"
                    style={{
                      borderColor: item.category_color || '#0284c7',
                      borderLeftColor: item.category_color || '#0284c7'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span
                        className="digi-cat-badge"
                        style={{
                          background: `${item.category_color}18`,
                          color: item.category_color,
                          borderColor: `${item.category_color}44`
                        }}
                      >
                        {getCatIcon(item.category)}
                        {item.category_name || item.category}
                      </span>
                      <span className={`digi-sev-badge digi-sev-badge--${item.severity || 'high'}`}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {item.severity}
                      </span>
                      {item.is_duplicate ? (
                        <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                          🛡️ Duplicate (Already in KB)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                          ✓ Indexed to DB
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto' }}>{item.existing_id || item.item_id}</span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
                      {item.title}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      {item.symptoms_early_indicators?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284c7', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Symptoms
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.symptoms_early_indicators.slice(0, 3).map((s, i) => (
                              <li key={i} className="digi-list-item">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.root_causes?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Root Causes
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.root_causes.slice(0, 3).map((r, i) => (
                              <li key={i} className="digi-list-item">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.mitigation_actions?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Mitigation Actions
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.mitigation_actions.slice(0, 3).map((m, i) => (
                              <li key={i} className="digi-list-item">{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToKnowledge) {
                            onNavigateToKnowledge({
                              targetItemId: item.existing_id || item.item_id,
                              searchQuery: item.title,
                              highlightItemIds: [item.item_id, item.existing_id].filter(Boolean),
                              autoOpenDoc: true
                            });
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f8fafc', color: '#0284c7', border: '1px solid #bae6fd',
                          borderRadius: 7, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e0f2fe'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <BookOpen size={14} />
                        <span>Open Playbook in KB Modal</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── BATCH MODE RESULTS ── */}
        {mode === 'batch' && (batchCompleted || allBatchExtractedItems.length > 0) && (
          <div className="digi-results" ref={resultsRef}>
            {/* Batch Aggregation Summary Banner */}
            <div className="digi-saved-banner" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                <CheckCircle2 size={32} color="#16a34a" />
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>
                    Batch Digitization Complete: {batchCompletedCount} of {batchFiles.length} Documents Processed
                  </h3>
                  <p>
                    Structured drilling intelligence was extracted and ingested directly into your active Knowledge Base.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToKnowledge) {
                      onNavigateToKnowledge();
                    }
                  }}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    background: '#16a34a', color: 'white', border: 'none',
                    borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <BookOpen size={15} />
                  <span>Open Knowledge Base</span>
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* 4 Stats Cards */}
              <div className="digi-batch-summary-stats" style={{ width: '100%' }}>
                <div className="digi-batch-stat-card">
                  <div className="digi-batch-stat-val" style={{ color: '#0284c7' }}>{batchFiles.length}</div>
                  <div className="digi-batch-stat-lbl">Docs Processed</div>
                </div>
                <div className="digi-batch-stat-card">
                  <div className="digi-batch-stat-val" style={{ color: '#16a34a' }}>{batchTotalSaved}</div>
                  <div className="digi-batch-stat-lbl">New Entries Saved</div>
                </div>
                <div className="digi-batch-stat-card">
                  <div className="digi-batch-stat-val" style={{ color: '#ca8a04' }}>{batchTotalDuplicates}</div>
                  <div className="digi-batch-stat-lbl">Duplicates Cleaned</div>
                </div>
                <div className="digi-batch-stat-card">
                  <div className="digi-batch-stat-val" style={{ color: batchErrorCount > 0 ? '#dc2626' : '#64748b' }}>
                    {batchErrorCount}
                  </div>
                  <div className="digi-batch-stat-lbl">Failed / Unreadable</div>
                </div>
              </div>
            </div>

            {/* Document Filter Tabs & List Header */}
            {allBatchExtractedItems.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="#7c3aed" />
                    All Extracted Entries ({allBatchExtractedItems.length})
                  </h3>

                  {/* Filter by Document */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filter by Doc:</span>
                    <select
                      value={batchFilterDoc}
                      onChange={(e) => setBatchFilterDoc(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Documents ({allBatchExtractedItems.length})</option>
                      {batchFiles.map((f) => {
                        const count = (f.result?.items_extracted || []).length;
                        return (
                          <option key={f.id} value={f.id}>
                            {f.file.name} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Cards for batch items */}
                {filteredBatchItems.map((item, idx) => (
                  <div
                    key={item.item_id || idx}
                    className="digi-result-card"
                    style={{
                      borderColor: item.category_color || '#0284c7',
                      borderLeftColor: item.category_color || '#0284c7'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span
                        className="digi-cat-badge"
                        style={{
                          background: `${item.category_color}18`,
                          color: item.category_color,
                          borderColor: `${item.category_color}44`
                        }}
                      >
                        {getCatIcon(item.category)}
                        {item.category_name || item.category}
                      </span>
                      <span className={`digi-sev-badge digi-sev-badge--${item.severity || 'high'}`}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {item.severity}
                      </span>
                      {item.is_duplicate ? (
                        <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                          🛡️ Duplicate (Cataloged)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                          ✓ Indexed to DB
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 6, fontWeight: 700, marginLeft: 'auto' }}>
                        📄 {item.sourceDocName}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
                      {item.title}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      {item.symptoms_early_indicators?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284c7', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Symptoms
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.symptoms_early_indicators.slice(0, 3).map((s, i) => (
                              <li key={i} className="digi-list-item">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.root_causes?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Root Causes
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.root_causes.slice(0, 3).map((r, i) => (
                              <li key={i} className="digi-list-item">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.mitigation_actions?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Mitigation Actions
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.mitigation_actions.slice(0, 3).map((m, i) => (
                              <li key={i} className="digi-list-item">{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToKnowledge) {
                            onNavigateToKnowledge({
                              targetItemId: item.existing_id || item.item_id,
                              searchQuery: item.title,
                              highlightItemIds: [item.item_id, item.existing_id].filter(Boolean),
                              autoOpenDoc: true
                            });
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f8fafc', color: '#0284c7', border: '1px solid #bae6fd',
                          borderRadius: 7, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e0f2fe'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <BookOpen size={14} />
                        <span>Open Playbook in KB Modal</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
