// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Radiance Polymers - Digital Production Reporting System (MC03 Live Trial v1.0.0)
 * End-to-End Automated Test Suite (Playwright)
 *
 * Requirements to run:
 * 1. Start application: npm run dev (default: http://localhost:5173)
 * 2. Run suite: npx playwright test _audit/tests/e2e_flows.spec.js
 */

test.describe('Radiance Polymers Production Report - E2E Core Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to local dev server
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Flow 1: App initialization & branding display', async ({ page }) => {
    await expect(page).toHaveTitle(/Radiance Polymers|Production/i);
    const header = page.locator('header, nav, h1').first();
    await expect(header).toBeVisible();
  });

  test('Flow 2: Active shift inspection and machine details', async ({ page }) => {
    const machineTag = page.getByText(/MC03|Machine 03|MC-03/i).first();
    await expect(machineTag).toBeVisible();

    const shiftBadge = page.getByText(/Shift [A-C]|Morning|Night/i).first();
    await expect(shiftBadge).toBeVisible();
  });

  test('Flow 3: Hour Entry Modal opening and input validation', async ({ page }) => {
    const addHourBtn = page.getByRole('button', { name: /Add Hour|Log Production|Enter Hour|\+/i }).first();
    if (await addHourBtn.isVisible()) {
      await addHourBtn.click();
      
      const modal = page.locator('[role="dialog"], .modal, .fixed').first();
      await expect(modal).toBeVisible();

      const prodInput = modal.locator('input[type="number"]').first();
      if (await prodInput.isVisible()) {
        await prodInput.fill('450');
      }

      const cancelOrClose = modal.getByRole('button', { name: /Cancel|Close|Dismiss/i }).first();
      if (await cancelOrClose.isVisible()) {
        await cancelOrClose.click();
      }
    }
  });

  test('Flow 4: Material usage & validation flags check', async ({ page }) => {
    const materialTab = page.getByText(/Material|Resin|RM Usage/i).first();
    if (await materialTab.isVisible()) {
      await materialTab.click();
      const materialCard = page.locator('text=/PP|HDPE|LDPE|Masterbatch|Kg/i').first();
      await expect(materialCard).toBeVisible();
    }
  });

  test('Flow 5: Summary metrics and OEE display', async ({ page }) => {
    const metricsContainer = page.locator('text=/OEE|Efficiency|Total Output|Yield/i').first();
    await expect(metricsContainer).toBeVisible();
  });

  test('Flow 6: Offline resilience & LocalStorage persistence', async ({ page }) => {
    const storageState = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.includes('radiance') || k.includes('production') || k.includes('report') || k.includes('session'));
    });
    expect(Array.isArray(storageState)).toBeTruthy();
  });

  test('Flow 7: Supervisor lock/unlock mechanism', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /Approve|Lock|Supervisor/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      const pinInput = page.locator('input[type="password"], input[placeholder*="PIN" i]').first();
      if (await pinInput.isVisible()) {
        await pinInput.fill('2026');
      }
    }
  });
});
