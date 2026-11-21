export default async function handler(req, res) {
  // Libera o bloqueio de segurança (CORS) do navegador
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { clientId, clientSecret, nome, descricao, preco } = req.body;

  try {
    // Autenticação exigida pela Cakto
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Envia o produto pra Cakto
    const caktoRes = await fetch('https://api.cakto.com.br/api/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: nome, description: descricao, price: preco, type: "digital" })
    });

    const data = await caktoRes.json();

    if (!caktoRes.ok) return res.status(caktoRes.status).json({ error: data.message || 'Erro na Cakto' });
    
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    return res.status(500).json({ error: 'Erro na ponte', detalhe: error.message });
  }
}
