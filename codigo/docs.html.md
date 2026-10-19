# `docs.html`

> **Fonte:** https://assistanceorion.cloud/docs · baixado em 19/10/2026
> 248 linhas · 16.5 KB · Documentação da API pública (/docs)

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documentação — ORION</title>
<meta name="description" content="Como o ORION funciona: modos de uso, IAs com failover, vozes, planos, ponte com o app do PC e a API pública.">
<meta name="theme-color" content="#000000">
<link rel="icon" type="image/svg+xml" href="/orion/logo.svg?v=mvak1f88">
<link rel="stylesheet" href="/orion/tokens.css?v=mvenxghl">
<link rel="stylesheet" href="/orion/orion.css?v=mveng77k">
<link rel="stylesheet" href="/orion/docs.css?v=mvennc5k">
<script src="/orion/docs.js?v=mvddxwtc" defer></script>
</head>
<body class="docs-page">
<header class="shell-top">
  <a class="brand" href="/orion/"><img src="/orion/logo.svg?v=mvak1f88" alt="" width="28" height="28">ORION</a>
  <div class="top-actions">
    <a class="btn btn-sm" href="/tutorials">Tutoriais</a>
    <a class="btn btn-sm" href="/orion/#planos">Planos</a>
    <a class="btn btn-sm btn-primary" href="/orion/app">Abrir o ORION Web</a>
  </div>
</header>

<div class="dx">
  <nav class="dx-nav" aria-label="Seções da documentação">
    <b>Começar</b>
    <a href="#visao">Visão geral</a>
    <a href="#primeiros">Primeiros passos</a>
    <a href="#modos">Site e app juntos</a>
    <a href="#conta-app">Conta e plano no app</a>
    <b>Recursos</b>
    <a href="#ias">IAs e failover</a>
    <a href="#vozes">Vozes</a>
    <a href="#projetos">Projetos</a>
    <a href="#planos">Planos e limites</a>
    <b>Segurança</b>
    <a href="#ambiente-local">Ambiente local</a>
    <a href="#ponte">Ponte site ↔ app</a>
    <a href="#login">Login e privacidade</a>
    <b>API</b>
    <a href="#api">Visão geral</a>
    <a href="#api-auth">Autenticação</a>
    <a href="#api-chat">POST /v1/chat</a>
    <a href="#api-projeto">GET /v1/projeto</a>
    <a href="#api-exemplos">Exemplos</a>
    <a href="#api-erros">Erros e limites</a>
  </nav>

  <article class="dx-body">
    <h1>Documentação</h1>
    <p class="lead">Tudo o que você precisa para usar o ORION no navegador, no PC ou nos dois, e para ligar o seu assistente a outros programas.</p>

    <div class="dx-aviso" role="note" id="aviso">
      <b>Atenção: o seu computador, a sua responsabilidade</b>
      <p>Scripts, plugins e alterações que você criar ou instalar no app do ORION rodam <strong>somente no seu PC</strong>, com as permissões do seu usuário do Windows, e afetam apenas a sua instalação. Eles não mudam o banco de dados central, o servidor nem a conta de outras pessoas: no servidor, só é possível fazer o que a sua própria conta já pode fazer.</p>
      <p>Isso <strong>não</strong> significa que o código fique isolado do seu sistema. Um script mal feito pode apagar ou expor os seus próprios arquivos. Execute apenas o que você entende e confia, e mantenha cópias do que é importante. Veja os detalhes em <a href="#ambiente-local">Ambiente local</a>.</p>
    </div>

    <section id="visao">
      <h2>Visão geral</h2>
      <p>O ORION é um assistente de IA com três partes que conversam entre si:</p>
      <ul class="dx-lista">
        <li><b>Site (assistanceorion.cloud):</b> conta, planos, pagamento (PIX ou cartão), download do app e o <b>ORION Web</b>, uma área de trabalho no navegador com projetos e conversa com IA.</li>
        <li><b>App para Windows (ORION Desktop):</b> o assistente completo no seu PC: voz, editor de vídeo com corte automático, legendas, mapeamento de leads de clientes e central de automação. Pode ficar minimizado na bandeja do sistema.</li>
        <li><b>Ponte:</b> a ligação segura entre o site e o app que está aberto no seu PC. Sem ela cada parte funciona sozinha.</li>
      </ul>
    </section>

    <section id="primeiros">
      <h2>Primeiros passos</h2>
      <ol class="dx-passos">
        <li>Crie a conta em <a href="/entrar">Entrar</a> (e-mail e senha ou Google).</li>
        <li>Siga os <a href="/orion/comecar">primeiros passos</a>: eles configuram o <a href="#modos">site e o app juntos</a>, um passo de cada vez.</li>
        <li>Conecte uma IA. O Gemini tem plano grátis: crie a chave em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</li>
        <li>Sua conta já começa no plano Free, sem cartão. Para usar o app, baixe o instalador em Minha conta, abra o ORION e entre com o mesmo e-mail e senha em <b>Configurações → Conta e site</b>.</li>
      </ol>
    </section>

    <section id="modos">
      <h2>Site e app juntos</h2>
      <p>O ORION funciona de um jeito só, em todos os planos: o site (ORION Web) e o app do Windows usam a mesma conta e ficam em sincronia.</p>
      <div class="dx-tabela"><table>
        <thead><tr><th>Lado</th><th>Serve para</th><th>Chaves de IA</th></tr></thead>
        <tbody>
          <tr><td><b>ORION Web (navegador)</b></td><td>Conversar, criar roteiros e textos, código, análises e projetos, de qualquer lugar.</td><td>Guardadas cifradas no servidor; só a sua conta as usa.</td></tr>
          <tr><td><b>App no Windows</b></td><td>Voz, editor de vídeo, legendas, mapeamento de leads, central e o que você pedir pelo site para fazer no PC.</td><td>Só no seu PC (cofre do Windows).</td></tr>
        </tbody>
      </table></div>
      <p>Edição de vídeo e as automações do computador precisam do app. O ORION Web não mexe nos arquivos do seu PC: ele pede, o app executa e você aprova cada computador com um código.</p>
    </section>

    <section id="conta-app">
      <h2>Conta e plano no app</h2>
      <p>O ORION <strong>não usa chave de licença</strong>. O plano pertence à sua conta: quem manda é o e-mail e a senha.</p>
      <ul class="dx-lista">
        <li><b>Entrar:</b> no app, em <b>Configurações → Conta e site</b>, digite o e-mail e a senha da sua conta. Se criou a conta com o Google, escolha <b>Entrar pelo navegador</b>: o app mostra um código, o site abre e você aprova o pedido.</li>
        <li><b>Pagou, valeu:</b> quando o pagamento é confirmado, o plano da conta muda no servidor e o app enxerga na próxima conferência (ao abrir e a cada poucos minutos). Não precisa colar nada.</li>
        <li><b>PCs:</b> O Free conecta 1 PC; o Premium, até 3. Para trocar de computador, libere o antigo em Minha conta (uma vez a cada 30 dias) ou use <b>Sair deste PC</b> no app.</li>
        <li><b>Offline:</b> o plano fica válido por alguns dias sem internet e renova sozinho quando você volta a ficar online.</li>
        <li><b>Segurança:</b> a senha só vai ao servidor por HTTPS e nunca fica guardada no app (só um token de renovação, no cofre do Windows). Trocar a senha desconecta todos os PCs. Entrar de uma rede nova pode pedir um código enviado ao e-mail da conta.</li>
      </ul>
    </section>

    <section id="ias">
      <h2>IAs e failover</h2>
      <p>Você usa as <strong>suas</strong> chaves. O ORION tenta as IAs na ordem em que você definir. Se a primeira falhar (sem crédito, limite de uso, erro ou lentidão), o mesmo pedido, com <strong>a conversa inteira</strong>, segue para a próxima. Você não precisa repetir nada.</p>
      <ul class="dx-lista">
        <li>Provedores no ORION Web: Gemini, Groq, OpenRouter, Mistral, OpenAI, Claude (Anthropic) e DeepSeek. No app para PC também há o Ollama, NVIDIA NIM e outras, além de rodar modelos no seu próprio computador.</li>
        <li>A ordem é a da lista <b>Fila de IAs</b>. Use as setas para subir ou descer.</li>
        <li>Cada resposta mostra qual IA respondeu e quais falharam antes dela.</li>
        <li>Quantas IAs ao mesmo tempo: <b>Free 1</b> e <b>Premium sem limite</b>. Com 1 IA só existe a fila de uma.</li>
      </ul>
    </section>

    <section id="vozes">
      <h2>Vozes</h2>
      <p>No app para PC a voz padrão é a <b>Microsoft Edge TTS</b>: natural, gratuita e sem chave. No plano <b>Premium</b> você pode usar também a sua chave da <b>ElevenLabs</b>, guardada no cofre do Windows e nunca enviada ao nosso servidor.</p>
      <p>Se a ElevenLabs falhar (chave inválida, créditos acabaram ou sem internet), o ORION volta sozinho para a voz da Microsoft e segue falando, sem interromper a conversa.</p>
    </section>

    <section id="projetos">
      <h2>Projetos</h2>
      <p>Um projeto é um assistente com nome, jeito de falar e regras próprias (as <i>instruções</i>). No ORION Web, em <b>Novo</b>, descreva o objetivo em uma ou duas frases e use <b>Gerar com IA</b>: o ORION escreve o nome, a persona e as instruções para você revisar. Em um projeto existente, <b>Otimizar instruções</b> reescreve o texto atual de forma mais clara. Nada é salvo antes de você confirmar.</p>
      <p>Cada projeto pode ter chaves de API próprias para ser usado por outros programas (veja a <a href="#api">API</a>).</p>
    </section>

    <section id="planos">
      <h2>Planos e limites</h2>
      <div class="dx-tabela" id="tabela-planos"><p class="hint">Carregando os planos…</p></div>
      <p>O pagamento é por <b>PIX</b> ou <b>cartão de crédito</b> (à vista). O servidor só libera o plano depois de confirmar o pagamento direto no gateway; o número e o CVV do cartão nunca passam pelo ORION.</p>
      <p class="hint">Os valores e limites acima vêm direto do painel do ORION e sempre estão atualizados.</p>
    </section>

    <section id="ambiente-local">
      <h2>Ambiente local: o que os scripts podem e não podem fazer</h2>
      <ul class="dx-lista">
        <li><b>Escopo:</b> tudo o que roda no app (plugins, scripts, automações) roda no <em>seu</em> computador e altera <em>a sua</em> instalação. Não existe caminho para alterar o banco de dados central do ORION, o plano da conta ou os dados de outros clientes.</li>
        <li><b>Servidor:</b> o servidor só aceita pedidos autenticados e só enxerga a sua própria conta. Um script seu consegue, no máximo, o que você mesmo conseguiria fazer logado.</li>
        <li><b>Aprovação:</b> plugins pedem permissões e só funcionam depois que você aprova no app. A aprovação fica registrada na sua conta.</li>
        <li><b>Sem isolamento total:</b> o app não é uma caixa fechada (sandbox) do Windows. O código que você executa tem as permissões do seu usuário e pode mexer nos seus arquivos.</li>
        <li><b>Responsabilidade:</b> use só o que você entende ou vem de fonte confiável, revise o que um script faz antes de rodar e mantenha backup. O ORION não se responsabiliza por danos causados por código de terceiros que você decida executar.</li>
      </ul>
    </section>

    <section id="ponte">
      <h2>Ponte site ↔ app</h2>
      <p>O site conversa com o app que está aberto no seu PC. O navegador fala direto com <code>127.0.0.1</code>: não há servidor no meio.</p>
      <ul class="dx-lista">
        <li><b>Só local:</b> o app só atende o próprio computador e só aceita pedidos vindos do endereço oficial do site.</li>
        <li><b>Pareamento:</b> o site pede a conexão e o app mostra um <b>código de 6 dígitos no seu PC</b>. Você digita o código no site. O código vale 2 minutos e funciona uma vez.</li>
        <li><b>Token:</b> a conexão vale 12 horas e fica presa ao site que a pediu.</li>
        <li><b>Ações:</b> a lista é fechada (abrir um módulo, ver o estado, limpar e organizar a pasta Downloads com confirmação, cortar silêncios de vídeos de pastas que você aprovou no app). Não existe comando livre nem acesso a caminhos arbitrários: o site só escolhe entre os vídeos que o app lista.</li>
        <li><b>Registro:</b> toda ação fica no log do app. O Chrome pode pedir para você permitir o acesso à rede local na primeira vez.</li>
      </ul>
    </section>

    <section id="login">
      <h2>Login e privacidade</h2>
      <ul class="dx-lista">
        <li>A sessão fica em um cookie protegido (HttpOnly), e entrar de novo encerra a sessão anterior no servidor. O botão <b>Sair</b> encerra a atual.</li>
        <li>As senhas são guardadas com hash. As chaves de IA do ORION Web ficam cifradas (AES-256-GCM) no servidor.</li>
        <li>No app para PC, as chaves de IA ficam no cofre do Windows (DPAPI) e nunca chegam ao servidor.</li>
        <li>Só o que a IA precisa ler (por exemplo, o áudio para legendar) vai ao provedor de IA que você escolheu.</li>
      </ul>
    </section>

    <h2 id="api">API pública</h2>
    <p>A API deixa qualquer programa (site, loja, bot, planilha, automação) conversar com um <strong>projeto</strong> que você criou. O assistente responde com o nome, as instruções e a fila de IAs do projeto. Se uma IA falhar, a próxima assume.</p>
    <p>Endereço base:</p>
    <pre><code data-base>{BASE}/api/v1</code></pre>
    <p>Tudo é enviado e recebido em JSON (UTF-8).</p>

    <h3 id="api-auth">Autenticação</h3>
    <p>Gere uma chave no projeto (<em>Chaves de API → Gerar nova chave</em>) e envie em todo pedido:</p>
    <pre><code>Authorization: Bearer sk_live_SUA_CHAVE</code></pre>
    <p>Cada chave pertence a <strong>um</strong> projeto.</p>

    <h3 id="api-chat"><span class="metodo post">POST</span> /v1/chat</h3>
    <p>Forma simples:</p>
    <pre><code>{ "mensagem": "Vocês entregam no mesmo dia?" }</code></pre>
    <p>Com histórico: envie as mensagens anteriores em ordem (<code>role</code> é <code>"user"</code> ou <code>"assistant"</code>; no máximo 40 mensagens de 8000 caracteres):</p>
    <pre><code>{
  "mensagens": [
    { "role": "user", "content": "Oi, qual o prazo de entrega?" },
    { "role": "assistant", "content": "Olá! A entrega é imediata, logo após o pagamento." },
    { "role": "user", "content": "E se der problema?" }
  ]
}</code></pre>
    <p>Resposta (200):</p>
    <pre><code>{ "resposta": "Se der qualquer problema, é só chamar nosso suporte...", "ia": "gemini", "modelo": "gemini-2.5-flash", "tokens": 312 }</code></pre>

    <h3 id="api-projeto"><span class="metodo get">GET</span> /v1/projeto</h3>
    <p>Confere se a chave funciona e mostra o projeto dela.</p>
    <pre><code>{ "id": "prj_ab12cd34ef", "nome": "Atendimento", "descricao": "", "assistente": "Luna" }</code></pre>

    <h3 id="api-exemplos">Exemplos</h3>
    <p>cURL:</p>
    <pre><code data-base>curl -X POST {BASE}/api/v1/chat \
  -H "Authorization: Bearer sk_live_SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"mensagem": "Olá!"}'</code></pre>
    <p>JavaScript (Node.js 18+, no servidor):</p>
    <pre><code data-base>const r = await fetch('{BASE}/api/v1/chat', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.MINHA_CHAVE, 'Content-Type': 'application/json' },
  body: JSON.stringify({ mensagem: 'Olá!' }),
});
const dados = await r.json();
if (!r.ok) throw new Error(dados.erro);
console.log(dados.resposta);</code></pre>
    <p>Python:</p>
    <pre><code data-base>import os, requests

r = requests.post(
    "{BASE}/api/v1/chat",
    headers={"Authorization": "Bearer " + os.environ["MINHA_CHAVE"]},
    json={"mensagem": "Olá!"},
    timeout=90,
)
r.raise_for_status()
print(r.json()["resposta"])</code></pre>

    <h3 id="api-erros">Erros e limites</h3>
    <p>Quando algo dá errado, a resposta traz o código HTTP e um campo <code>erro</code> em português.</p>
    <div class="dx-tabela"><table>
      <thead><tr><th>Código</th><th>Significado</th><th>O que fazer</th></tr></thead>
      <tbody>
        <tr><td>400</td><td>Pedido inválido ou nenhuma IA conectada</td><td>Leia o campo <code>erro</code>; confira o JSON ou conecte uma IA.</td></tr>
        <tr><td>401</td><td>Chave ausente, errada ou revogada</td><td>Confira o cabeçalho Authorization ou gere outra chave.</td></tr>
        <tr><td>429</td><td>Limite atingido</td><td>Espere (limite por minuto) ou volte amanhã / mude de plano (limite diário).</td></tr>
        <tr><td>502</td><td>Todas as IAs conectadas falharam</td><td>Teste as IAs na Fila de IAs e conecte uma reserva.</td></tr>
        <tr><td>500</td><td>Erro interno</td><td>Tente de novo em alguns segundos.</td></tr>
      </tbody>
    </table></div>
    <ul class="dx-lista">
      <li>60 pedidos por minuto por chave, e o limite diário do plano da conta (soma de todos os projetos, zera à meia-noite de Brasília).</li>
      <li>Use timeout de 90 s: a resposta pode demorar se a IA estiver lenta.</li>
      <li><b>Nunca</b> coloque a chave em código que roda no navegador do visitante. Chame a API a partir do seu servidor e guarde a chave em variável de ambiente.</li>
      <li>Vazou? Revogue a chave no projeto e gere outra: a antiga para na hora. Use uma chave por lugar para revogar só uma.</li>
    </ul>

    <footer class="dx-rodape"><span>© 2026 ORION</span><span><a href="/orion/">Início</a> · <a href="/tutorials">Tutoriais</a> · <a href="/orion/conta">Minha conta</a></span></footer>
  </article>
</div>
</body>
</html>

```
