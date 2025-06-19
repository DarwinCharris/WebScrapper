const puppeteer = require('puppeteer-extra');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const fs = require('fs');
const path = require('path');

//TOKEN (no funciona)
const PUBLIC_2CAPTCHA_KEY = '6fef2c73a3fe89c12946df5a46508f22';

puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: PUBLIC_2CAPTCHA_KEY
    },
    visualFeedback: true
  })
);

const listaCodigos = ['46896361'];

async function descargarFactura(codigo) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const downloadPath = path.resolve(__dirname, 'facturas');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath
  });

  console.log(`🟡 Procesando contrato: ${codigo}`);

  await page.goto('https://www.emcali.com.co/web/servicios/duplicados-de-facturas-y-pagos', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await page.type('#_duplicadofacturas_INSTANCE_uwsn_numcontrato', codigo);

  const { solved, error } = await page.solveRecaptchas();
  if (error || !solved.length) {
    console.error('No se pudo resolver el CAPTCHA automáticamente');
    await browser.close();
    return;
  }

  console.log('CAPTCHA resuelto');

  await page.click('button.btn-block');

  const descargaCompletada = new Promise(resolve => {
    fs.watch(downloadPath, (eventType, filename) => {
      if (eventType === 'rename' && filename.endsWith('.pdf')) {
        resolve(filename);
      }
    });
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Tiempo agotado esperando descarga')), 120000)
  );

  try {
    const filename = await Promise.race([descargaCompletada, timeout]);
    const oldPath = path.join(downloadPath, filename);
    const newPath = path.join(downloadPath, `factura_${codigo}.pdf`);
    fs.renameSync(oldPath, newPath);
    console.log(`Factura ${codigo} guardada como ${newPath}`);
  } catch (err) {
    console.error(`Error con código ${codigo}: ${err.message}`);
  }

  await browser.close();
}

(async () => {
  for (const codigo of listaCodigos) {
    await descargarFactura(codigo);
  }
  console.log('___');
})();
