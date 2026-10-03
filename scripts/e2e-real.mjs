// Real end-to-end smoke (no mock): login → new patient → new consultation → asistente.
// Usage: E2E_USER=... E2E_PASS=... node scripts/e2e-real.mjs   (frontend on :5173, backend on :8000)
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:5173";
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`✓ ${name}`); }
  catch (e) { results.push(`✗ ${name}: ${String(e.message).split("\n")[0]}`); throw e; }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const apiErrors = [];
page.on("response", (r) => { if (r.url().includes("/api/v1/") && r.status() >= 400) apiErrors.push(`${r.status()} ${r.request().method()} ${r.url().split("/api/v1")[1]}`); });
const stamp = Date.now().toString().slice(-6);

try {
  await step("login", async () => {
    await page.goto(BASE + "/");
    await page.getByLabel(/correo|usuario|email/i).first().fill(process.env.E2E_USER);
    await page.getByLabel(/contraseña/i).first().fill(process.env.E2E_PASS);
    await page.getByRole("button", { name: /iniciar|entrar|ingresar/i }).first().click();
    await page.getByText(/alertas/i).first().waitFor({ timeout: 20000 });
  });
  await page.screenshot({ path: ".ui-shots/e2e-1-home.png" });

  await step("nuevo paciente", async () => {
    await page.goto(BASE + "/patients");
    await page.getByRole("button", { name: /nuevo paciente/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/nombre/i).first().fill("Paciente Prueba");
    await dialog.getByLabel(/apellidos/i).first().fill(`E2E ${stamp}`);
    await dialog.getByLabel(/documento/i).first().fill(`E2E-${stamp}`);
    await dialog.getByLabel(/nacimiento/i).first().fill("1950-05-20");
    const sex = dialog.getByLabel(/sexo/i).first();
    if (await sex.evaluate((el) => el.tagName === "SELECT")) await sex.selectOption({ index: 1 });
    else await dialog.getByRole("radio").first().check().catch(() => dialog.getByText(/femenino/i).first().click());
    await page.screenshot({ path: ".ui-shots/e2e-2-new-patient.png" });
    await dialog.getByRole("button", { name: /guardar|crear/i }).last().click();
    await page.getByText(`Paciente Prueba E2E ${stamp}`).first().waitFor({ timeout: 15000 });
  });

  await step("nueva consulta", async () => {
    await page.getByRole("button", { name: /nueva consulta|iniciar consulta/i }).first().click();
    await page.getByText(/nota de la consulta/i).first().waitFor({ timeout: 15000 });
    await page.getByLabel(/motivo/i).first().fill("Control de dolor (prueba E2E)");
    await page.getByText(/guardado/i).first().waitFor({ timeout: 15000 });
    await page.screenshot({ path: ".ui-shots/e2e-3-consultation.png" });
  });

  await step("CIE-10", async () => {
    const search = page.getByPlaceholder(/CIE-10/i).first();
    await search.click();
    await search.pressSequentially("dolor cron", { delay: 40 });
    await page.waitForTimeout(1200);
    const opt = page.getByRole("option").first();
    await opt.waitFor({ timeout: 15000 });
    const code = ((await opt.innerText()).match(/[A-Z]\d{2}(\.\d+)?/) || [""])[0];
    await opt.click();
    await page.getByText(/sin diagn[oó]sticos codificados/i).first().waitFor({ state: "detached", timeout: 15000 });
    results.push(`  código agregado: ${code}`);
  });

  await step("asistente responde", async () => {
    await page.keyboard.press("Control+k");
    const box = page.getByRole("textbox", { name: /mensaje|pregunta|asistente/i }).last();
    await box.waitFor({ timeout: 10000 });
    await box.fill("¿Cuántos pacientes activos tengo?");
    await box.press("Enter");
    await page.getByText(/pensando/i).first().waitFor({ state: "detached", timeout: 120000 });
    await page.waitForTimeout(800);
    const answer = await page.getByRole("log").last().innerText().catch(() => page.locator("[aria-live]").last().innerText());
    if (!/\d/.test(answer)) throw new Error("respuesta sin datos: " + answer.slice(0, 120));
    results.push("  respuesta: " + answer.replace(/\s+/g, " ").slice(-260));
    await page.screenshot({ path: ".ui-shots/e2e-4-assistant.png" });
  });
} catch {
  await page.screenshot({ path: ".ui-shots/e2e-failure.png" });
} finally {
  console.log(results.join("\n"));
  console.log(apiErrors.length ? "API errors:\n  " + [...new Set(apiErrors)].join("\n  ") : "API errors: none");
  await browser.close();
}
