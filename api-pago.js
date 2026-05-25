// ══════════════════════════════════════════════════════
//  REVLA — Servidor de pagos con MercadoPago
// ══════════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DOMINIO      = process.env.DOMINIO;

if (!ACCESS_TOKEN || !DOMINIO) {
  console.error('❌ Falta el archivo .env o las variables ACCESS_TOKEN / DOMINIO');
  process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

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

  // Agregar costo de envío si corresponde
  if (comprador && comprador.costoEnvio > 0) {
    items.push({
      id:          'envio',
      title:       'Envío a domicilio (Bluexpress)',
      quantity:    1,
      unit_price:  comprador.costoEnvio,
      currency_id: 'CLP',
    });
  }

  // Armar descripción del pedido para el external_reference
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

app.use(express.static('.'));

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`✅ Servidor Revla corriendo en http://localhost:${PUERTO}`);
  console.log(`   Dominio configurado: ${DOMINIO}`);
});
