/** Follow the same My menu entry in both the mobile and desktop Ggulggul shell. */
export async function openFreeSajuForm(page, origin) {
  if (origin) await page.goto(origin + '/ggulggul/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.cdOneStepFreeSajuEntry === 'function');
  await page.locator('[data-nav-key="my"]').click();
  const mySheet = page.getByRole('dialog', { name: '마이' });
  await mySheet.getByText('기본 운세와 이용 안내', { exact: true }).click();
  await mySheet.getByRole('link', { name: '무료로 내 만세력 보기', exact: true }).click();
}
