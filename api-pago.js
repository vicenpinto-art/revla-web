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
const resend = new Resend(RESEND_API_KEY);

// ── Almacén temporal de pedidos (preference_id → datos) ──
const pedidosTemp = new Map();

// ── Correo al vendedor ──
async function enviarCorreoVendedor(pago, pedido) {
  try {
    const carrito   = pedido?.carrito || [];
    const comprador = pedido?.comprador || {};

    const itemsHTML = carrito.map(i => {
      const precio = parseInt(String(i.precio).replace(/\D/g, '')) || 0;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff">${i.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:center">${i.talla}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:center">${i.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:right">$${(precio * i.cantidad).toLocaleString('es-CL')}</td>
      </tr>`;
    }).join('');

    const subtotal = carrito.reduce((s, i) => s + (parseInt(String(i.precio).replace(/\D/g, '')) || 0) * i.cantidad, 0);
    const total    = subtotal + (comprador.costoEnvio || 0);

    const infoEnvio = comprador.tipoEnvio === 'retiro'
      ? 'Retiro en Espacio Vuela (gratis)'
      : `Despacho Bluexpress a: ${comprador.direccion}, ${comprador.ciudad}, ${comprador.region}`;

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      VENDEDOR_EMAIL,
      subject: `🛍️ Nueva venta Revla — $${total.toLocaleString('es-CL')}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f5efe8">
          <h1 style="font-family:Georgia,serif;font-size:28px;color:#1a1718;margin-bottom:4px">rev<em style="color:#a183ff">la</em></h1>
          <p style="color:#6b6570;margin-bottom:24px">Nueva venta recibida</p>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;color:#1a1718">Detalle del pedido</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f2eeff">
                  <th style="padding:8px 12px;text-align:left;color:#6b6570">Producto</th>
                  <th style="padding:8px 12px;text-align:center;color:#6b6570">Talla</th>
                  <th style="padding:8px 12px;text-align:center;color:#6b6570">Cant.</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b6570">Precio</th>
                </tr>
              </thead>
              <tbody>${itemsHTML}</tbody>
              <tfoot>
                <tr><td colspan="3" style="padding:12px;font-weight:700">Envío</td><td style="padding:12px;text-align:right">${comprador.costoEnvio > 0 ? '$' + comprador.costoEnvio.toLocaleString('es-CL') : 'Gratis'}</td></tr>
                <tr><td colspan="3" style="padding:12px;font-weight:700;font-size:16px">Total</td><td style="padding:12px;font-weight:700;font-size:16px;text-align:right;color:#a183ff">$${total.toLocaleString('es-CL')}</td></tr>
              </tfoot>
            </table>
          </div>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1a1718">Datos del comprador</h2>
            <p style="font-size:14px;color:#6b6570;margin:4px 0"><strong style="color:#1a1718">Nombre:</strong> ${comprador.nombre} ${comprador.apellido}</p>
            <p style="font-size:14px;color:#6b6570;margin:4px 0"><strong style="color:#1a1718">Email:</strong> ${comprador.email}</p>
            <p style="font-size:14px;color:#6b6570;margin:4px 0"><strong style="color:#1a1718">Teléfono:</strong> ${comprador.telefono || 'No indicado'}</p>
          </div>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1a1718">Envío</h2>
            <p style="font-size:14px;color:#6b6570">${infoEnvio}</p>
          </div>

          <p style="font-size:12px;color:#b0a8b5;text-align:center;margin-top:24px">ID de pago: ${pago.id} · ${new Date().toLocaleString('es-CL')}</p>
        </div>
      `
    });
    console.log('✅ Correo vendedor enviado');
  } catch (err) {
    console.error('❌ Error correo vendedor:', err.message);
  }
}

// ── Correo al comprador ──
async function enviarCorreoComprador(pago, pedido) {
  try {
    const carrito   = pedido?.carrito || [];
    const comprador = pedido?.comprador || {};
    if (!comprador.email) return;

    const itemsHTML = carrito.map(i => {
      const precio = parseInt(String(i.precio).replace(/\D/g, '')) || 0;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff">${i.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:center">${i.talla}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:center">${i.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:right">$${(precio * i.cantidad).toLocaleString('es-CL')}</td>
      </tr>`;
    }).join('');

    const subtotal = carrito.reduce((s, i) => s + (parseInt(String(i.precio).replace(/\D/g, '')) || 0) * i.cantidad, 0);
    const total    = subtotal + (comprador.costoEnvio || 0);

    const infoEnvio = comprador.tipoEnvio === 'retiro'
      ? 'Retiro en Espacio Vuela — nos contactaremos para coordinar.'
      : `Despacho Bluexpress a: ${comprador.direccion}, ${comprador.ciudad}, ${comprador.region}`;

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      comprador.email,
      subject: `¡Tu pedido Revla fue confirmado! 🛍️`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f5efe8">
          <h1 style="font-family:Georgia,serif;font-size:28px;color:#1a1718;margin-bottom:4px">rev<em style="color:#a183ff">la</em></h1>
          <p style="color:#6b6570;margin-bottom:8px">Hola ${comprador.nombre},</p>
          <p style="color:#6b6570;margin-bottom:24px">Tu pedido fue confirmado. Acá está el resumen:</p>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;color:#1a1718">Tu pedido</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f2eeff">
                  <th style="padding:8px 12px;text-align:left;color:#6b6570">Producto</th>
                  <th style="padding:8px 12px;text-align:center;color:#6b6570">Talla</th>
                  <th style="padding:8px 12px;text-align:center;color:#6b6570">Cant.</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b6570">Precio</th>
                </tr>
              </thead>
              <tbody>${itemsHTML}</tbody>
              <tfoot>
                <tr><td colspan="3" style="padding:12px;font-weight:700">Envío</td><td style="padding:12px;text-align:right">${comprador.costoEnvio > 0 ? '$' + comprador.costoEnvio.toLocaleString('es-CL') : 'Gratis'}</td></tr>
                <tr><td colspan="3" style="padding:12px;font-weight:700;font-size:16px">Total pagado</td><td style="padding:12px;font-weight:700;font-size:16px;text-align:right;color:#a183ff">$${total.toLocaleString('es-CL')}</td></tr>
              </tfoot>
            </table>
          </div>

          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1a1718">Envío</h2>
            <p style="font-size:14px;color:#6b6570">${infoEnvio}</p>
          </div>

          <div style="background:#f2eeff;border-radius:16px;padding:20px;margin-bottom:16px;text-align:center">
            <p style="font-size:14px;color:#6b6570">¿Tienes dudas? Escríbenos a <a href="mailto:${VENDEDOR_EMAIL}" style="color:#a183ff">${VENDEDOR_EMAIL}</a></p>
          </div>

          <p style="font-size:12px;color:#b0a8b5;text-align:center">ID de pago: ${pago.id}</p>
        </div>
      `
    });
    console.log('✅ Correo comprador enviado a', comprador.email);
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
      description: `Talla: ${item.talla}`,
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
    ? (comprador.tipoEnvio === 'retiro' ? 'Retiro en Espacio Vuela' : `Despacho: ${comprador.direccion}, ${comprador.ciudad}`)
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

    // Guardar datos del pedido temporalmente
    pedidosTemp.set(result.id, { carrito, comprador });
    setTimeout(() => pedidosTemp.delete(result.id), 24 * 60 * 60 * 1000); // limpiar en 24h

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
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const paymentApi = new Payment(client);
    const pago = await paymentApi.get({ id: data.id });

    if (pago.status === 'approved') {
      // Buscar datos del pedido por preference_id
      const pedido = pedidosTemp.get(pago.preference_id) || {};
      await enviarCorreoVendedor(pago, pedido);
      await enviarCorreoComprador(pago, pedido);
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
