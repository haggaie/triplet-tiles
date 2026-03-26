const { test, expect } = require('@playwright/test');

test.describe('Sound effects', () => {
  test('SFX decode after gesture and Web Audio context usable (regression for BufferSource.start timing)', async ({
    page
  }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');

    const before = await page.evaluate(() => window.__tripletTestHooks.getAudioDiagnostics());
    expect(before.unlocked).toBe(false);

    await page.locator('#app').click({ position: { x: 8, y: 8 } });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const d = window.__tripletTestHooks.getAudioDiagnostics();
            return d?.unlocked === true && d?.sfxBuffersLoaded === true;
          }),
        { timeout: 15_000 }
      )
      .toBe(true);

    const after = await page.evaluate(() => window.__tripletTestHooks.getAudioDiagnostics());
    expect(after.sfxMuted).toBe(false);
    expect(after.sfxVolume).toBeGreaterThan(0);
    expect(after.sfxBusGain).toBeGreaterThan(0);
    expect(after.sfxContextState).toBe('running');

    await page.evaluate(() =>
      window.__tripletTestHooks.playTestSfx('SFX/Gameplay/Match_Clear')
    );
    await expect
      .poll(
        async () =>
          page.evaluate(() => window.__tripletTestHooks.getAudioDiagnostics().musicDuckMult),
        { timeout: 2000 }
      )
      .toBeLessThan(0.99);
  });
});
