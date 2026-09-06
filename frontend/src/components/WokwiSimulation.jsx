import { useState, useRef } from 'react';
import { Drill, ArrowLeft, WifiOff, RefreshCw, ExternalLink, Cpu } from 'lucide-react';

const WOKWI_URL   = 'https://wokwi.com/projects/473704194812138497';
const WOKWI_EMBED = 'https://wokwi.com/projects/473704194812138497?embed=1';

export default function WokwiSimulation({ onNavigateToLanding, onNavigateToFeatures }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded,     setIsLoaded]     = useState(false);
  const [hasError,     setHasError]     = useState(false);
  const [reloadKey,    setReloadKey]    = useState(0);
  const iframeRef = useRef(null);

  const handleReload = () => {
    setIsLoaded(false);
    setHasError(false);
    setReloadKey(k => k + 1);
  };

  return (
    <div style={pageStyle}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* DrillSight brand */}
          <div style={dsBrandStyle} onClick={onNavigateToLanding} title="Return to DrillSight Home">
            <div style={dsIconStyle}>
              <Drill size={18} />
            </div>
            <div>
              <div style={dsTitleStyle}>DRILLSIGHT</div>
              <div style={dsSubStyle}>NEARBY WELLS INTELLIGENCE SYSTEM</div>
            </div>
          </div>

          {/* Back to Features */}
          <button style={backBtnStyle} onClick={onNavigateToFeatures} title="Back to Features">
            <ArrowLeft size={15} />
            <span>Back to Features</span>
          </button>
        </div>
      </header>

      {/* ── Body: info panel + sim ──────────────────────────── */}
      <div style={bodyStyle}>

        {/* ── Iframe ── */}
        <div style={simWrapperStyle(isFullscreen)}>

          {/* Loading overlay */}
          {!isLoaded && !hasError && (
            <div style={overlayStyle}>
              <div style={loaderCard}>
                <div style={spinner} />
                <p style={{ margin: '14px 0 4px', fontWeight: 600, color: '#0e7490' }}>Loading Simulation…</p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textAlign: 'center', maxWidth: 240 }}>
                  Wokwi is spinning up your ESP32 project.
                </p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div style={overlayStyle}>
              <div style={loaderCard}>
                <WifiOff size={36} color="#ef4444" />
                <p style={{ margin: '14px 0 4px', fontWeight: 600, color: '#ef4444' }}>Could Not Load</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button style={retryBtn} onClick={handleReload}><RefreshCw size={13} /> Retry</button>
                  <a href={WOKWI_URL} target="_blank" rel="noopener noreferrer" style={openBtnSm}>
                    <ExternalLink size={13} /> Open in Wokwi
                  </a>
                </div>
              </div>
            </div>
          )}

          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={WOKWI_EMBED}
            title="Wokwi Rig Simulation"
            style={iframeStyle(isLoaded)}
            allow="serial; microphone; camera; clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={() => setIsLoaded(true)}
            onError={() => { setHasError(true); setIsLoaded(false); }}
          />

          {/* White panel covering Wokwi editor, featuring the Edge & Cloud Architecture diagram */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            width: '49.5%',
            background: '#ffffff',
            borderRight: '1.5px solid #e2e8f0',
            boxShadow: '4px 0 16px rgba(0, 0, 0, 0.04)',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 24px',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}>
            {/* Header / Title Section */}
            <div style={{ marginBottom: 14, flexShrink: 0 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 20,
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                <Cpu size={13} />
                <span>Rig Telemetry & Failover</span>
              </div>
              <h2 style={{
                fontSize: '1.22rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
              }}>
                Why Edge AI is Needed
              </h2>
              <p style={{
                fontSize: '0.8rem',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.45,
              }}>
                Guarantees zero-latency kick detection and real-time safety interventions directly on the rig, even when satellite uplink or cloud connection drops.
              </p>
            </div>

            {/* Image Container with Border */}
            <div style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px',
              background: '#f8fafc',
              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
            }}>
              <img
                src="/edge-architecture.jpg"
                alt="Why Edge AI is Needed - Rig Architecture"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        @keyframes ws-loader {
          0%   { border-top-color: #0e7490; }
          50%  { border-top-color: #7c3aed; }
          100% { border-top-color: #0e7490; }
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const pageStyle = {
  display: 'flex', flexDirection: 'column',
  height: '100vh', background: '#f8fafc',
  fontFamily: "'Inter','Segoe UI',sans-serif",
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 20px',
  background: '#ffffff',
  borderBottom: '1.5px solid #e2e8f0',
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  flexShrink: 0, gap: 12, flexWrap: 'wrap',
};

const dsBrandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  cursor: 'pointer',
  textDecoration: 'none',
};

const dsIconStyle = {
  width: 36,
  height: 36,
  background: 'linear-gradient(135deg, #0066ee 0%, #0052cc 100%)',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  boxShadow: '0 2px 8px rgba(0, 102, 238, 0.3)',
  flexShrink: 0,
};

const dsTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: '#0f172a',
  lineHeight: 1.15,
};

const dsSubStyle = {
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#0066ee',
  textTransform: 'uppercase',
};

const backBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  transition: 'all 0.15s ease',
};

/* Body splits into [info panel | sim] */
const bodyStyle = {
  flex: 1, display: 'flex', overflow: 'hidden',
};

/* ── Sim wrapper ── */
const simWrapperStyle = (fullscreen) => ({
  flex: 1, position: 'relative',
  overflow: 'hidden',
  ...(fullscreen ? { position: 'fixed', inset: 0, zIndex: 9999 } : {}),
});

const iframeStyle = (loaded) => ({
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
  opacity: loaded ? 1 : 0,
  transition: 'opacity 0.5s ease',
});

const overlayStyle = {
  position: 'absolute', inset: 0, zIndex: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(248,250,252,0.96)',
};

const loaderCard = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  background: '#fff', border: '1.5px solid #e2e8f0',
  borderRadius: 16, padding: '32px 40px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
};

const spinner = {
  width: 44, height: 44,
  border: '4px solid #e2e8f0',
  borderTop: '4px solid #0e7490',
  borderRadius: '50%',
  animation: 'ws-spin 0.9s linear infinite, ws-loader 3s linear infinite',
};

const retryBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid #e2e8f0', background: '#f8fafc',
  color: '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
};

const openBtnSm = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8,
  background: 'linear-gradient(135deg,#0e7490,#0369a1)',
  color: '#fff', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600,
};
