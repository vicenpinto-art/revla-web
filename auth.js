/* ── auth.js — cliente Supabase compartido ── */
(function () {

  const SUPABASE_URL  = 'https://rwkkfumsuusmglwvsrrq.supabase.co';
  const SUPABASE_KEY  = 'sb_publishable_dY5jJk49qHdepDmzgTI0SA_LxxyqD23';

  // Espera a que el SDK cargue
  function getClient() {
    if (window._supabaseClient) return window._supabaseClient;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      window._supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window._supabaseClient;
    }
    return null;
  }

  /* ── Exponer db globalmente ── */
  Object.defineProperty(window, 'db', {
    get: () => getClient(),
    configurable: true
  });

  /* ── Actualizar nav según sesión ── */
  async function actualizarNavUsuario() {
    const client = getClient();
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    const link = document.querySelector('a[href*="login"]');
    if (!link) return;
    if (session?.user) {
      const nombre = session.user.user_metadata?.nombre || session.user.email.split('@')[0];
      link.textContent = nombre.split(' ')[0]; // solo primer nombre
      link.href = 'cuenta.html';
    } else {
      link.textContent = 'Mi cuenta';
      link.href = 'login.html';
    }
  }

  /* ── Proteger páginas que requieren login ── */
  window.requireAuth = async function (redirectUrl) {
    const client = getClient();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      window.location.href = redirectUrl || 'login.html';
      return null;
    }
    return session.user;
  };

  /* ── Inicializar cuando el DOM esté listo ── */
  document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para que nav.js inyecte el nav primero
    setTimeout(actualizarNavUsuario, 100);
  });

})();
