const { test, expect } = require('@playwright/test');

test('mock quota panel reset triggers and victory state', async ({ page }) => {
  await page.goto('/index.html?lang=en');

  // Verify initial state
  const resetCodexBtn = page.locator('#pcta-codex');
  await expect(resetCodexBtn).toBeVisible();
  const resetClaudeBtn = page.locator('#pcta-claude');
  await expect(resetClaudeBtn).toBeVisible();
  const resetGeminiBtn = page.locator('#pcta-gemini');
  await expect(resetGeminiBtn).toBeVisible();
  const resetGrokBtn = page.locator('#pcta-grok');
  await expect(resetGrokBtn).toBeVisible();

  // Test victory state trigger
  const relapseBtn = page.locator('#relapseBtn');
  await expect(relapseBtn).toBeHidden();

  // Trigger reset one by one
  await resetCodexBtn.click();
  // We can see the text updates when healed
  await expect(page.locator('#codexResetLine')).toHaveText(/Reset just now/i);

  await resetClaudeBtn.click();
  await resetGeminiBtn.click();
  await resetGrokBtn.click();

  // Test victory state is triggered when all are reset
  await expect(relapseBtn).toBeVisible();
});

test('counter state persistence', async ({ page }) => {
    await page.goto('/index.html?lang=en');

    // Evaluate initial counter state from local storage or mock API call
    let initialCount = await page.evaluate(() => {
      const countsStr = localStorage.getItem('rtCounts');
      if (!countsStr) return 0;
      const counts = JSON.parse(countsStr);
      return counts.codex || 0;
    });

    await page.locator('#pcta-codex').click();

    // Verify localStorage increments
    await page.waitForFunction((initial) => {
        const countsStr = localStorage.getItem('rtCounts');
        if (!countsStr) return false;
        const counts = JSON.parse(countsStr);
        const codexCount = counts.codex || 0;
        return codexCount > initial;
    }, initialCount);

    const count = await page.evaluate(() => {
      const countsStr = localStorage.getItem('rtCounts');
      const counts = JSON.parse(countsStr);
      return counts.codex || 0;
    });
    expect(count).toBeGreaterThan(initialCount);
});

test('animation state transitions', async ({ page }) => {
  await page.goto('/index.html?lang=en');

  const codexCell = page.locator('#dcell-codex');
  // Initially not freed
  await expect(codexCell).not.toHaveClass(/freed/);

  await page.locator('#pcta-codex').click();

  // Wait for the class 'freed' to be applied indicating the animation triggered and finished
  await expect(codexCell).toHaveClass(/freed/);
});
