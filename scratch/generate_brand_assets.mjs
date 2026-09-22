import fs from 'fs';
import path from 'path';

const logoBuf = fs.readFileSync('radiance-polymer-logo.png');
const base64 = logoBuf.toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

// 1. Direct Landscape SVG
const landscapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" width="200" height="80">
  <image width="200" height="80" href="${dataUri}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
fs.writeFileSync('public/radiance-logo.svg', landscapeSvg);

// 2. Square Favicon SVG
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="36" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
  <image x="15" y="60" width="170" height="80" href="${dataUri}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
fs.writeFileSync('public/favicon.svg', squareSvg);

// 3. Static copies in public and src/assets
fs.copyFileSync('radiance-polymer-logo.png', 'public/radiance-polymer-logo.png');
if (!fs.existsSync('src/assets')) fs.mkdirSync('src/assets', { recursive: true });
fs.copyFileSync('radiance-polymer-logo.png', 'src/assets/radiance-polymer-logo.png');
fs.writeFileSync('src/assets/radiance-logo.svg', landscapeSvg);

// Save base64 string for direct embedding in exportService / emails / PDFs
fs.writeFileSync('src/assets/logoBase64.js', `// Official Radiance Polymers Base64 Logo Asset
export const RADIANCE_LOGO_BASE64 = "${base64}";
export const RADIANCE_LOGO_DATA_URI = "${dataUri}";
`);

console.log('SVG, assets and base64 constants generated successfully.');
