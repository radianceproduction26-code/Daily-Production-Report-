// Script to generate a high-quality, professional PDF guide for Going Live & Laptop Master Sheet Sync
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - (margin * 2);

// Colors
const NAVY = [27, 54, 93];        // #1B365D - Radiance Primary
const BLUE = [2, 132, 199];       // #0284c7 - Accent
const DARK_GRAY = [30, 41, 59];   // #1E293B - Body
const LIGHT_BG = [248, 250, 252]; // #F8FAFC
const BORDER_CLR = [226, 232, 240];
const GREEN = [16, 185, 129];
const AMBER = [217, 119, 6];

// Helper to draw header
function drawHeader(title, subtitle) {
  // Top brand bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent line
  doc.setFillColor(...BLUE);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RADIANCE POLYMERS PVT. LTD.', margin, 11);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(title, margin, 18);

  doc.setFontSize(7.5);
  doc.setTextColor(200, 220, 245);
  doc.text(subtitle, margin, 24);
}

// Helper to draw footer
function drawFooter(pageNo, totalPages) {
  doc.setDrawColor(...BORDER_CLR);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 145);
  doc.text('Radiance Polymers • Digital Production Reporting System v1.0.3 • Confidential', margin, pageHeight - 7);
  doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
}

// ==========================================
// PAGE 1: ARCHITECTURE + STEP 1 + STEP 2
// ==========================================
drawHeader('EASY STEP-BY-STEP GUIDE: GOING ONLINE & LAPTOP MASTER SHEET', 'Plant Operations & IT Implementation Handbook');

let y = 36;

// Overview Card
doc.setFillColor(...LIGHT_BG);
doc.setDrawColor(...BORDER_CLR);
doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...NAVY);
doc.text('HOW THE SYSTEM WORKS IN SIMPLE WORDS', margin + 4, y + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.2);
doc.setTextColor(...DARK_GRAY);
doc.text('1. Cloud Database (Supabase): Keeps all production shift reports securely stored on the internet.', margin + 4, y + 12);
doc.text('2. Online App (Vercel): Provides a website link (e.g. radiance.vercel.app) for mobile phones on the factory floor.', margin + 4, y + 17);
doc.text('3. Laptop Master Sheet: When an operator taps "Submit", it instantly reflects on your laptop screen live!', margin + 4, y + 22);

y += 32;

// SECTION 1: STEP 1
doc.setFillColor(239, 246, 255); // light blue
doc.setDrawColor(191, 219, 254);
doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(...NAVY);
doc.text('STEP 1: Set Up Free Cloud Database (Takes 3 Minutes)', margin + 4, y + 5);

y += 11;

const step1Points = [
  { num: '1.', text: 'Open your browser and visit: https://supabase.com' },
  { num: '2.', text: 'Click "Start your project" and sign in with your Google account or work email.' },
  { num: '3.', text: 'Click the green "New Project" button:' },
  { num: '   •', text: 'Name: Type "radiance-production"' },
  { num: '   •', text: 'Database Password: Choose any secure password and save it.' },
  { num: '   •', text: 'Region: Select "South Asia (Mumbai)" for fastest India speed, then click Create.' },
  { num: '4.', text: 'In the left sidebar, click the SQL Editor icon (looks like >_):' },
  { num: '   •', text: 'Click "New query".' },
  { num: '   •', text: 'Open file: supabase/migrations/20260922_cloud_sync_master_schema.sql from project folder.' },
  { num: '   •', text: 'Copy all contents, paste into the box, and click the green "Run" button.' },
  { num: '   •', text: 'You will see "Success. No rows returned". Your cloud table is now live!' },
  { num: '5.', text: 'In the left sidebar, click the Settings Gear icon (⚙️) ➔ API (or Data API):' },
  { num: '   •', text: 'Copy your Project URL (e.g. https://xyzabcdef.supabase.co)' },
  { num: '   •', text: 'Copy your anon public key (long text starting with eyJ...)' }
];

doc.setFontSize(8.3);
step1Points.forEach(pt => {
  doc.setFont('helvetica', pt.num.includes('•') ? 'normal' : 'bold');
  doc.setTextColor(...NAVY);
  doc.text(pt.num, margin + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);
  doc.text(pt.text, margin + 12, y);
  y += 5.2;
});

y += 3;

// SECTION 2: STEP 2
doc.setFillColor(240, 253, 244); // light green
doc.setDrawColor(187, 247, 208);
doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(22, 101, 52);
doc.text('STEP 2: Enter Supabase Keys in App Settings (Takes 1 Minute)', margin + 4, y + 5);

y += 11;

const step2Points = [
  { num: '1.', text: 'Open the Production Report App on your laptop.' },
  { num: '2.', text: 'Click the "Settings" tab in the navigation bar.' },
  { num: '3.', text: 'Scroll down to the "System Health & Supabase Cloud" section.' },
  { num: '4.', text: 'Paste your Project URL and Anon Public Key from Step 1 into the fields.' },
  { num: '5.', text: 'Click "Test Live Connection" ➔ App displays: "🟢 Supabase Ping Succeeded!"' },
  { num: '6.', text: 'Click "Save Configuration". The app is now connected to the cloud!' }
];

doc.setFontSize(8.3);
step2Points.forEach(pt => {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(pt.num, margin + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);
  doc.text(pt.text, margin + 12, y);
  y += 5.4;
});

drawFooter(1, 2);

// ==========================================
// PAGE 2: STEP 3 + STEP 4 + GOOGLE SHEETS
// ==========================================
doc.addPage();
drawHeader('EASY STEP-BY-STEP GUIDE: GOING ONLINE & LAPTOP MASTER SHEET', 'Hosting, Live Reflection & Spreadsheet Integration');

y = 36;

// SECTION 3: STEP 3
doc.setFillColor(254, 243, 199); // light amber
doc.setDrawColor(253, 230, 138);
doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(...AMBER);
doc.text('STEP 3: Host the App Online with Vercel (Takes 2 Minutes)', margin + 4, y + 5);

y += 11;

const step3Points = [
  { num: '1.', text: 'Go to https://vercel.com and sign up/log in with your Google account.' },
  { num: '2.', text: 'Click "Add New..." ➔ "Project" and import your project directory/repository.' },
  { num: '3.', text: 'Under "Environment Variables", add the two keys from Step 1:' },
  { num: '   •', text: 'Name: VITE_SUPABASE_URL     | Value: (Your Supabase Project URL)' },
  { num: '   •', text: 'Name: VITE_SUPABASE_ANON_KEY | Value: (Your Supabase Anon Key)' },
  { num: '4.', text: 'Click the "Deploy" button.' },
  { num: '5.', text: 'Within 60 seconds, Vercel gives you a secure live URL (e.g. https://radiance.vercel.app).' },
  { num: '6.', text: 'Share this link with your machine operators via WhatsApp. No installation required!' }
];

doc.setFontSize(8.3);
step3Points.forEach(pt => {
  doc.setFont('helvetica', pt.num.includes('•') ? 'normal' : 'bold');
  doc.setTextColor(...AMBER);
  doc.text(pt.num, margin + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);
  doc.text(pt.text, margin + 12, y);
  y += 5.2;
});

y += 4;

// SECTION 4: STEP 4
doc.setFillColor(248, 250, 252);
doc.setDrawColor(...NAVY);
doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(...NAVY);
doc.text('STEP 4: How It Appears on Your Laptop Master Sheet', margin + 4, y + 5);

y += 11;

const step4Points = [
  { num: '•', text: 'Open the app on your laptop and click the "Master Sheet" tab in the top navigation.' },
  { num: '•', text: 'You will see a green badge: "🟢 Supabase Cloud Live".' },
  { num: '•', text: 'Whenever any operator submits a shift on the shop floor from their phone, it reflects INSTANTLY' },
  { num: ' ', text: 'at the top of your Laptop Master Sheet without needing to reload or refresh!' },
  { num: '•', text: 'Click "Download Master Excel (.xlsx)" anytime to download a formatted cumulative workbook.' }
];

doc.setFontSize(8.3);
step4Points.forEach(pt => {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(pt.num, margin + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);
  doc.text(pt.text, margin + 10, y);
  y += 5.2;
});

y += 4;

// SECTION 5: OPTIONAL GOOGLE SHEETS
doc.setFillColor(245, 243, 255); // light purple
doc.setDrawColor(221, 214, 254);
doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(109, 40, 217);
doc.text('OPTIONAL: Link Directly to Personal Google Sheet on Your Laptop', margin + 4, y + 5);

y += 11;

const gsheetPoints = [
  '1. Open a Google Sheet on your laptop: "Radiance Production Master Sheet".',
  '2. Click Extensions ➔ Apps Script, paste the 15-line script provided in the app, and click Save.',
  '3. Click Deploy ➔ New Deployment ➔ Web App (Who has access: Anyone) ➔ Copy Web App URL.',
  '4. In the app\'s Master Sheet, click "Link Google Sheet", paste the URL, and click Save.',
  '5. Every submitted shift report will now also append a brand-new row into your Google Sheet!'
];

doc.setFontSize(8.1);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...DARK_GRAY);
gsheetPoints.forEach(pt => {
  doc.text(pt, margin + 4, y);
  y += 4.8;
});

y += 4;

// Guarantee Box
doc.setFillColor(...LIGHT_BG);
doc.setDrawColor(...GREEN);
doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(5, 150, 105);
doc.text('✓ 100% Offline Resilience Guarantee', margin + 4, y + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.6);
doc.setTextColor(...DARK_GRAY);
doc.text('If shop-floor Wi-Fi drops, operators can continue entering hourly data and submit reports normally.', margin + 4, y + 11);
doc.text('The app stores data locally and automatically syncs to the cloud and your laptop as soon as connection returns.', margin + 4, y + 15);

drawFooter(2, 2);

// Output PDF to disk
const outputPath = path.resolve('Radiance_Polymers_Go_Live_and_Master_Sheet_Guide.pdf');
const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

console.log(`\n🎉 PDF Guide successfully generated at:\n${outputPath}\n`);
