async function enviarWhatsApp(telefono, mensaje) {
  if (!telefono) return; // si no tiene número, no intenta nada

  const numeroCompleto = `51${telefono.replace(/\D/g, '')}`; // limpia y agrega código país

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: numeroCompleto,
        type: 'template',
        template: {
          name: 'aviso_asignacion', // el nombre exacto de tu plantilla aprobada en Meta
          language: { code: 'es' },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: mensaje }]
          }]
        }
      })
    }
  );

  const data = await res.json();
  if (!res.ok) console.error('Error enviando WhatsApp:', data);
  return data;
}

module.exports = { enviarWhatsApp };