import { expect, test, type Page } from "@playwright/test"

/* The settings' GitHub tab: the button that creates a GitHub App from a
 * manifest, and what the page shows once one is connected. GitHub itself is
 * never reached: the form the page posts there is caught on its way out, and
 * the list of apps — which needs a real app — is answered by the page's route.
 */

const GITHUB = "/?view=console/settings/read/config/github-app"

async function open(page: Page, path = GITHUB) {
  await page.context().addCookies([{ name: "ponos_token", value: "e2e", url: test.info().project.use.baseURL }])
  await page.goto(path)
}

test.use({ viewport: { width: 1440, height: 900 } })

test("not connected, the button posts a manifest to GitHub for the organisation given", async ({ page }) => {
  let posted = ""
  let target = ""
  await page.route("https://github.com/**", async (route) => {
    target = route.request().url()
    posted = route.request().postData() ?? ""
    await route.fulfill({ status: 200, contentType: "text/html", body: "<p>GitHub</p>" })
  })
  await open(page)
  await expect(page.getByTestId("github-state")).toHaveAttribute("data-state", "none")
  await page.getByLabel("Organisation (optional)").fill("Hermez")
  await page.getByRole("button", { name: "Connect GitHub", exact: true }).click()
  await expect.poll(() => target).toContain("https://github.com/organizations/Hermez/settings/apps/new?state=")
  const manifest = JSON.parse(new URLSearchParams(posted).get("manifest") ?? "{}")
  expect(manifest.redirect_url).toMatch(/\/api\/github\/manifest\/callback$/)
  expect(manifest.public).toBe(false)
  expect(manifest.default_permissions.pull_requests).toBe("write")
})

test("connected, it says as whom, on which account, and what it reaches", async ({ page }) => {
  await page.route("**/api/github", (route) =>
    route.fulfill({
      json: {
        apps: [
          {
            slug: "ponos-laptop",
            name: "Ponos — laptop",
            owner: "hermez",
            url: "https://github.com/apps/ponos-laptop",
            settings_url: "https://github.com/settings/apps/ponos-laptop",
            install_url: "https://github.com/apps/ponos-laptop/installations/new",
            installations: [
              { id: 7, account: "hermez", selection: "selected", repositories: ["hermez/site"], error: "" },
            ],
            error: "",
          },
        ],
      },
    })
  )
  await open(page, `${GITHUB}&github=install`)
  await expect(page.getByTestId("github-arrived")).toHaveText("GitHub connected")
  const card = page.locator('[data-card="github-app"]')
  await expect(card).toContainText("ponos-laptop[bot]")
  await expect(card.getByTestId("github-repositories")).toHaveText("hermez/site")
  await expect(card.getByRole("link", { name: "Add repositories" })).toHaveAttribute(
    "href",
    "https://github.com/apps/ponos-laptop/installations/new"
  )
  await expect(page.getByRole("button", { name: "Connect another account" })).toBeVisible()
})
