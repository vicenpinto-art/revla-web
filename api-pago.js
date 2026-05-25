// ══════════════════════════════════════════════════════
//  REVLA — Servidor de pagos con MercadoPago
// ══════════════════════════════════════════════════════

require('dotenv').config(); // Lee el archivo .env

const express = require('express');
const cors    = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

// ──────────────────────────────────────────────────────
//  Las credenciales vienen del archivo .env
//  NUNCA escribas el token directamente aquí
// ──────────────────────────────────────────────────────
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DOMINIO      = process.env.DOMINIO;

// Verifica que las variables estén cargadas al iniciar
if (!ACCESS_TOKEN || !DOMINIO) {
  console.error('❌ Falta el archivo .env o las variables ACCESS_TOKEN / DOMINIO');
  console.error('   Crea un archivo .env con esas dos variables y reinicia el servidor.');
  process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

// ──────────────────────────────────────────────────────
//  POST /crear-preferencia
//  Recibe el carrito y devuelve la URL de pago de MP
// ──────────────────────────────────────────────────────
app.post('/crear-preferencia', async (req, res) => {
  const { carrito } = req.body;

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

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items,
        back_urls: {
          success: `${DOMINIO}/pago-resultado.html?estado=exitoso`,
          failure: `${DOMINIO}/pago-resultado.html?estado=fallido`,
          pending: `${DOMINIO}/pago-resultado.html?estado=pendiente`,
        },
        auto_return:          'approved',
        statement_descriptor: 'REVLA',
        external_reference:   `revla-${Date.now()}`,
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

// Sirve los archivos HTML estáticos
app.use(express.static('.'));

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`✅ Servidor Revla corriendo en http://localhost:${PUERTO}`);
  console.log(`   Dominio configurado: ${DOMINIO}`);
});
