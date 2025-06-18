const Scrappey = require('scrappey-wrapper');
const fs = require('fs');
const axios = require('axios');

const API_KEY = 'WX2FZ9FpHhqWtgm7CHtBmJsMmjgLUBUOoW9lwG4VUD1CyY597q17qNchJCOv'; 
const scrappey = new Scrappey(API_KEY);

const CODIGOS = ['46896361']; 

const URL = 'https://www.emcali.com.co/web/servicios/duplicados-de-facturas-y-pagos';

async function procesarCodigo(codigo) {
  const session = await scrappey.createSession({
    headless: true,
    proxyCountry: 'Colombia',
    blockResources: true,
  });

  try {
    console.log(`Procesando código: ${codigo}`);

    await scrappey.get({
      session: session.session,
      url: URL,
      browserActions: [
        {
          type: 'input',
          cssSelector: '#_duplicadofacturas_INSTANCE_uwsn_numcontrato',
          value: codigo,
        },
        {
          type: 'click',
          cssSelector: 'button.btn.btn-block',
        },
    
        {
          type: 'wait',
          time: 8000,
        },
        {
          type: 'html',
        },
      ],
    }).then(async (res) => {
      const html = res.html || '';

      const matches = html.match(/href="([^"]+\.pdf)"/i);
      if (!matches) {
        console.log(' No se encontró un PDF para el código', codigo);
        return;
      }

      let pdfUrl = matches[1];
      if (!pdfUrl.startsWith('http')) {
        pdfUrl = 'https://www.emcali.com.co' + pdfUrl;
      }

      console.log(' Descargando PDF desde:', pdfUrl);

      // Descargar el PDF
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(`factura_${codigo}.pdf`, response.data);

      console.log(` PDF guardado como factura_${codigo}.pdf`);
    });
  } catch (err) {
    console.error(` Error procesando código ${codigo}:`, err.message);
  } finally {
    await scrappey.destroySession(session.session);
  }
}

async function main() {
  for (const codigo of CODIGOS) {
    await procesarCodigo(codigo);
  }
}

main().catch(console.error);
