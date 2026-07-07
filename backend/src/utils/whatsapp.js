async function enviarWhatsApp(telefono, mensaje, credenciales) {
  if (!telefono) return;
  const { metaAccessToken, metaPhoneNumberId } = credenciales;
  if (!metaAccessToken || !metaPhoneNumberId) {
    return { error: 'Credenciales de WhatsApp no configuradas' };
  }

  const numeroCompleto = `51${telefono.replace(/\D/g, '')}`;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${metaPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: numeroCompleto,
        type: 'template',
        template: {
          name: 'aviso_asignacion',
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