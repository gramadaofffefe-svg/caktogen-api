export default async function handler(req, res) {
  // 1. Libera o acesso (CORS) para o seu app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { clientId, clientSecret, nome, descricao, preco } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID e Secret são obrigatórios.' });
  }

  try {
    // 2. Transforma ID e Secret em Base64
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // 3. Pede o Token de Acesso (OAuth) para a Cakto
    const tokenRes = await fetch('https://api.cakto.com.br/api/v1/auth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(401).json({ error: 'Falha na autenticação. Verifique as chaves da Cakto.', detalhe: tokenData });
    }

    // 4. Formata o Preço (A Cakto exige em centavos)
    const precoCentavos = Math.round(parseFloat(preco) * 100);

    // 5. Cria o Produto com Checkout Ativado
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
        type: "digital",
        status: "active",
        // Configurações para a página de vendas já nascer pronta:
        checkout: {
          active: true,
          accept_pix: true,
          accept_card: true,
          installments: 12
        }
      })
    });

    const data = await caktoRes.json();

    if (!caktoRes.ok) {
      return res.status(caktoRes.status).json({ error: 'A Cakto recusou a criação.', detalhe: data });
    }

    // 6. Retorna o sucesso E o link final para o seu App
    // A Cakto pode devolver o link em "checkout_url", "url" ou "link". 
    // Esse código tenta pegar todos para garantir que não volte vazio.
    const linkFinal = data.checkout_url || data.url || data.link || `https://app.cakto.com.br/products/${data.id}`;

    return res.status(200).json({ 
      success: true, 
      id: data.id, 
      checkoutUrl: linkFinal 
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno na ponte do Vercel', detalhe: error.message });
  }
}
