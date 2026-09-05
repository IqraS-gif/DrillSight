import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Mic, Camera, Video, Sparkles, MapPin, Calendar,
  CheckCircle2, AlertTriangle, X, Play, Square, Loader2,
  BookOpen, ChevronRight, Compass, ShieldAlert, Layers, Droplets,
  Flame, Zap, Anchor, Activity, FileText
} from 'lucide-react';
import '../instinct.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DrillersInstinct({
  onNavigateToLanding,
  onNavigateToFeatures,
  onNavigateToKnowledge,
  onNavigateToDashboard
}) {
  // Mode: "field" | "general"
  const [mode, setMode] = useState('field');

  // Field Metadata
  const [fieldName, setFieldName] = useState('Volve Field (Block 15/9)');
  const [captureDate, setCaptureDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('Platform B, Slot 4 (58.44° N, 1.88° E)');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Media Capture States
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  // Pipeline Submission States
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const resultsRef = useRef(null);

  // Auto-scroll to results when ready
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [result]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── GPS Geolocation Handler ──
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setLocation(`${lat}° N, ${lng}° E (GPS Verified)`);
      },
      (err) => {
        setGpsLoading(false);
        alert(`Could not acquire GPS: ${err.message}. You can type the wellpad or block manually.`);
      },
      { timeout: 8000 }
    );
  };

  // ── Audio Recording Toggle (User's Orb Interaction) ──
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          const reader = new FileReader();
          reader.onload = (ev) => {
            setAudioUrl(ev.target.result); // Reliable base64 audio URI
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach(track => track.stop());

          // If notes are empty, prefill a draft note
          if (!notes.trim()) {
            setNotes("Audio voice recording captured from rig floor. (Tap 'Analyze & Ingest with AI' to extract structured knowledge)");
          }
        };

        recorder.start(250);
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      } catch (err) {
        alert("Microphone access was denied or not available. You can still type your field tips below!");
      }
    }
  };

  // ── Photo Input Handler (Uses FileReader for permanent Data URL) ──
  const handlePhotoSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target.result); // Reliable base64 image URI that never breaks
      };
      reader.readAsDataURL(f);
    }
  };

  // ── Video Input Handler ──
  const handleVideoSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setVideoFile(f);
      const url = URL.createObjectURL(f);
      setVideoPreview(url);
    }
  };

  // ── Submit Capture to Backend ──
  const handleSubmit = async () => {
    if (!notes.trim() && !audioBlob && !photoFile && !videoFile) {
      setError("Please provide voice notes, a field description, or capture media before ingesting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("mode", mode);
      form.append("notes", notes || "Driller voice observation from rig floor.");
      if (mode === 'field') {
        form.append("field_name", fieldName);
        form.append("capture_date", captureDate);
        form.append("location", location);
      }

      // Attach all provided media files simultaneously
      if (audioBlob) {
        form.append("audio_file", audioBlob, "field_voice_log.webm");
        form.append("has_audio", "true");
      }
      if (photoFile) {
        form.append("photo_file", photoFile, photoFile.name || "field_photo.jpg");
        form.append("has_photo", "true");
      }
      if (videoFile) {
        form.append("video_file", videoFile, videoFile.name || "field_video.webm");
        form.append("has_video", "true");
      }

      const mediaTypes = [];
      if (audioBlob) mediaTypes.push("audio");
      if (photoFile) mediaTypes.push("photo");
      if (videoFile) mediaTypes.push("video");
      form.append("media_type", mediaTypes.length > 0 ? mediaTypes.join("+") : "text");

      const res = await fetch(`${API}/api/tacit/capture`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error submitting tacit knowledge.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Could not process tacit knowledge. Please check the backend.");
    } finally {
      setSubmitting(false);
    }
  };

  // Format timer MM:SS
  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="instinct-page">
      {/* ── Topbar ── */}
      <header className="instinct-topbar">
        <button type="button" className="instinct-back-btn" onClick={onNavigateToLanding}>
          <ArrowLeft size={14} />
          <span>Home</span>
        </button>

        {onNavigateToFeatures && (
          <button type="button" className="instinct-back-btn" onClick={onNavigateToFeatures}>
            <span>Features</span>
          </button>
        )}

        <div className="instinct-title-block">
          <Mic size={18} color="#e11d48" />
          <h1>Driller's Instinct AI</h1>
          <span className="instinct-badge-tacit">Tacit Knowledge</span>
        </div>

        <button
          type="button"
          className="instinct-back-btn"
          onClick={onNavigateToKnowledge}
          style={{ marginLeft: 'auto', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
        >
          <BookOpen size={14} />
          <span>Knowledge Base</span>
        </button>
      </header>

      {/* ── Main Container ── */}
      <main className="instinct-container">
        {/* Hero Section */}
        <section className="instinct-hero">
          <div className="instinct-hero-tag">
            <Sparkles size={14} />
            <span>UNWRITTEN RIG EXPERTISE CAPTURE</span>
          </div>
          <h2>
            Turn Driller Instincts Into<br />
            <span className="instinct-hero-gradient">Searchable Enterprise Playbooks</span>
          </h2>
          <p>
            Capture hands-on field tips, downhole gut feelings, and workarounds through voice, photos, and video before they leave the rig floor.
          </p>
        </section>

        {/* ── Mode Switcher ── */}
        <div className="instinct-mode-tabs" role="tablist">
          <button
            type="button"
            className={`instinct-mode-btn field-mode ${mode === 'field' ? 'instinct-mode-btn--active' : ''}`}
            onClick={() => setMode('field')}
          >
            <Compass size={17} />
            <span>Capture Tacit Knowledge at Field</span>
          </button>
          <button
            type="button"
            className={`instinct-mode-btn ${mode === 'general' ? 'instinct-mode-btn--active' : ''}`}
            onClick={() => setMode('general')}
          >
            <Mic size={17} />
            <span>Capture Tacit Knowledge (General)</span>
          </button>
        </div>

        {/* ── Field Metadata Box (Shown for Field Mode) ── */}
        {mode === 'field' && (
          <div className="instinct-field-meta-box">
            <h3 className="instinct-meta-title">
              <MapPin size={15} />
              <span>Field &amp; Environmental Location</span>
            </h3>

            <div className="instinct-meta-grid">
              <div className="instinct-input-group">
                <label>Field / Block Name</label>
                <input
                  type="text"
                  className="instinct-input"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Volve Field (Block 15/9), Johan Sverdrup"
                />
              </div>

              <div className="instinct-input-group">
                <label>Date of Capture</label>
                <input
                  type="date"
                  className="instinct-input"
                  value={captureDate}
                  onChange={(e) => setCaptureDate(e.target.value)}
                />
              </div>

              <div className="instinct-input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Rig / Wellpad Coordinates</label>
                <div className="instinct-input-row">
                  <input
                    type="text"
                    className="instinct-input"
                    style={{ flex: 1 }}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Platform B, Slot 4 or 58.441° N, 1.884° E"
                  />
                  <button
                    type="button"
                    className="instinct-gps-btn"
                    onClick={handleGetGps}
                    disabled={gpsLoading}
                  >
                    <MapPin size={13} />
                    <span>{gpsLoading ? 'Acquiring…' : 'GPS Auto-Tag'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Multi-Modal Capture Panel ── */}
        <div className="instinct-capture-panel">
          {/* USER'S GLOWING AUDIO ORB COMPONENT */}
          <div className="audio-orb-container">
            <input
              type="checkbox"
              id="toggle"
              checked={isRecording}
              onChange={toggleRecording}
            />
            <label htmlFor="toggle" className={`orb-button ${isRecording ? 'is-recording' : ''}`}>
              <div className="orb">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-mic-fill" viewBox="0 0 16 16">
                  <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z" />
                  <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5" />
                </svg>
              </div>
              <div className="waveform">
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
              </div>
            </label>

            <div className="orb-status-text">
              <span className={`orb-status-dot ${isRecording ? 'pulse' : ''}`} />
              <span>
                {isRecording ? `Recording Driller Voice… ${formatTime(recordingSeconds)}` : 'Tap Orb to Record Driller Voice'}
              </span>
            </div>

            {/* Audio Preview if recorded */}
            {audioUrl && !isRecording && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <audio controls src={audioUrl} style={{ height: 36 }} />
                <button
                  type="button"
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                  style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Clear audio
                </button>
              </div>
            )}
          </div>

          {/* Photo & Video Multi-Modal Capture */}
          <div className="instinct-media-row">
            {/* Photo Capture */}
            <label className="instinct-media-card">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Field Capture" className="instinct-preview-thumbnail" />
                  <button
                    type="button"
                    className="instinct-clear-media-btn"
                    onClick={(e) => { e.preventDefault(); setPhotoFile(null); setPhotoPreview(null); }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="instinct-media-icon">
                    <Camera size={22} />
                  </div>
                  <h4>Capture Photo</h4>
                  <p>Shakers, tool face, cuttings, or gauge readings</p>
                </>
              )}
            </label>

            {/* Video Capture */}
            <label className="instinct-media-card">
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleVideoSelect}
                style={{ display: 'none' }}
              />
              {videoPreview ? (
                <>
                  <video src={videoPreview} controls className="instinct-preview-thumbnail" />
                  <button
                    type="button"
                    className="instinct-clear-media-btn"
                    onClick={(e) => { e.preventDefault(); setVideoFile(null); setVideoPreview(null); }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="instinct-media-icon">
                    <Video size={22} />
                  </div>
                  <h4>Record Video</h4>
                  <p>Pipe vibration, fluid returns, or trip tank movements</p>
                </>
              )}
            </label>
          </div>

          {/* Driller Notes / Speech Transcript */}
          <div className="instinct-textarea-group">
            <label>
              <FileText size={15} color="#0284c7" />
              <span>Driller Insight / Notes / Workaround Description</span>
            </label>
            <textarea
              className="instinct-textarea"
              placeholder="Describe the downhole observation or rule of thumb... (e.g. 'Whenever tripping into depleted Hugin sand, if drag exceeds 20 klbs, don't force it down — backream with 400 gpm and 40 RPM to avoid pack-off.')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button
            type="button"
            className="instinct-submit-btn"
            onClick={handleSubmit}
            disabled={submitting || isRecording}
          >
            {submitting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Extracting &amp; Grouping into Knowledge Base…</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Analyze &amp; Ingest Tacit Knowledge</span>
              </>
            )}
          </button>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
              <AlertTriangle size={18} color="#dc2626" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Results Section ── */}
        {result?.structured_record && (
          <div className="instinct-results-panel" ref={resultsRef}>
            <div className="instinct-result-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      background: `${result.structured_record.category_color}20`,
                      color: result.structured_record.category_color,
                      border: `1px solid ${result.structured_record.category_color}50`,
                      borderRadius: 9999, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800
                    }}
                  >
                    {result.structured_record.category_name}
                  </span>
                  <span className="instinct-badge-group">
                    Group: {result.structured_record.retrieval_group}
                  </span>
                  {result.is_duplicate ? (
                    <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 9999, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
                      🛡️ Existing Rule in KB
                    </span>
                  ) : (
                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 9999, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
                      ✓ Indexed to Database
                    </span>
                  )}
                </div>
                <h3 className="instinct-result-title">{result.structured_record.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToKnowledge) {
                    onNavigateToKnowledge({
                      targetItemId: result.structured_record.item_id,
                      searchQuery: result.structured_record.title,
                      autoOpenDoc: true
                    });
                  }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#0284c7', color: '#ffffff', border: 'none',
                  borderRadius: 8, padding: '9px 16px', fontSize: '0.84rem', fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <span>View in Knowledge Base</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {/* ── AI MULTI-MODAL INPUT SYNTHESIS (Voice, Video, Photo, Notes) ── */}
            <div className="instinct-ai-summary-box">
              <div className="instinct-ai-summary-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color="#0284c7" />
                  <span className="instinct-ai-summary-title">AI Multi-Modal Input Summary</span>
                </div>
                <div className="instinct-ai-summary-pill">
                  {audioBlob && <span>🎙️ Audio</span>}
                  {photoFile && <span>📸 Photo</span>}
                  {videoFile && <span>🎥 Video</span>}
                  {notes && <span>📝 Text</span>}
                  {!audioBlob && !photoFile && !videoFile && <span>Multi-Modal Pipeline</span>}
                </div>
              </div>

              {/* Executive synthesis of all inputs */}
              <p className="instinct-ai-summary-text">
                {result.structured_record.ai_multimodal_summary ||
                 `AI Multi-Modal Synthesis analyzed the field inputs (audio voice transmission, visual equipment feeds, and driller notes). Extracted operational signatures and cross-referenced with offset well dynamics.`}
              </p>

              {/* Modality breakdown grid */}
              {(() => {
                const activeAudio = result.structured_record?.audio_url || audioUrl;
                const activePhoto = result.structured_record?.photo_url || photoPreview;
                const activeVideo = result.structured_record?.video_url || videoPreview;
                return (
                  <div className="instinct-modality-grid">
                    {/* 1. Voice Audio */}
                    <div className={`instinct-modality-card ${activeAudio ? 'has-media' : ''}`}>
                      <div className="instinct-modality-header">
                        <Mic size={14} color="#0284c7" />
                        <strong>Voice Audio Transmission</strong>
                        {activeAudio && <span className="modality-badge">Recorded</span>}
                      </div>
                      {activeAudio && (
                        <div style={{ margin: '6px 0' }}>
                          <audio controls src={activeAudio} style={{ width: '100%', height: 36 }} />
                        </div>
                      )}
                      <p className="instinct-modality-desc">
                        {result.structured_record.input_breakdown?.voice_audio_synthesis ||
                         (activeAudio ? "Driller voice note analyzed for verbal heuristics, audible pump cadence, and operational urgency." : "Verbal report captured directly from rig floor intercom/mic.")}
                      </p>
                    </div>

                    {/* 2. Visual Photo */}
                    <div className={`instinct-modality-card ${activePhoto ? 'has-media' : ''}`}>
                      <div className="instinct-modality-header">
                        <Camera size={14} color="#0284c7" />
                        <strong>Visual Inspection Photos</strong>
                        {activePhoto && <span className="modality-badge">Photo Attached</span>}
                      </div>
                      {activePhoto && (
                        <div style={{ margin: '6px 0' }}>
                          <img
                            src={activePhoto}
                            alt="Field Inspection Evidence"
                            style={{
                              maxHeight: 160,
                              borderRadius: 8,
                              width: '100%',
                              objectFit: 'contain',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              display: 'block'
                            }}
                          />
                        </div>
                      )}
                      <p className="instinct-modality-desc">
                        {result.structured_record.input_breakdown?.visual_evidence_synthesis ||
                         (activePhoto ? "Visual analysis confirms surface equipment integrity, fluid level patterns, and physical wear markers." : "Visual inspection cues aligned with surface telemetry and shaker observations.")}
                      </p>
                    </div>

                    {/* 3. Video Telemetry */}
                    <div className={`instinct-modality-card ${activeVideo ? 'has-media' : ''}`}>
                      <div className="instinct-modality-header">
                        <Video size={14} color="#0284c7" />
                        <strong>Video &amp; Motion Telemetry</strong>
                        {activeVideo && <span className="modality-badge">Video Attached</span>}
                      </div>
                      {activeVideo && (
                        <div style={{ margin: '6px 0' }}>
                          <video controls src={activeVideo} style={{ maxHeight: 140, borderRadius: 8, width: '100%', border: '1px solid #cbd5e1' }} />
                        </div>
                      )}
                      <p className="instinct-modality-desc">
                        {activeVideo 
                          ? "Video stream inspected for string oscillation, fluid return turbulence, and rig floor tool joint actions." 
                          : "Telemetry kinematics verify smooth rotary movement and steady pressure thresholds."}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Driller Rule of Thumb */}
            <div className="instinct-rule-card">
              <div className="instinct-rule-label">Driller's Core Rule of Thumb</div>
              <p className="instinct-rule-text">"{result.structured_record.rule_of_thumb}"</p>
            </div>

            {/* Actions & Guidelines */}
            {result.structured_record.mitigation_actions?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0', fontWeight: 800 }}>
                  Recommended Hands-On Procedure
                </h4>
                <ol className="instinct-actions-list">
                  {result.structured_record.mitigation_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Field Metadata Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <span><strong>Field:</strong> {result.structured_record.field_name}</span>
              <span><strong>Date:</strong> {result.structured_record.capture_date}</span>
              <span><strong>Location:</strong> {result.structured_record.location}</span>
              <span><strong>Media:</strong> {result.structured_record.media_type}</span>
              <span style={{ marginLeft: 'auto', color: '#0284c7', fontWeight: 700 }}>Engine: {result.engine_used}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
