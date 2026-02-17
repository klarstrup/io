import {
  devices,
  Locator,
  Page,
  PageScreenshotOptions,
  test,
} from "@playwright/test";

const devicesEntries = [
  ["desktop", { width: 1728, height: 1117 }],
  ["mobile-small", devices["iPhone SE"].viewport],
  ["mobile-large", devices["iPhone 11 Pro Max"].viewport],
  ["tablet", devices["iPad (gen 11)"].viewport],
] as const;
const screenshotOnDevices = async (
  pageOrLocator: Page | Locator,
  pageScreenshotOptions: PageScreenshotOptions,
) => {
  const page = "page" in pageOrLocator ? pageOrLocator.page() : pageOrLocator;
  const locator = "page" in pageOrLocator ? pageOrLocator : null;

  for (const [deviceName, viewport] of devicesEntries) {
    await page.setViewportSize(viewport);
    const box = (await locator?.boundingBox()) || undefined;

    await page.screenshot({
      ...pageScreenshotOptions,
      path: `screenshots/${pageScreenshotOptions.path!.replace(
        /\.png$/,
        "",
      )}-${deviceName}.png`,
      clip: box && {
        x: box.x - 10,
        y: box.y - 10,
        width: box.width + 20,
        height: box.height + 20,
      },
    });
  }
};

test("takes screenshots", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await screenshotOnDevices(page, { path: "front-signed-out" });

  await page.goto(
    "/diary/" +
      (new Date().getFullYear() +
        "-" +
        String(new Date().getMonth() + 1) +
        "-" +
        String(new Date().getDate())),
    { waitUntil: "networkidle" },
  );

  await screenshotOnDevices(page.locator(".fixed > div"), {
    path: "day-signed-out",
  });
});
