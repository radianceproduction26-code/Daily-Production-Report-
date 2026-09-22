import React from 'react';

/**
 * Radiance Polymers - Centralized Official SVG Logo Component
 * Preserves 4:1 aspect ratio, vector fidelity, and brand colors:
 * - Crimson Red: #CF2129 ("RADIANCE" + triple stripe 'E')
 * - Industrial Blue: #17498E ("POLYMERS" + triple stripe 'E')
 */
export default function Logo({
  variant = 'default', // 'default' (landscape), 'badge', 'compact'
  height = 40,
  className = '',
  style = {}
}) {
  const getDimensions = () => {
    switch (variant) {
      case 'compact':
        return { h: height, maxW: 160 };
      case 'badge':
        return { h: height, maxW: 200 };
      default:
        return { h: height, maxW: 240 };
    }
  };

  const dim = getDimensions();

  return (
    <div
      className={`radiance-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
      }}
    >
      <img
        src="/radiance-logo.svg"
        alt="Radiance Polymers"
        style={{
          height: `${dim.h}px`,
          width: 'auto',
          maxWidth: `${dim.maxW}px`,
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </div>
  );
}
