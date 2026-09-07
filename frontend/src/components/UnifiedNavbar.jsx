import React from 'react';
import { Drill, ArrowLeft } from 'lucide-react';

/**
 * UnifiedNavbar — Standard, consistent top navigation bar across all pages.
 * Contains:
 *   1. DrillSight icon & brand
 *   2. Features button with back arrow
 *   3. Home button with back arrow
 * Nothing else.
 */
export default function UnifiedNavbar({
  onNavigateToFeatures,
  onNavigateToLanding,
  activePage = ''
}) {
  const handleHomeClick = (e) => {
    e?.preventDefault();
    if (onNavigateToLanding) {
      onNavigateToLanding();
    } else {
      window.location.hash = '#landing';
    }
  };

  const handleFeaturesClick = (e) => {
    e?.preventDefault();
    if (onNavigateToFeatures) {
      onNavigateToFeatures();
    } else {
      window.location.hash = '#features';
    }
  };

  return (
    <header className="unified-topbar">
      <div className="unified-topbar__brand-wrapper">
        <div
          className="unified-topbar__brand-info"
          onClick={handleHomeClick}
          title="Return to Home"
        >
          <div className="unified-topbar__icon">
            <Drill size={18} />
          </div>
          <div className="unified-topbar__titles">
            <span className="unified-topbar__title">DrillSight</span>
            <span className="unified-topbar__sub">Oil Well Risk Intelligence</span>
          </div>
        </div>

        {/* 1. Features Button */}
        <button
          type="button"
          className={`unified-topbar__btn ${activePage === 'features' ? 'unified-topbar__btn--active' : ''}`}
          onClick={handleFeaturesClick}
          title="Explore Platform Features"
        >
          <ArrowLeft size={14} strokeWidth={2.4} />
          <span>Features</span>
        </button>

        {/* 2. Home Button */}
        <button
          type="button"
          className={`unified-topbar__btn ${activePage === 'home' || activePage === 'landing' ? 'unified-topbar__btn--active' : ''}`}
          onClick={handleHomeClick}
          title="Return to Home Page"
        >
          <ArrowLeft size={14} strokeWidth={2.4} />
          <span>Home</span>
        </button>
      </div>
    </header>
  );
}
