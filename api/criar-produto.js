export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { clientId, clientSecret, nome, descricao, preco } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Credenciais não enviadas' });
  }

  try {
    // 1. Pega o Token de Acesso
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenRes = await fetch('https://api.cakto.com.br/api/v1/auth/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenRes.ok || !tokenData.access_token) {
        return res.status(401).json({ error: 'Falha na autenticação com a Cakto', detalhe: tokenData });
    }

    // Converte o preço para centavos (Ex: 19.90 -> 1990)
    const precoCentavos = Math.round(parseFloat(preco) * 100);

    // 2. Cria o Produto com a Estrutura Completa de Checkout
    const caktoRes = await fetch('https://api.cakto.com.br/api/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        name: nome, 
        description: descricao, 
        price: precoCentavos, 
        type: "digital", // Tipo do produto
        status: "active", // Já cria ativo
        checkout: {
            active: true, // Ativa o link de vendas
            installments: 12, // Permite parcelamento
            accept_pix: true, // Aceita Pix
            accept_card: true // Aceita Cartão
        }
      })
    });

    const data = await caktoRes.json();

    if (!caktoRes.ok) {
        return res.status(caktoRes.status).json({ error: 'Erro na API da Cakto', detalhe: data });
    }

    // Retorna o link do checkout (se a Cakto gerar na hora) ou o ID
    return res.status(200).json({ success: true, id: data.id, checkoutUrl: data.checkout_url });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno na ponte', detalhe: error.message });
  }
}
