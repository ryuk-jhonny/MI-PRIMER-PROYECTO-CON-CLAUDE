import { Browser, expect, Page, test } from '@playwright/test';

// Recorrido completo en los emuladores de Firebase. Cada corrida crea sus propias
// cuentas con correos únicos; el emulador se borra al apagarse.
const run = Date.now().toString(36);
const mail = (who: string) => `${who}.${run}@prueba.test`;
const PASS = 'clave-segura-123';
const STUDENT = 'Quispe Mamani, Lucía';

async function newPage(browser: Browser, mobile = false): Promise<Page> {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
  return ctx.newPage();
}

async function signup(page: Page, email: string) {
  await page.goto('/app#crear');
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(PASS);
  await page.getByRole('button', { name: 'Crear cuenta' }).last().click();
  await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
}

async function joinWith(page: Page, code: string, name: string) {
  await page.getByRole('button', { name: /Unirme con un código/ }).click();
  await page.getByLabel('Código').fill(code);
  await page.getByRole('button', { name: 'Validar código' }).click();
  await expect(page.getByText('Código válido')).toBeVisible();
  await page.locator('#jn').fill(name);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe.configure({ mode: 'serial' });

let studentCode = '';
let familyCode = '';
let docenteCode = '';
let portalUrl = '';
let attendanceStatus = '';

test('página de inicio en computadora y en celular', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Cada persona entra a su propio espacio')).toBeVisible();
  await page.getByRole('tab', { name: 'Secundaria' }).click();
  await expect(page.getByText('Educación para el Trabajo').first()).toBeVisible();
  await noHorizontalScroll(page);

  const phone = await newPage(browser, true);
  await phone.goto('/');
  await expect(phone.getByRole('heading', { level: 1 })).toBeVisible();
  await noHorizontalScroll(phone);
  const menuBtn = phone.getByRole('button', { name: 'Abrir menú' });
  await expect(menuBtn).toBeInViewport({ ratio: 1 });
  await menuBtn.click();
  await expect(phone.getByRole('button', { name: 'Registrar mi colegio' }).first()).toBeVisible();
  await phone.locator('#comunidad').scrollIntoViewIfNeeded();
  await noHorizontalScroll(phone);
  await phone.context().close();
});

test('sin cuenta no se entra al panel', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Ingresa a tu colegio' })).toBeVisible();
  await page.getByLabel('Correo').fill(mail('nadie'));
  await page.getByLabel('Contraseña').fill('equivocada');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrectos/);
});

test('la dirección registra su colegio vacío y matricula a una estudiante', async ({ page }) => {
  await signup(page, mail('director'));
  await page.getByRole('button', { name: /Registrar mi colegio/ }).click();
  await page.getByLabel('Nombre oficial de la institución').fill('I.E. de Prueba');
  await page.getByLabel('Nombre corto').fill('Prueba');
  await page.getByLabel('Tu nombre completo').fill('Rosa Director');
  await page.getByRole('button', { name: 'Crear mi colegio' }).click();

  const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
  await expect(nav.getByRole('button', { name: 'Equipo docente' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Evaluación física' })).toHaveCount(0);

  // El colegio empieza sin ningún dato.
  await nav.getByRole('button', { name: 'Estudiantes' }).click();
  await expect(page.getByText('Aún no hay estudiantes')).toBeVisible();

  await page.getByRole('button', { name: 'Registrar el primero' }).click();
  await page.getByLabel('Apellidos y nombres').fill(STUDENT);
  await page.getByLabel('DNI').fill('12345678');
  await page.getByRole('button', { name: 'Matricular' }).click();
  await expect(page.getByText(STUDENT).first()).toBeVisible();

  portalUrl = (await page.getByRole('link', { name: `Ver portal de ${STUDENT}` }).getAttribute('href')) || '';
  expect(portalUrl).toMatch(/\/c\/[a-f0-9]{16,64}$/);

  await page.getByRole('button', { name: /Códigos de acceso/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Códigos de acceso' });
  const codes = await sheet.locator('.font-mono').allInnerTexts();
  [studentCode, familyCode] = codes.map((c) => c.trim());
  expect(studentCode).toMatch(/^[A-Z0-9]{8,12}$/);
  expect(familyCode).toMatch(/^[A-Z0-9]{8,12}$/);
  await sheet.getByRole('button', { name: 'Cerrar' }).click();

  // Registro manual de ingreso (lo mismo que hace el escáner del carnet).
  await nav.getByRole('button', { name: 'Asistencia QR' }).click();
  await page.getByRole('button', { name: `Registrar ingreso de ${STUDENT}` }).click();
  const status = page.getByLabel(`Estado de ${STUDENT}`);
  await expect(status).toBeVisible();
  attendanceStatus = await status.inputValue();
  expect(['Puntual', 'Tardanza', 'Inasistencia']).toContain(attendanceStatus);

  await nav.getByRole('button', { name: 'Equipo docente' }).click();
  docenteCode = (await page.getByTestId('code-docente').innerText()).trim();
  expect(docenteCode).toMatch(/^[A-Z0-9]{8,12}$/);
});

test('una docente de Matemática se une y califica por competencias', async ({ browser }) => {
  const page = await newPage(browser);
  await signup(page, mail('docente'));
  await joinWith(page, docenteCode, 'Carmen Docente');
  await page.getByRole('button', { name: 'Matemática', exact: true }).click();
  await page.getByRole('button', { name: 'Unirme' }).click();

  const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
  await expect(nav.getByRole('button', { name: 'Mi área CNEB' })).toBeVisible();
  // Una docente no administra el equipo ni la configuración.
  await expect(nav.getByRole('button', { name: 'Equipo docente' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Configuración' })).toHaveCount(0);
  // Sin Educación Física no aparece la evaluación física.
  await expect(nav.getByRole('button', { name: 'Evaluación física' })).toHaveCount(0);

  await nav.getByRole('button', { name: 'Mi área CNEB' }).click();
  await expect(page.getByText(/Resuelve problemas de cantidad/).first()).toBeVisible();

  await nav.getByRole('button', { name: 'Notas y libretas' }).click();
  const selects = page.getByLabel(new RegExp(`^${STUDENT}, competencia`));
  await expect(selects.first()).toBeVisible();
  const n = await selects.count();
  for (let i = 0; i < n; i++) await selects.nth(i).selectOption('A');
  await page.getByRole('button', { name: /^Guardar/ }).first().click();
  await expect(page.getByText(/guardad/i).first()).toBeVisible();
  await page.context().close();
});

async function openCarnet(page: Page) {
  // Lo mismo que pasa al escanear el carnet con la cámara del celular.
  await page.goto(new URL(portalUrl).pathname);
  await page.getByRole('link', { name: /Entrar con mi PIN/ }).click();
  await expect(page.getByRole('heading', { name: 'Ingresa con tu carnet' })).toBeVisible();
}

async function activateCarnet(page: Page, who: 'estudiante' | 'familia', code: string, pin: string) {
  await openCarnet(page);
  if (who === 'familia') await page.getByRole('radio', { name: 'Soy la familia' }).click();
  await page.getByRole('button', { name: 'Activar mi carnet' }).click();
  await page.getByLabel(who === 'estudiante' ? 'Código de estudiante' : 'Código de familia').fill(code);
  await page.getByLabel('Elige un PIN de 6 números').fill(pin);
  await page.getByLabel('Repite el PIN').fill(pin);
  await page.getByRole('button', { name: 'Activar e ingresar' }).click();
  await expect(page.getByText(STUDENT).locator('visible=true').first()).toBeVisible();
}

test('estudiantes y familias no se registran con correo', async ({ browser }) => {
  const page = await newPage(browser);
  await signup(page, mail('familia-correo'));
  await page.getByRole('button', { name: /Unirme con un código/ }).click();
  await page.getByLabel('Código').fill(familyCode);
  await page.getByRole('button', { name: 'Validar código' }).click();
  await expect(page.getByRole('alert')).toContainText(/carnet QR y su PIN/);
  await page.context().close();
});

test('la familia activa el carnet con su código y ve las notas', async ({ browser }) => {
  const page = await newPage(browser, true);
  await activateCarnet(page, 'familia', familyCode, '246810');
  await noHorizontalScroll(page);
  await page.getByRole('navigation', { name: 'Accesos rápidos' }).getByRole('button', { name: 'Notas' }).click();
  await expect(page.getByRole('heading', { name: 'Matemática' })).toBeVisible();
  await expect(page.getByText('A', { exact: true }).first()).toBeVisible();
  await page.context().close();
});

test('el estudiante activa su carnet y vuelve a entrar con el QR y su PIN', async ({ browser }) => {
  const page = await newPage(browser, true);
  await activateCarnet(page, 'estudiante', studentCode, '482913');
  await noHorizontalScroll(page);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await openCarnet(page);
  await page.getByLabel('PIN').fill('111111');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText(/El PIN no es correcto/)).toBeVisible();
  await page.getByLabel('PIN').fill('482913');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText(STUDENT).locator('visible=true').first()).toBeVisible();

  // El carnet ya activado no se vuelve a activar con otro PIN.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await openCarnet(page);
  await page.getByRole('button', { name: 'Activar mi carnet' }).click();
  await page.getByLabel('Código de estudiante').fill(studentCode);
  await page.getByLabel('Elige un PIN de 6 números').fill('000000');
  await page.getByLabel('Repite el PIN').fill('000000');
  await page.getByRole('button', { name: 'Activar e ingresar' }).click();
  await expect(page.getByText(/ya (fue|está) activado/i)).toBeVisible();
  await page.context().close();
});

test('un código usado en otro rol o inventado no sirve', async ({ browser }) => {
  const page = await newPage(browser);
  await signup(page, mail('curioso'));
  await page.getByRole('button', { name: /Unirme con un código/ }).click();
  await page.getByLabel('Código').fill('ZZZZZZZZ');
  await page.getByRole('button', { name: 'Validar código' }).click();
  await expect(page.getByRole('alert')).toContainText(/no es válido/);
  await page.context().close();
});

test('el portal del carnet se abre sin cuenta y no muestra el DNI', async ({ browser }) => {
  const page = await newPage(browser, true);
  await page.goto(new URL(portalUrl).pathname);
  await expect(page.getByRole('heading', { name: STUDENT })).toBeVisible();
  await expect(page.getByText('12345678')).toHaveCount(0);
  await expect(page.getByText(attendanceStatus).first()).toBeVisible();
  await noHorizontalScroll(page);
  await page.context().close();
});

test('el panel de la dirección funciona en celular', async ({ browser }) => {
  const page = await newPage(browser, true);
  await page.goto('/app');
  await page.getByLabel('Correo').fill(mail('director'));
  await page.getByLabel('Contraseña').fill(PASS);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog', { name: 'Menú' });
  await menu.getByRole('button', { name: 'Equipo docente' }).click();
  await expect(page.getByText('Carmen Docente')).toBeVisible();
  await noHorizontalScroll(page);
  await page.context().close();
});
