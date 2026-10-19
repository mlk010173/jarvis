/**
 * ORION - Backend Simulado e Aprimoramentos Visuais (GitHub Pages Edition)
 * Intercepta chamadas de API para dar "vida" ao site estático e injeta animações fluidas.
 */
(function() {
  console.log("🌌 ORION Pages Engine ativado. Backend simulado e animações carregadas.");

  // --- 1. Aprimoramentos de UI (Injeção de Animações e Plugins visuais) ---
  const style = document.createElement('style');
  style.innerHTML = `
    /* Movimento e Transições */
    body { transition: background-color 0.5s ease; }
    .btn, button, .pn-caixa, a, input, select { 
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important; 
    }
    .btn:hover, button:hover:not(:disabled) { 
      transform: translateY(-3px) scale(1.02); 
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.3) !important; 
      filter: brightness(1.2); 
    }
    .pn-caixa:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 15px rgba(0, 255, 255, 0.1) !important;
      border-color: rgba(0, 212, 255, 0.4) !important;
    }
    
    /* Animação Flutuante (Logo, Orb, Ícones) */
    @keyframes orion-float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
      100% { transform: translateY(0px); }
    }
    .lat-logo svg, .pn-icone, .orb-container, #orb {
      animation: orion-float 4s ease-in-out infinite;
    }

    /* Efeito Glassmorphism em modais e painéis */
    .pn-caixa, .modal-conteudo, .lat {
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      background-color: rgba(17, 25, 40, 0.75) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    /* Fundo dinâmico simulado na tela de login */
    body.entrar-bg {
      background: radial-gradient(circle at center, #0d1b2a 0%, #000000 100%) !important;
    }
    body.entrar-bg::before {
      content: ''; position: absolute; top:0; left:0; width:100%; height:100%;
      background: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.05"/></svg>');
      pointer-events: none; z-index: -1;
    }
  `;
  document.head.appendChild(style);
  if (window.location.pathname.includes('entrar')) document.body.classList.add('entrar-bg');

  // --- 2. Backend Simulado (Interceptação de Fetch) ---
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    const u = String(url);
    
    // Intercepta apenas o que vai pra /api/
    if (u.includes('/api/')) {
      console.info('📡 [Mock API] Interceptado:', u);
      
      // Simula latência de rede realista (200-500ms)
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      
      const mockStorage = 'orion_gh_pages_sessao';
      const isLogado = () => !!localStorage.getItem(mockStorage);
      const res = (obj, status=200) => new Response(JSON.stringify(obj), {status, headers: {'Content-Type': 'application/json'}});

      // --- Rotas de Autenticação ---
      if (u.includes('/api/conta/entrar') || u.includes('/api/conta/cadastro')) {
        localStorage.setItem(mockStorage, 'token_simulado_gh_pages');
        return res({ ok: true });
      }
      if (u.includes('/api/conta/sair')) {
        localStorage.removeItem(mockStorage);
        return res({ ok: true });
      }
      if (u.includes('/api/conta/sessao')) {
        return res({ logado: isLogado() });
      }
      if (u.includes('/api/conta/eu')) {
        if (!isLogado()) return res({ erro: "Faça login" }, 401);
        return res({ usuario: { id: "dev_github", nome: "Explorador (Mock)", email: "explorador@github.io", plano: "pro" }});
      }
      
      // --- Rotas de Planos e Assinaturas ---
      if (u.includes('/api/conta/assinatura') || u.includes('/api/conta/plano')) {
        if (!isLogado()) return res({ erro: "Faça login" }, 401);
        return res({ plano: { id: "pro", nome: "Pro (GitHub Edition)", pago: true }, expira_em: "2099-12-31T00:00:00.000Z", limites: { modulos: 99 }});
      }
      if (u.includes('/api/comercial/planos')) {
        return res({ planos: [
          { id: "free", nome: "Free", preco_centavos: 0, publico: "Testes" },
          { id: "pro", nome: "Pro (GitHub)", preco_centavos: 0, publico: "Demonstração viva do frontend" }
        ]});
      }

      // --- Rotas de Projetos/IA ---
      if (u.includes('/api/projetos')) {
        if (!isLogado()) return res({ erro: "Faça login" }, 401);
        // GET retorna uma lista falsa, POST retorna a criação, DELETE finge que apagou
        if (options && options.method === 'POST') {
          return res({ id: "prj_mock_" + Date.now(), nome: "Novo Assistente Mock", assistente: "ORION" }, 201);
        }
        return res([
          { id: "prj_mock_1", nome: "Assistente de Demonstração", assistente: "ORION", instrucoes: "Rodando 100% no cliente via pages-shim.js", criado_em: new Date().toISOString() }
        ]);
      }
      if (u.includes('/api/conta/ias')) {
        return res({ ias: [
          { id: "ia_cyber", nome: "Cyber ORION", provedor: "orion", contexto: 8000 }
        ]});
      }

      // --- Informações Genéricas ---
      if (u.includes('/api/info')) {
        return res({ marca: "ORION GitHub Edition", limites: { gratis: 500, pro: 9999 }, provedores: [{ id: "orion", nome: "Motor Simulado" }]});
      }
      if (u.includes('/api/novidades')) {
        return res({ atual: "GitHub.Pages", versoes: [{ versao: "GitHub.Pages", data: new Date().toISOString(), destaques: ["Backend 100% simulado no navegador", "Novas animações Glassmorphism", "Auditoria Contínua Ativada"], itens: [] }]});
      }

      // Rota genérica de fallback
      return res({ aviso: "Endpoint simulado", interceptado: true });
    }
    
    // Rotas externas normais
    return originalFetch(url, options);
  };
})();
