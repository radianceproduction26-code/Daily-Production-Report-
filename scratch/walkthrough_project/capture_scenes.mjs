import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const framesDir = path.resolve('scratch/walkthrough_project/frames');
if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir, { recursive: true });
}

async function captureAllScenes() {
  console.log('Launching browser at:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // 1. Navigate to app
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('body');
  await new Promise(r => setTimeout(r, 1000));

  // Scene 1: System Launch / Dashboard Home
  console.log('Capturing Scene 1: System Launch');
  await page.screenshot({ path: path.join(framesDir, 'scene01.png') });

  // Scene 2: Click "+ New Shift" to open Shift Setup Modal
  console.log('Capturing Scene 2: Shift Setup Modal');
  const newShiftBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('New Shift') || b.textContent.includes('नया शिफ्ट'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('New shift button clicked:', newShiftBtn);
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(framesDir, 'scene02.png') });

  // Scene 3: Enter Operator Name "Ramesh"
  console.log('Capturing Scene 3: Operator Name');
  await page.evaluate(() => {
    // Find operator input
    const inputs = Array.from(document.querySelectorAll('input'));
    const opInput = inputs.find(i => 
      i.placeholder?.toLowerCase().includes('operator') || 
      i.name?.toLowerCase().includes('operator') ||
      i.id?.toLowerCase().includes('operator')
    );
    if (opInput) {
      opInput.focus();
      opInput.value = 'Ramesh';
      opInput.dispatchEvent(new Event('input', { bubbles: true }));
      opInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(framesDir, 'scene03.png') });

  // Scene 4: Setup parameters and start shift
  console.log('Capturing Scene 4: Shift Start');
  await page.evaluate(() => {
    // Select Supervisor Mr. Lokesh, Part F53200000A, Shift A, Counter 124500
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(s => {
      Array.from(s.options).forEach(opt => {
        if (opt.text.includes('Lokesh')) s.value = opt.value;
        if (opt.text.includes('F53200000A')) s.value = opt.value;
        if (opt.text.includes('Shift A') || opt.text.includes('08:00')) s.value = opt.value;
      });
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const inputs = Array.from(document.querySelectorAll('input'));
    const counterInput = inputs.find(i => 
      i.placeholder?.toLowerCase().includes('counter') || 
      i.name?.toLowerCase().includes('counter') ||
      i.type === 'number'
    );
    if (counterInput && !counterInput.value) {
      counterInput.value = '124500';
      counterInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(framesDir, 'scene04.png') });

  // Close modal or start shift
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const startBtn = btns.find(b => b.textContent.includes('Start Shift') || b.textContent.includes('शुरू'));
    if (startBtn) startBtn.click();
    else {
      // Close modal by clicking cancel or close button
      const closeBtn = btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close') || b.textContent.includes('×'));
      if (closeBtn) closeBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Scene 5: Production Entry Modal
  console.log('Capturing Scene 5: Production Entry');
  await page.evaluate(() => {
    // Look for hour entry or log production button
    const btns = Array.from(document.querySelectorAll('button'));
    const enterBtn = btns.find(b => b.textContent.includes('Enter') || b.textContent.includes('Log') || b.textContent.includes('09:00') || b.textContent.includes('Hour 1'));
    if (enterBtn) enterBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(framesDir, 'scene05.png') });

  // Close hour modal if open
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close') || b.textContent.includes('Save'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Scene 6: Rejections Modal
  console.log('Capturing Scene 6: Rejections Modal');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rejBtn = btns.find(b => b.textContent.includes('Rejection') || b.textContent.includes('खराबी'));
    if (rejBtn) rejBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(framesDir, 'scene06.png') });

  // Close rejection modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close') || b.textContent.includes('×'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Scene 7: Downtime Modal
  console.log('Capturing Scene 7: Downtime Modal');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const dtBtn = btns.find(b => b.textContent.includes('Downtime') || b.textContent.includes('डाउनटाइम'));
    if (dtBtn) dtBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(framesDir, 'scene07.png') });

  // Close downtime modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close') || b.textContent.includes('×'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Scene 8: Part / Mould Change Modal
  console.log('Capturing Scene 8: Part / Mould Change');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const mcBtn = btns.find(b => b.textContent.includes('Mould Change') || b.textContent.includes('Part Change') || b.textContent.includes('मोल्ड बदलें'));
    if (mcBtn) mcBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(framesDir, 'scene08.png') });

  // Close mould change modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close') || b.textContent.includes('×'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Scene 9: Shift Summary / Closure Drawer
  console.log('Capturing Scene 9: Shift Closure');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const summaryBtn = btns.find(b => b.textContent.includes('Summary') || b.textContent.includes('Close Shift') || b.textContent.includes('विवरण'));
    if (summaryBtn) summaryBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(framesDir, 'scene09.png') });

  // Scene 10: Supervisor Review & Approval
  console.log('Capturing Scene 10: Supervisor Approval');
  await page.screenshot({ path: path.join(framesDir, 'scene10.png') });

  // Close drawer
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.textContent.includes('Close') || b.textContent.includes('×'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Scene 11: Switch to Reports Tab (Excel Export)
  console.log('Capturing Scene 11: Reports Tab & Excel Export');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const repBtn = btns.find(b => b.textContent.includes('Reports') || b.textContent.includes('रिपोर्ट्स'));
    if (repBtn) repBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(framesDir, 'scene11.png') });

  // Scene 12: PDF Export Screen
  console.log('Capturing Scene 12: PDF Export');
  await page.screenshot({ path: path.join(framesDir, 'scene12.png') });

  // Scene 13: System Health / Email Dispatch Tab
  console.log('Capturing Scene 13: Email Dispatch & Health');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const healthBtn = btns.find(b => b.textContent.includes('Health') || b.textContent.includes('Audit') || b.textContent.includes('Admin') || b.textContent.includes('Email'));
    if (healthBtn) healthBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(framesDir, 'scene13.png') });

  // Scene 14: Trial Go-Live Dashboard
  console.log('Capturing Scene 14: Trial Go-Live Dashboard');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const trialBtn = btns.find(b => b.textContent.includes('Trial') || b.textContent.includes('Live Pilot') || b.textContent.includes('Dashboard') || b.textContent.includes('MC03'));
    if (trialBtn) trialBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(framesDir, 'scene14.png') });

  await browser.close();
  console.log('All 14 scene screens captured successfully!');
}

captureAllScenes().catch(console.error);
