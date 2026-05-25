// ══════════════════════════════════════════════════════
//  REVLA — Servidor de pagos con MercadoPago
// ══════════════════════════════════════════════════════

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DOMINIO      = process.env.DOMINIO;
const GMAIL_USER   = process.env.GMAIL_USER;
const GMAIL_PASS   = process.env.GMAIL_PASS;

if (!ACCESS_TOKEN || !DOMINIO) {
  console.error('❌ Falta el archivo .env o las variables ACCESS_TOKEN / DOMINIO');
  process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

// ── Transporter de correo ──
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// ── Enviar correo de notificación ──
async function enviarCorreoVenta(pago) {
  try {
    const items = pago.additional_info?.items || [];
    const payer = pago.additional_info?.payer || {};
    const ref   = pago.external_reference || '';

    const itemsHTML = items.map(i =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff">${i.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:center">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:right">$${Number(i.unit_price).toLocaleString('es-CL')}</td>
      </tr>`
    ).join('');

    const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    await transporter.sendMail({
      from: `"Revla" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      subject: `🛍️ Nueva venta Revla — $${total.toLocaleString('es-CL')}`,
      html: `
        <div style="font-family:'Outfit',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f5efe8">
          <h1 style="font-family:Georgia,serif;font-size:28px;color:#1a1718;margin-bottom:4px">rev<em style="color:#a183ff">la</em></h1>
          <p style="color:#6b6570;margin-bottom:24px">Nueva venta recibida</p>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;color:#1a1718">Detalle del pedido</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f2eeff">
                  <th style="padding:8px 12px;text-align:left;color:#6b6570;font-weight:600">Producto</th>
                  <th style="padding:8px 12px;text-align:center;color:#6b6570;font-weight:600">Cant.</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b6570;font-weight:600">Precio</th>
                </tr>
              </thead>
              <tbody>${itemsHTML}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:12px;font-weight:700;font-size:16px">Total</td>
                  <td style="padding:12px;font-weight:700;font-size:16px;text-align:right;color:#a183ff">$${total.toLocaleString('es-CL')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1a1718">Datos del comprador</h2>
            <p style="font-size:14px;color:#6b6570;margin:4px 0"><strong style="color:#1a1718">Nombre:</strong> ${payer.first_name || ''} ${payer.last_name || ''}</p>
            <p style="font-size:14px;color:#6b6570;margin:4px 0"><strong style="color:#1a1718">Email:</strong> ${pago.payer?.email || ''}</p>
            <p style="font-size:14px;color:#6b6570;margin:4px 0"><strong style="color:#1a1718">Teléfono:</strong> ${payer.phone?.number || 'No indicado'}</p>
          </div>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1a1718">Envío</h2>
            <p style="font-size:14px;color:#6b6570">${ref.split('|').slice(2).join('|').trim() || 'Ver referencia'}</p>
          </div>

          <p style="font-size:12px;color:#b0a8b5;text-align:center;margin-top:24px">ID de pago: ${pago.id} · ${new Date().toLocaleString('es-CL')}</p>
        </div>
      `
    });
    console.log('✅ Correo de venta enviado');
  } catch (err) {
    console.error('❌ Error enviando correo:', err.message);
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
      description: `Talla: ${item.talla} — ${item.categoria}`,
      quantity:    Number(item.cantidad) || 1,
      unit_price:  precioLimpio,
      currency_id: 'CLP',
    };
  });

  if (comprador && comprador.costoEnvio > 0) {
    items.push({
      id:          'envio',
      title:       'Envío a domicilio (Bluexpress)',
      quantity:    1,
      unit_price:  comprador.costoEnvio,
      currency_id: 'CLP',
    });
  }

  const resumenPedido = carrito.map(i => `${i.nombre} T:${i.talla} x${i.cantidad}`).join(', ');
  const infoEnvio = comprador
    ? (comprador.tipoEnvio === 'retiro'
        ? 'Retiro en Espacio Vuela'
        : `Despacho a: ${comprador.direccion}, ${comprador.ciudad}, ${comprador.region}`)
    : '';

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
        external_reference:   `revla-${Date.now()} | ${resumenPedido} | ${infoEnvio}`,
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

// ── POST /webhook — MercadoPago notifica pagos ──
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const paymentApi = new Payment(client);
    const pago = await paymentApi.get({ id: data.id });

    if (pago.status === 'approved') {
      await enviarCorreoVenta(pago);
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
