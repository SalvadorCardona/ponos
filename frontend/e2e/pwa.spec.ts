import { expect, test } from "@playwright/test"

/* The console, installable.
 *
 * What a browser needs to offer "Install": a manifest it can read, and a worker
 * that controls the page. The install prompt itself is the browser's and cannot
 * be raised from here; `lib/install.test.ts` holds when the button appears.
 */

test.use({ viewport: { width: 1440, height: 900 } })

test("the console links a manifest and a worker takes control of the page", async ({ page, request }) => {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto("/")

  const link = page.locator('link[rel="manifest"]')
  await expect(link).toHaveAttribute("crossorigin", "use-credentials")
  const manifest = await (await request.get(String(await link.getAttribute("href")))).json()
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/" })
  expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose)).toContain("maskable")

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(scope).toBe(`${test.info().project.use.baseURL}/`)
})
