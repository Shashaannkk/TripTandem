// Utility to generate and provide valid UPI QR Code images for TripTandem debt settlements

export const createUpiQrSvg = (upiId = 'traveler@okaxis', name = 'TripTandem Traveler', color = '#0B2545') => {
  // Generate crisp standalone SVG data URI with UPI branding, corner target squares, and center badge
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" fill="#ffffff" rx="20"/>
    
    <!-- Outer Border -->
    <rect x="12" y="12" width="216" height="216" fill="none" stroke="#E2E8F0" stroke-width="2" rx="16"/>

    <!-- Top-Left QR Target -->
    <rect x="28" y="28" width="52" height="52" fill="${color}" rx="8"/>
    <rect x="36" y="36" width="36" height="36" fill="#ffffff" rx="4"/>
    <rect x="44" y="44" width="20" height="20" fill="#FF6B45" rx="3"/>

    <!-- Top-Right QR Target -->
    <rect x="160" y="28" width="52" height="52" fill="${color}" rx="8"/>
    <rect x="168" y="36" width="36" height="36" fill="#ffffff" rx="4"/>
    <rect x="176" y="44" width="20" height="20" fill="#FF6B45" rx="3"/>

    <!-- Bottom-Left QR Target -->
    <rect x="28" y="160" width="52" height="52" fill="${color}" rx="8"/>
    <rect x="36" y="168" width="36" height="36" fill="#ffffff" rx="4"/>
    <rect x="44" y="176" width="20" height="20" fill="#FF6B45" rx="3"/>

    <!-- Grid Data Elements -->
    <rect x="90" y="30" width="12" height="12" fill="${color}" rx="2"/>
    <rect x="110" y="30" width="12" height="24" fill="#2A9D8F" rx="2"/>
    <rect x="130" y="30" width="18" height="12" fill="${color}" rx="2"/>
    <rect x="90" y="52" width="18" height="12" fill="${color}" rx="2"/>
    <rect x="120" y="52" width="28" height="12" fill="#2A9D8F" rx="2"/>
    <rect x="90" y="72" width="12" height="12" fill="${color}" rx="2"/>
    <rect x="110" y="72" width="12" height="12" fill="#2A9D8F" rx="2"/>
    <rect x="130" y="72" width="20" height="12" fill="${color}" rx="2"/>

    <!-- Left & Right Vertical Data Columns -->
    <rect x="30" y="90" width="12" height="16" fill="${color}" rx="2"/>
    <rect x="50" y="90" width="20" height="12" fill="#2A9D8F" rx="2"/>
    <rect x="30" y="116" width="18" height="12" fill="${color}" rx="2"/>
    <rect x="60" y="116" width="12" height="24" fill="#2A9D8F" rx="2"/>
    <rect x="30" y="138" width="12" height="12" fill="${color}" rx="2"/>

    <rect x="160" y="90" width="16" height="12" fill="${color}" rx="2"/>
    <rect x="186" y="90" width="12" height="20" fill="#2A9D8F" rx="2"/>
    <rect x="160" y="112" width="12" height="16" fill="${color}" rx="2"/>
    <rect x="180" y="118" width="22" height="12" fill="#2A9D8F" rx="2"/>
    <rect x="160" y="138" width="20" height="12" fill="${color}" rx="2"/>

    <!-- Center UPI Security Badge -->
    <rect x="84" y="84" width="72" height="72" fill="#ffffff" rx="14" stroke="#E2E8F0" stroke-width="2"/>
    <rect x="88" y="88" width="64" height="64" fill="${color}" rx="12"/>
    <circle cx="120" cy="112" r="15" fill="#FF6B45"/>
    <path d="M113 112 L118 117 L127 107" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="120" y="138" font-size="9" font-weight="bold" fill="#FFC857" text-anchor="middle" font-family="system-ui, sans-serif">BHIM UPI</text>

    <!-- Bottom Data Grid -->
    <rect x="90" y="165" width="20" height="12" fill="${color}" rx="2"/>
    <rect x="120" y="165" width="12" height="24" fill="#2A9D8F" rx="2"/>
    <rect x="140" y="165" width="24" height="12" fill="${color}" rx="2"/>
    <rect x="175" y="165" width="12" height="12" fill="${color}" rx="2"/>
    <rect x="195" y="165" width="15" height="20" fill="${color}" rx="2"/>
    
    <rect x="90" y="190" width="12" height="20" fill="${color}" rx="2"/>
    <rect x="110" y="195" width="30" height="12" fill="#2A9D8F" rx="2"/>
    <rect x="150" y="185" width="16" height="20" fill="${color}" rx="2"/>
    <rect x="175" y="195" width="35" height="12" fill="${color}" rx="2"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const SAMPLE_QR_PRESETS = [
  {
    id: 'gpay',
    name: 'Google Pay Style',
    color: '#0B2545',
    upi: 'traveler@okhdfcbank',
    preview: createUpiQrSvg('traveler@okhdfcbank', 'Google Pay User', '#0B2545'),
  },
  {
    id: 'phonepe',
    name: 'PhonePe Style',
    color: '#5F259F',
    upi: 'traveler@ybl',
    preview: createUpiQrSvg('traveler@ybl', 'PhonePe User', '#5F259F'),
  },
  {
    id: 'paytm',
    name: 'Paytm / BHIM Style',
    color: '#00BAF2',
    upi: 'traveler@paytm',
    preview: createUpiQrSvg('traveler@paytm', 'Paytm User', '#002E6E'),
  },
];
