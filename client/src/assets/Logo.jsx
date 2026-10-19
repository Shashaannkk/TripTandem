import React from 'react';

/**
 * Official TripTandem Brand Logo Component
 *
 * Integrates the official TripTandem brand showcase assets:
 * - Light Mode: on cream/sand (#F9F7F2, #FAF8F2) or white backgrounds
 * - Dark Mode: on deep navy (#0B2545) or dark video overlays
 * - Variants: 'horizontal' (navbar/header), 'stacked' (showcase), 'mark' (icon only), 'wordmark'
 */

export const LogoMark = ({
  size = 40,
  dark = false,
  className = '',
  alt = 'TripTandem Emblem',
}) => {
  const src = dark ? '/brand/logo-mark-dark.png' : '/brand/logo-mark-light.png';

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block object-contain flex-shrink-0 transition-opacity ${className}`}
      style={{ width: `${size}px`, height: 'auto', maxHeight: `${size * 1.05}px` }}
      loading="eager"
    />
  );
};

export const Logo = ({
  size = 36,
  dark = false,
  variant = 'horizontal', // 'horizontal' | 'stacked' | 'mark' | 'wordmark'
  showTagline = false,
  className = '',
  alt = 'TripTandem — Plan your trip. Find your rhythm.',
}) => {
  // 1. Icon-only variant
  if (variant === 'mark' || variant === 'icon') {
    return <LogoMark size={size} dark={dark} className={className} alt={alt} />;
  }

  // 2. Stacked / Vertical Full lockup
  if (variant === 'stacked' || variant === 'vertical') {
    const src = dark ? '/brand/logo-dark-full.png' : '/brand/logo-light-full.png';
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        <img
          src={src}
          alt={alt}
          className="object-contain"
          style={{ height: `${size * 2}px`, width: 'auto' }}
          loading="eager"
        />
      </div>
    );
  }

  // 3. Wordmark-only
  if (variant === 'wordmark') {
    const src = dark
      ? showTagline
        ? '/brand/logo-wordmark-dark-tagline.png'
        : '/brand/logo-wordmark-dark.png'
      : showTagline
        ? '/brand/logo-wordmark-light-tagline.png'
        : '/brand/logo-wordmark-light.png';
    return (
      <img
        src={src}
        alt={alt}
        className={`object-contain select-none ${className}`}
        style={{ height: `${size}px`, width: 'auto' }}
        loading="eager"
      />
    );
  }

  // 4. Horizontal lockup (Default: Emblem + Wordmark)
  const horizontalSrc = dark
    ? showTagline
      ? '/brand/logo-horizontal-dark-tagline.png'
      : '/brand/logo-horizontal-dark.png'
    : showTagline
      ? '/brand/logo-horizontal-light-tagline.png'
      : '/brand/logo-horizontal-light.png';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={horizontalSrc}
        alt={alt}
        className="object-contain"
        style={{ height: `${size}px`, width: 'auto', maxWidth: '100%' }}
        loading="eager"
      />
    </div>
  );
};

export default Logo;
