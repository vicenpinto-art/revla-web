// ══════════════════════════════════════════════════════
//  REVLA — Servidor de pagos con MercadoPago
// ══════════════════════════════════════════════════════

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const { Resend } = require('resend');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

const ACCESS_TOKEN   = process.env.ACCESS_TOKEN;
const DOMINIO        = process.env.DOMINIO;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const VENDEDOR_EMAIL = 'revuela.store@gmail.com';
const FROM_EMAIL     = 'Revla <notificaciones@revla.cl>';

if (!ACCESS_TOKEN || !DOMINIO) {
  console.error('❌ Falta el archivo .env o las variables ACCESS_TOKEN / DOMINIO');
  process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
const resend  = new Resend(RESEND_API_KEY);

// ── Parsear external_reference ──
function parsearRef(ref) {
  const datos = { envio: '', telefono: '', nombre: '', email: '' };
  if (!ref) return datos;
  const partes = ref.split(' | ');
  partes.forEach(p => {
    if (p.startsWith('Tel: '))       datos.telefono = p.replace('Tel: ', '').trim();
    else if (p.startsWith('Nombre: ')) datos.nombre  = p.replace('Nombre: ', '').trim();
    else if (p.startsWith('Email: ')) datos.email   = p.replace('Email: ', '').trim();
    else datos.envio = p.trim();
  });
  return datos;
}

// ── HTML items responsive ──
function itemsHTML(carrito) {
  if (!carrito.length) return `<p style="font-size:14px;color:#6b6570;padding:8px 0">Ver detalles en MercadoPago</p>`;
  return carrito.map(i => {
    const precio = parseInt(String(i.unit_price || 0)) || 0;
    return `
      <div style="padding:12px 0;border-bottom:1px solid #f0e8ff">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1">
            <p style="margin:0;font-size:14px;font-weight:600;color:#1a1718">${i.title}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b6570">${i.description || ''} · x${i.quantity}</p>
          </div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1a1718;white-space:nowrap">$${(precio * i.quantity).toLocaleString('es-CL')}</p>
        </div>
      </div>`;
  }).join('');
}

// ── Correo al vendedor ──
async function enviarCorreoVendedor(pago, carrito) {
  try {
    const ref    = parsearRef(pago.external_reference);
    const nombre = ref.nombre   || pago.payer?.first_name || '';
    const email  = ref.email    || pago.payer?.email      || '';
    const tel    = ref.telefono || 'No indicado';
    const envio  = ref.envio    || '';
    const total  = pago.transaction_amount || 0;

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      VENDEDOR_EMAIL,
      subject: `🛍️ Nueva venta Revla — $${total.toLocaleString('es-CL')}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5efe8;font-family:sans-serif">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">

  <h1 style="font-family:Georgia,serif;font-size:26px;color:#1a1718;margin:0 0 4px">rev<em style="color:#a183ff">la</em></h1>
  <p style="color:#6b6570;margin:0 0 20px;font-size:14px">Nueva venta recibida</p>

  <div style="background:white;border-radius:16px;padding:20px;margin-bottom:12px">
    <h2 style="font-size:15px;font-weight:700;margin:0 0 12px;color:#1a1718">Detalle del pedido</h2>
    ${itemsHTML(carrito)}
    <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:4px">
      <span style="font-size:15px;font-weight:700;color:#1a1718">Total</span>
      <span style="font-size:15px;font-weight:700;color:#a183ff">$${total.toLocaleString('es-CL')}</span>
    </div>
  </div>

  <div style="background:white;border-radius:16px;padding:20px;margin-bottom:12px">
    <h2 style="font-size:15px;font-weight:700;margin:0 0 12px;color:#1a1718">Datos del comprador</h2>
    <p style="margin:4px 0;font-size:14px;color:#6b6570"><strong style="color:#1a1718">Nombre:</strong> ${nombre}</p>
    <p style="margin:4px 0;font-size:14px;color:#6b6570"><strong style="color:#1a1718">Email:</strong> ${email}</p>
    <p style="margin:4px 0;font-size:14px;color:#6b6570"><strong style="color:#1a1718">Teléfono:</strong> ${tel}</p>
  </div>

  <div style="background:white;border-radius:16px;padding:20px;margin-bottom:12px">
    <h2 style="font-size:15px;font-weight:700;margin:0 0 8px;color:#1a1718">Envío</h2>
    <p style="margin:0;font-size:14px;color:#6b6570">${envio}</p>
  </div>

  <p style="font-size:11px;color:#b0a8b5;text-align:center;margin-top:16px">ID de pago: ${pago.id} · ${new Date().toLocaleString('es-CL')}</p>
</div>
</body></html>`
    });
    console.log('✅ Correo vendedor enviado');
  } catch (err) {
    console.error('❌ Error correo vendedor:', err.message);
  }
}

// ── Correo al comprador ──
async function enviarCorreoComprador(pago, carrito) {
  try {
    const ref    = parsearRef(pago.external_reference);
    const nombre = ref.nombre?.split(' ')[0] || pago.payer?.first_name || '';
    const email  = ref.email  || pago.payer?.email || '';
    const envio  = ref.envio  || '';
    const total  = pago.transaction_amount || 0;

    if (!email) {
      console.log('⚠️ Sin email del comprador, omitiendo correo');
      return;
    }

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      email,
      subject: `¡Tu pedido Revla fue confirmado! 🛍️`,
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5efe8;font-family:sans-serif">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">

  <h1 style="font-family:Georgia,serif;font-size:26px;color:#1a1718;margin:0 0 4px">rev<em style="color:#a183ff">la</em></h1>
  <p style="color:#6b6570;margin:0 0 4px;font-size:14px">Hola ${nombre},</p>
  <p style="color:#6b6570;margin:0 0 20px;font-size:14px">Tu pedido fue confirmado. Acá está el resumen:</p>

  <div style="background:white;border-radius:16px;padding:20px;margin-bottom:12px">
    <h2 style="font-size:15px;font-weight:700;margin:0 0 12px;color:#1a1718">Tu pedido</h2>
    ${itemsHTML(carrito)}
    <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:4px">
      <span style="font-size:15px;font-weight:700;color:#1a1718">Total pagado</span>
      <span style="font-size:15px;font-weight:700;color:#a183ff">$${total.toLocaleString('es-CL')}</span>
    </div>
  </div>

  <div style="background:white;border-radius:16px;padding:20px;margin-bottom:12px">
    <h2 style="font-size:15px;font-weight:700;margin:0 0 8px;color:#1a1718">Envío</h2>
    <p style="margin:0;font-size:14px;color:#6b6570">${envio}</p>
  </div>

  <div style="background:#f2eeff;border-radius:16px;padding:16px;margin-bottom:12px;text-align:center">
    <p style="margin:0;font-size:14px;color:#6b6570">¿Tienes dudas? Escríbenos a <a href="mailto:${VENDEDOR_EMAIL}" style="color:#a183ff">${VENDEDOR_EMAIL}</a></p>
  </div>

  <p style="font-size:11px;color:#b0a8b5;text-align:center;margin-top:16px">ID de pago: ${pago.id}</p>
</div>
</body></html>`
    });
    console.log('✅ Correo comprador enviado a', email);
  } catch (err) {
    console.error('❌ Error correo comprador:', err.message);
  }
}

// ── POST /crear-preferencia ──
app.post('/crear-preferencia', async (req, res) => {
  const { carrito, comprador } = req.body;

  if (!carrito || carrito.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  const items = carrito.map(item => {
    const precioLimpio = parseInt(String(item.precio).replace(/\D/g, '')) || 0;
    return {
      id:          item.nombre,
      title:       item.nombre,
      description: `Talla: ${item.talla}${item.color ? ' · ' + item.color : ''}`,
      quantity:    Number(item.cantidad) || 1,
      unit_price:  precioLimpio,
      currency_id: 'CLP',
    };
  });

  if (comprador && comprador.costoEnvio > 0) {
    items.push({
      id:          'envio',
      title:       'Envío a domicilio (Bluexpress)',
      description: `${comprador.direccion}${comprador.torre ? ', Torre ' + comprador.torre : ''}${comprador.depto ? ', Depto ' + comprador.depto : ''}, ${comprador.ciudad}, ${comprador.region}`,
      quantity:    1,
      unit_price:  comprador.costoEnvio,
      currency_id: 'CLP',
    });
  }

  const tipoEnvioRef = comprador?.tipoEnvio === 'retiro'
    ? 'Retiro en Espacio Vuela'
    : `Despacho: ${comprador?.direccion}${comprador?.torre ? ', Torre ' + comprador.torre : ''}${comprador?.depto ? ', Depto ' + comprador.depto : ''}, ${comprador?.ciudad}, ${comprador?.region}`;

  const ref = `${tipoEnvioRef} | Tel: ${comprador?.telefono || 'no indicado'} | Nombre: ${comprador?.nombre} ${comprador?.apellido} | Email: ${comprador?.email}`;

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items,
        payer: comprador ? {
          name:    comprador.nombre,
          surname: comprador.apellido,
          email:   comprador.email,
          phone:   comprador.telefono ? { number: comprador.telefono } : undefined,
        } : undefined,
        back_urls: {
          success: `${DOMINIO}/pago-resultado.html?estado=exitoso`,
          failure: `${DOMINIO}/pago-resultado.html?estado=fallido`,
          pending: `${DOMINIO}/pago-resultado.html?estado=pendiente`,
        },
        auto_return:          'approved',
        statement_descriptor: 'REVLA',
        external_reference:   ref,
        notification_url:     `${DOMINIO}/webhook`,
      },
    });

    res.json({
      init_point:         result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });

  } catch (err) {
    console.error('Error MercadoPago:', err);
    res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
});

// ── POST /webhook ──
const pagosYaProcesados = new Set();

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    if (pagosYaProcesados.has(data.id)) {
      console.log('⚠️ Pago ya procesado, ignorando:', data.id);
      return;
    }
    pagosYaProcesados.add(data.id);
    setTimeout(() => pagosYaProcesados.delete(data.id), 24 * 60 * 60 * 1000);

    const paymentApi = new Payment(client);
    const pago = await paymentApi.get({ id: data.id });

    console.log('💳 Pago:', pago.status, '| Ref:', pago.external_reference?.slice(0, 80));

    if (pago.status === 'approved') {
      const carrito = pago.additional_info?.items || [];
      await enviarCorreoVendedor(pago, carrito);
      await enviarCorreoComprador(pago, carrito);
    }
  } catch (err) {
    console.error('Error webhook:', err.message);
  }
});

app.use(express.static('.'));

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`✅ Servidor Revla corriendo en http://localhost:${PUERTO}`);
  console.log(`   Dominio configurado: ${DOMINIO}`);
});
