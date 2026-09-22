import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const framesDir = path.resolve('scratch/walkthrough_project/frames');
const logoBase64 = fs.readFileSync('radiance-polymer-logo.png').toString('base64');
const logoDataUri = `data:image/png;base64,${logoBase64}`;

const sceneMetadata = [
  {
    id: "scene01",
    num: "1 / 14",
    title: "System Launch & Live Pilot Architecture",
    action: "Tablet Landscape Launch • No Floor Login Required • MC03 Banner Active",
    rule: "Operator Rule: Tablet is permanently locked in landscape; tap app icon to start."
  },
  {
    id: "scene02",
    num: "2 / 14",
    title: "Shift Setup & Machine MC03 Selection",
    action: "Tap '+ New Shift' • Machine MC03 Locked • Scoped Parts Active",
    rule: "Master Data Rule: Only parts mapped to MC03 (F53200000A, 5036677, 5012394) are displayed."
  },
  {
    id: "scene03",
    num: "3 / 14",
    title: "Operator Identification & Floor Traceability",
    action: "Mandatory Operator Name Entry: 'Ramesh' • Real-time Validation Gate",
    rule: "Traceability Rule: Operator name is mandatory free-text; shift cannot start without it."
  },
  {
    id: "scene04",
    num: "4 / 14",
    title: "Shift Start & Initial Counter Reading",
    action: "Shift A (08:00–16:00) • Sup: Mr. Lokesh • Part: F53200000A • Start Counter: 124,500",
    rule: "Reconciliation Rule: Starting machine counter reading is the benchmark for all calculations."
  },
  {
    id: "scene05",
    num: "5 / 14",
    title: "Hourly Production Entry & Capacity Limit Validation",
    action: "Hour 1 (09:00–10:00) • Gross Output: 180 pcs • Current Counter: 124,680",
    rule: "Physical Validation Rule: Output cannot exceed theoretical max speed (28s cycle time)."
  },
  {
    id: "scene06",
    num: "6 / 14",
    title: "Quality Control & Defect Rejection Entry",
    action: "Defect Code: SHORT_SHOT • Rejections: 5 pcs • Accepted Auto-Computed: 175 pcs",
    rule: "Math Integrity Rule: Accepted = Gross - Rejections; automatic calculation prevents errors."
  },
  {
    id: "scene07",
    num: "7 / 14",
    title: "Machine Downtime & Delay Logging",
    action: "Downtime Reason: MOULD_CHANGE • Duration: 30 Mins • Root Cause Categorization",
    rule: "Accountability Rule: All stoppages must have standardized reason code and supervisor notes."
  },
  {
    id: "scene08",
    num: "8 / 14",
    title: "Mid-Shift Part Change & Multi-Session Tracking",
    action: "Transition to Part 5036677 • Close Session 1 • Initialize Session 2",
    rule: "Tooling Rule: Part Number IS the Tool Number; segregated counters for each part."
  },
  {
    id: "scene09",
    num: "9 / 14",
    title: "Shift Closure & End-of-Shift Counter Reconciliation",
    action: "Final Counter: 125,150 • Counter Variance: 0.00% • Resin Consumed: 87.4 kg",
    rule: "Closing Rule: Physical counter difference must balance sum of hourly outputs."
  },
  {
    id: "scene10",
    num: "10 / 14",
    title: "Supervisor Review & Cryptographic Shift Approval",
    action: "Supervisor: Mr. Lokesh • Status: APPROVED • Immutable Digital Lock",
    rule: "Governance Rule: Only authorized supervisors (Mr. Lokesh / Mr. Akshay) can approve."
  },
  {
    id: "scene11",
    num: "11 / 14",
    title: "Standardized Multi-Tab Excel Export Engine",
    action: "Export XLSX • Tabs: Overview, Hourly, Rejections, Downtime, Materials",
    rule: "Reporting Rule: Standardized Excel workbook generated directly for ERP / plant audit."
  },
  {
    id: "scene12",
    num: "12 / 14",
    title: "Official Signed Production Certification PDF",
    action: "Export PDF • Official Plant Header • Supervisor & Production Manager Signatures",
    rule: "Compliance Rule: Print-ready certified shift certificate saved to device storage."
  },
  {
    id: "scene13",
    num: "13 / 14",
    title: "Automated Daily Production Summary Email Dispatch",
    action: "Background Dispatch • Dual Attachments (XLSX + PDF) • Leadership Distribution",
    rule: "Automation Rule: Dispatched immediately upon approval with zero manual floor steps."
  },
  {
    id: "scene14",
    num: "14 / 14",
    title: "Backup Telemetry, Day Counter & Trial Readiness",
    action: "Day 1 of 21 Live • 5 Rollout Decision Gates (100% Ready) • CLEARED FOR TRIAL",
    rule: "Final Verdict: Version 1.0.0 is FEATURE FROZEN and READY FOR MC03 LIVE TRIAL."
  }
];

async function renderBroadcastFrames() {
  console.log('Launching browser to render broadcast overlays...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (const meta of sceneMetadata) {
    const rawFramePath = path.join(framesDir, `${meta.id}.png`);
    const base64Img = fs.readFileSync(rawFramePath).toString('base64');
    const dataUri = `data:image/png;base64,${base64Img}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { width: 1920px; height: 1080px; overflow: hidden; background: #000; position: relative; }
          .bg-frame { width: 1920px; height: 1080px; object-fit: cover; display: block; }
          
          /* Top Header Bar */
          .top-banner {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 52px;
            background: linear-gradient(90deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%);
            border-bottom: 2px solid #0284c7;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 32px;
            color: #fff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
          }
          .top-left { display: flex; align-items: center; gap: 16px; font-weight: 700; font-size: 17px; }
          .badge-live {
            background: #059669;
            color: #fff;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 4px 10px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; }
          .top-right { display: flex; align-items: center; gap: 24px; font-size: 14px; color: #94a3b8; }
          .top-right span strong { color: #38bdf8; }

          /* Lower Third Broadcast Card */
          .lower-third {
            position: absolute;
            bottom: 28px;
            left: 36px;
            right: 36px;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-left: 6px solid #0ea5e9;
            border-radius: 12px;
            padding: 16px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.7);
            backdrop-filter: blur(12px);
          }
          .lt-info { display: flex; flex-direction: column; gap: 6px; }
          .lt-header { display: flex; align-items: center; gap: 14px; }
          .scene-tag {
            background: #0284c7;
            color: #fff;
            font-weight: 800;
            font-size: 13px;
            padding: 3px 10px;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }
          .scene-title { font-size: 20px; font-weight: 800; color: #f8fafc; letter-spacing: -0.2px; }
          .lt-action { font-size: 14px; color: #cbd5e1; font-weight: 500; }
          .lt-rule { font-size: 12px; color: #38bdf8; font-style: italic; }
          .lt-badges { display: flex; gap: 12px; align-items: center; }
          .meta-pill {
            background: rgba(30, 41, 59, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.25);
            padding: 8px 14px;
            border-radius: 8px;
            text-align: right;
          }
          .meta-pill-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .meta-pill-val { font-size: 14px; font-weight: 700; color: #f1f5f9; }
        </style>
      </head>
      <body>
        <img class="bg-frame" src="${dataUri}" />
        
        <!-- Top Banner -->
        <div class="top-banner">
          <div class="top-left">
            <div style="background: #ffffff; padding: 2px 8px; border-radius: 6px; display: flex; align-items: center; height: 34px;">
              <img src="${logoDataUri}" style="height: 28px; width: auto; display: block;" />
            </div>
            <span class="badge-live"><span class="pulse-dot"></span> MC03 LIVE TRIAL</span>
            <span>Radiance Polymers — Digital Production Reporting System v1.0.0</span>
          </div>
          <div class="top-right">
            <span>Machine: <strong>MC03 (KraussMaffei 250T)</strong></span>
            <span>Supervisor: <strong>Mr. Lokesh</strong></span>
            <span>Operator: <strong>Ramesh</strong></span>
            <span>Part: <strong>F53200000A</strong></span>
          </div>
        </div>

        <!-- Lower Third -->
        <div class="lower-third">
          <div class="lt-info">
            <div class="lt-header">
              <span class="scene-tag">SCENE ${meta.num}</span>
              <span class="scene-title">${meta.title}</span>
            </div>
            <div class="lt-action">${meta.action}</div>
            <div class="lt-rule">💡 ${meta.rule}</div>
          </div>
          <div class="lt-badges">
            <div class="meta-pill">
              <div class="meta-pill-label">Trial Target</div>
              <div class="meta-pill-val" style="color: #34d399;">100% Accuracy</div>
            </div>
            <div class="meta-pill">
              <div class="meta-pill-label">Trial Period</div>
              <div class="meta-pill-val" style="color: #38bdf8;">21 Days (63 Shifts)</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    await new Promise(r => setTimeout(r, 200));
    const broadcastFramePath = path.join(framesDir, `broadcast_${meta.id}.png`);
    await page.screenshot({ path: broadcastFramePath });
    console.log(`Rendered: broadcast_${meta.id}.png`);
  }

  await browser.close();
  console.log('All 14 broadcast frames rendered successfully!');
}

renderBroadcastFrames().catch(console.error);
