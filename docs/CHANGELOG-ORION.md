# Changelog oficial do ORION (espelho)

> Espelho fiel do `GET /api/novidades` de assistanceorion.cloud, capturado em 19/10/2026.
> Documenta o produto completo (site + app desktop + ponte). Útil como histórico e referência de roadmap.

## 1.9.8 — 19/10/2026
**Diga "bom dia" e o ORION abre o seu dia em tela cheia: o anel de energia no centro, cartões que aparecem enquanto ele narra e uma música de fundo escolhida por você.**
### Bom dia em cena
- Diga "bom dia" (ou "ORION, bom dia") e o ORION fala a hora, revisa o que mudou desde ontem, mostra o clima da sua cidade, as faturas que estão vencendo e as principais notícias, cada uma num cartão com imagem
- Cada cartão narrado desce para uma fileira; no fim tudo fica alinhado embaixo do anel e a tela fecha sozinha (Esc fecha antes)
- Legenda grande na parte de baixo, pensada para quem grava a tela
- Música de fundo: escolha um arquivo de áudio em Configurações, Rotinas, "Música do bom dia". Ela abaixa sozinha quando o ORION fala
- Para ligar: Configurações, Rotinas, modelo "Bom dia", Salvar rotina. O botão "Testar o bom dia em cena" mostra como fica

## 1.9.7 — 19/10/2026
**O ORION agora lê qualquer arquivo do seu PC e envia imagens, vídeos e documentos para os sites, sempre com a sua confirmação.**
### Ler qualquer arquivo
- Imagens: o ORION vê a imagem e diz as medidas, a proporção e em que formato ela serve (Google Ads, feed, stories)
- Vídeos: duração, medidas, se tem som e três quadros do vídeo para ele ver o conteúdo
- PDF, Word, Excel e PowerPoint: o ORION lê o texto; áudios: duração e formato; arquivos .zip e .rar: o que tem dentro
- Peça, por exemplo: "veja as imagens da pasta Anúncios e me diga quais servem para o Google Ads"
### Enviar arquivos para sites
- O ORION envia arquivos do PC para um site (upload), como as imagens e os vídeos de uma campanha no Google Ads ou no Meta
- Antes de enviar, aparece "Permitir" na tela com o site e a lista de arquivos
- Arquivos de senhas e chaves e os dados do ORION nunca são enviados
### Leads e clientes
- A busca de negócios agora mostra o resultado num mapa: pinos numerados (azul = sem site), o raio da busca e o cartão de cada negócio. Dá para trocar entre mapa e lista
### Voz
- Opção nova em Configurações → Voz e áudio: usar como voz do ORION o VoiceStudio instalado no seu PC. A voz padrão continua a do Edge, e se o VoiceStudio falhar o ORION volta para ela sozinho
### Segurança
- Proteção de senhas e chaves reforçada quando o ORION trabalha pelo Claude Code: esses arquivos ficam bloqueados em qualquer pasta
- Memória do Obsidian: o que parece senha, token ou chave nas suas notas é trocado antes de ir para a IA, e notas marcadas como privadas (privado: true, #privado ou a pasta Privado) nem entram na busca

## 1.9.6 — 18/10/2026
**O ORION agora também escreve nas APIs dos seus projetos: cria, altera e apaga, e não só consulta.**
### APIs dos projetos
- Nova ação para a IA: usar as APIs cadastradas em Fontes de dados → Projetos com GET, POST, PUT, PATCH e DELETE, com a chave guardada no cofre do Windows
- Exemplos: cadastrar contatos num CRM, criar cupons, atualizar produtos e pedidos
- A chave só vai para o endereço da própria API cadastrada, nunca para outro site, e nunca aparece na resposta
- O que altera passa pela sua confirmação na tela; no modo "permitir tudo", executa direto e fica registrado em Logs
- Se a API pedir uma pausa (limite de uso), o ORION avisa quanto tempo esperar
### Estabilidade
- O app não cai mais quando as notas do Obsidian mudam (o vigia de arquivos foi trocado por uma verificação leve)
- Erros de tela agora ficam registrados com o arquivo e a linha, para corrigir mais rápido

## 1.9.5 — 18/10/2026
**Os vídeos em motion do ORION ganharam um motor novo: desenhados quadro a quadro, com narração, legenda no ritmo da fala, efeitos sonoros e demonstração na tela de onde clicar.**
### Motion novo
- Todo vídeo sai com narração (a voz do ORION), legenda que acompanha a fala, efeitos sonoros nas transições e trilha ambiente que abaixa quando a voz fala
- Três estilos: neon (anel de luz, brilho e chão em grade), vidro (cartões de vidro e aurora suave) e impacto (tipografia forte e blocos de cor). O ORION varia o estilo de um vídeo para outro
- A sua logo entra na abertura com anel de luz, no canto de cada cena e no final, e as cores são as da sua marca
- Vertical (Reels, TikTok, Shorts), paisagem (YouTube, Discord) ou quadrado
### Tutorial com demonstração na tela
- O ORION mostra onde clicar: janela do programa ou do site, o cursor abrindo o menu, escolhendo a opção, preenchendo o campo e apertando o botão, com o som de cada clique
- Copiar e colar: o valor é copiado numa janela e viaja por um feixe de luz até o campo da outra, com o "Ctrl + V" na tela
- Cenas de número que cresce (preço, desconto), lista com check e passos numerados ("PASSO 1 DE 4")
- Peça no chat, por exemplo: "faça um tutorial animado de como criar uma conta no meu site, com a minha logo, tema azul"

## 1.9.4 — 18/10/2026
**O ORION faz vídeos em motion com a sua logo e as suas cores, você entra com o Discord ou com o Google, e site e app funcionam juntos em todos os planos.**
### Vídeos em motion feitos pelo ORION
- Peça no chat, por exemplo, "crie um tutorial animado com esses 5 passos, tema roxo e a logo da minha loja": o ORION monta o vídeo sozinho com o motor do Editor & Motion, sem você abrir o editor
- Tutorial passo a passo (número grande, "PASSO 1 DE 5", título e explicação em cada cena), apresentação, anúncio ou intro
- Usa a logo da sua marca (PNG, JPG ou WebP) na abertura, no canto de cada cena e no final, e as cores que você pedir
- Vertical (Reels, TikTok, Shorts), paisagem (YouTube) ou quadrado, com narração opcional e efeitos sonoros
- O vídeo fica na pasta "Vídeos > ORION" do Windows
- No editor, o motion aceita imagens por cima do vídeo (logo, selo) e as cores da marca
### Entrar com o Discord e com o Google
- Botões "Continuar com o Discord" e "Continuar com o Google" na tela de entrar do site, no ORION Web e no app
- No app, o botão abre o navegador: você entra lá e aprova este PC, sem digitar senha no app
- Se ainda não tem conta, ela é criada na hora com o nome e o e-mail confirmados do Discord ou do Google, e você passa pelos primeiros passos
- O Discord entra na conta que já está ligada a ele; se não houver, na conta com o mesmo e-mail confirmado
### Um modo só: site e app juntos
- Saíram os modos "100% no navegador", "Motor local na bandeja" e "App completo". Agora o ORION funciona sempre como site + app em sincronia (o antigo Híbrido), em todos os planos
- Quem estava em outro modo passa para este automaticamente; a escolha saiu dos primeiros passos, de Minha conta e das Configurações do app
### Site
- Na página inicial, o Editor & Motion com IA mostra um anúncio em motion nascendo de uma frase: gancho, título, número que cresce e botão de chamada
- Painel do dono mais seguro: quem não é dono ou da equipe não recebe nem a página nem os arquivos do painel
- Painel do dono no celular: menu em tela cheia com todas as opções e botão "Enviar notificação de teste"
- Anúncios & lucro: aviso claro quando falta o token da Meta, passo a passo certo para conta de anúncios pessoal e aviso no celular antes do token vencer

## 1.9.3 — 18/10/2026
**Você escolhe se o ORION pergunta antes de agir ou faz tudo direto, e os avisos do Windows saem com o nome e a logo do ORION.**
### Confirmações
- Novo passo na configuração inicial: "Perguntar antes de agir" (aparece Permitir / Negar na tela) ou "Permitir tudo, sem perguntar"
- Dá para trocar quando quiser em Configurações → Geral
- No modo "permitir tudo", o que o ORION faz fica registrado em Logs
- As confirmações do Discord mostram o nome do servidor, não o número
### Avisos do Windows
- As notificações saem como "ORION", com a logo do ORION, no lugar de "bandeja.exe" e do ícone de informação
- Clicar no aviso abre o ORION

## 1.9.2 — 18/10/2026
**O ORION agora monta e organiza os seus servidores do Discord com qualquer IA, vai até o fim em projetos de várias etapas e mostra a ordem recomendada das IAs.**
### Discord pelo ORION
- Peça no chat, por exemplo, "crie no meu servidor uma categoria COMUNIDADE com canais de avisos, regras e suporte": o ORION monta tudo pelo bot do ORION, com qualquer IA (Gemini, Groq, ChatGPT, Claude...)
- Ele vê a estrutura do servidor, cria categorias, canais (texto, voz, avisos, fórum e palco) e cargos, deixa canais privados ou só de leitura, organiza, apaga e posta mensagens
- Criar e editar pedem "Permitir" na tela; apagar e postar pedem sempre, um por um
- Só funciona nos servidores em que você é dono ou administrador. Para começar, conecte o Discord à sua conta (Configurações → Conta) e adicione o bot do ORION ao servidor pelo link que ele mesmo manda no chat
### Projetos de várias etapas
- Todas as IAs vão até o fim em projetos maiores: até 30 etapas seguidas numa resposta (antes eram 8), conferindo cada passo
- Se o projeto passar disso, o ORION avisa e continua de onde parou quando você disser "continue"
### Ordem recomendada das IAs
- Em Configurações → Cérebro, cada IA mostra a posição na recomendação, da melhor para a pior, e o motivo
- Um botão coloca a sua fila na ordem recomendada; quem ainda não escolheu uma ordem já começa nela
- No ORION Web, a lista para conectar uma IA vem na mesma ordem, com o mesmo botão
### Site
- Página inicial em formato de funil: Núcleo, Leads (agora mostrando o site completo e a hospedagem), Editor & Motion com IA e Roteiros que viram vídeo
- Link novo do servidor do ORION no Discord em todo o site e no app
- Cada cadastro guarda de onde a pessoa veio (anúncio, Google ou afiliado), e o cadastro pelo Google também conta como conversão nos anúncios

## 1.9.1 — 18/10/2026
**Sites prontos de exemplo, a entrega do site passo a passo com hospedagem grátis na Vercel, a conversa com o lead e o Google Chrome como navegador padrão.**
### Sites prontos
- Nova aba Sites prontos em Componentes & UI: seis sites de exemplo (barbearia, clínica odontológica, pizzaria, academia, pet shop e advocacia), cada um com identidade própria
- Veja ao vivo no computador e no celular e use como base: escolha o lead e a IA troca nome, serviços, endereço e WhatsApp, mantendo o design
- Biblioteca de componentes React maior: mais de 100 componentes, com prévia em imagem ou vídeo
### Entrega do site
- Nova aba Entrega no editor do site, com o passo a passo depois que ele fica pronto: prévia só para o lead ver, fechamento do negócio, demonstração grátis na Vercel, domínio próprio e publicação oficial
- Fechou negócio: marque o lead como cliente e siga a lista do que combinar (material, dados, valor e ajustes)
- Demonstração na Vercel com HTTPS, de graça, num endereço .vercel.app (conecte a sua conta colando um token, que fica cifrado na nuvem)
- Domínio próprio: na publicação oficial o ORION liga o domínio ao site e mostra os registros de DNS para configurar no registro.br
- A publicação oficial passa pela revisão de segurança do código; a demonstração não. Se a revisão achar algo, o botão Corrigir com IA conserta mantendo o visual
### Conversa com o lead
- No lead, cole o que ele respondeu no WhatsApp: o ORION mostra a conversa, explica o que ele quis dizer e sugere três respostas para enviar ou copiar
- Se o lead pedir mudança no site, um botão aplica o pedido direto no editor
- A IA escreve os sites com código mais caprichado e design fora do padrão
### Navegador
- O ORION abre e usa o Google Chrome por padrão; o Edge só quando você pedir
### Site
- Página inicial reorganizada: Leads e clientes logo depois do núcleo, e o editor de vídeo mais abaixo
### Correções
- Lead criado à mão com número de celular já ganha o botão do WhatsApp
- No cadastro pelo site, o modo de uso só é gravado quando você clica em Continuar (antes, cada clique trocava o modo do app)
- A aba Entrega do editor e a primeira mensagem da conversa com o lead aparecem na hora

## 1.9.0 — 18/10/2026
**Leads e clientes: ache negócios sem site no Google Maps, organize o funil, acompanhe os clientes e crie sites inteiros com IA.**
### Leads e clientes
- Novo item na barra lateral, com Buscar no mapa, Seus leads, Seus clientes e Seus sites
- Busca no Google Maps por ramo e cidade, só com quem não tem site próprio: telefone, WhatsApp, nota e avaliações, horário e o link do Maps
- Importe um negócio colando o link do Google Maps (ou escrevendo o nome e a cidade)
- O OpenStreetMap continua disponível, grátis, para buscar por raio
- Os leads ficam na sua conta: o app e o ORION Web mostram os mesmos dados
### Funil de vendas
- Etapas Novo, Contatado, Negociando, Cliente e Perdido, em lista ou em quadro (arraste os cartões entre as etapas)
- Anotações, histórico de contatos e data para retornar, com aviso de quem precisa de retorno hoje
- Abordagem escrita pela IA: resumo do negócio, argumentos e a mensagem pronta para mandar no WhatsApp
- Planilha (CSV) dos leads e dos clientes
### Sites com IA
- A IA programa o site inteiro do negócio com os dados do lead (serviços, horário, mapa, botão de WhatsApp), sem inventar preços nem depoimentos
- Peça mudanças em português ("troque as cores", "adicione uma galeria") e a IA reescreve o site, guardando cada versão para você voltar quando quiser
- Edite o código à mão, veja no computador e no celular e baixe o index.html para qualquer hospedagem
- Publique uma prévia por 30 dias para mostrar ao cliente e, quando ele aprovar, coloque o site no ar de vez
- No app, quem escreve o site é a IA do seu PC; no ORION Web, as IAs da sua conta
### Modo apresentação
- Peça no chat "apresente o ORION em 20 segundos" (ou "resumo do que o ORION faz") e ele se apresenta na tela inteira, narrando cada recurso no tempo pedido
- Setas trocam o cartão, espaço pausa a narração e Esc fecha
### Correções
- Em respostas longas, a voz não alterna mais entre a do Edge e a do Windows: as frases são preparadas aos poucos e, se a Microsoft limitar, o ORION espera e tenta de novo na mesma voz
- Os avisos rápidos aparecem por cima dos painéis (antes ficavam escondidos atrás deles)

## 1.8.4 — 17/10/2026
**Projetos com documentos e APIs que o ORION lê e consulta, e uma biblioteca de componentes bem maior.**
### Projetos
- Nova aba Projetos em Fontes de dados: cadastre cada projeto com nome, descrição, documentos (texto colado, link ou arquivo do PC) e APIs
- O ORION conhece seus projetos nas conversas e consulta as APIs quando você pede ("quantos pedidos a loja teve hoje?"), sempre só leitura
- As chaves das APIs ficam no cofre do Windows deste PC, criptografadas, e nunca aparecem inteiras nem passam pelo site
### Biblioteca de componentes
- 23 peças novas em três categorias: Efeitos e animações (botão com brilho em órbita, feixe na borda, meteoros, terminal que digita...), Fundos (grade retrô, aurora, pontos) e Seções de página (hero, bento de recursos, tabela de preços, depoimentos, perguntas frequentes)
- Agora são 91 componentes, liberados conforme o plano; as seções largas aparecem inteiras na prévia
### Correções
- Prévia dos componentes centralizada e no tamanho certo em qualquer largura de tela

## 1.8.3 — 17/10/2026
**O ORION agora mexe no navegador com qualquer IA, atende sempre o seu pedido mais recente, escuta "ORION" até no meio de uma ação e avisa quando algo dá errado.**
### Navegador
- Controle do navegador para todas as IAs (Gemini, Groq, OpenRouter, Claude...): abre o site, lê a página, clica, digita e rola. Ex.: "abre o YouTube e toca o primeiro vídeo de receitas"
- Pediu outra coisa no meio de uma tarefa no navegador? O ORION larga a anterior e faz o pedido novo
- Tarefas interrompidas ficam marcadas e nenhuma IA retoma o que você cancelou
### Voz
- Chame "ORION" a qualquer momento, até enquanto ele fala ou trabalha: ele para o que está fazendo, diz "Você me acionou durante uma ação, pode falar" e escuta
- A escuta pela palavra ORION vem ligada nas instalações novas (dá para desligar no botão "ORION" da tela principal)
### Briefing e estabilidade
- O briefing de notícias pode ser fechado a qualquer momento, até enquanto busca as manchetes, e nunca fica "coletando" para sempre (tem "Tentar de novo")
- Se uma IA ficar 5 minutos sem responder, o ORION cancela e avisa em vez de ficar parado
- Avisos claros quando algo dá errado: servidor sobrecarregado, tela com problema (com "Recarregar") e ORION sem responder (reconecta sozinho)
### Chaves de IA
- Passo a passo para pegar a chave de cada IA (Gemini, Groq, OpenRouter, Mistral, DeepSeek, OpenAI, Claude), aberto na primeira vez, no app, no ORION Web e nos primeiros passos do site
### Site
- Primeiros passos completos depois de criar a conta, igual ao app: como te chamar, personalidade, objetivos, modo de uso, app, IA e plano; as respostas viram a Memória do ORION
- Demonstrações com o anel de energia do app, o mapa igual ao Mapeamento de Leads e os logos das IAs

## 1.8.2 — 17/10/2026
**Vídeos curtos automáticos com imagens, 53 métodos prontos de conteúdo para redes sociais e a Memória do ORION, que vale só para a sua conta.**
### Conteúdo
- Vídeo automático com imagens: a partir do roteiro, o ORION monta o vídeo com narração em português, legenda, música e imagens dos seus vídeos ou de bancos grátis (Pexels, Pixabay), usando o MoneyPrinterTurbo instalado no PC
- 53 métodos prontos de conteúdo (ganchos virais, roteiro de Reels, legenda e hashtags, calendário de 2 semanas, carrossel, análise de concorrente, briefing de anúncio, plano de UTMs e outros) no módulo Conteúdo & Roteiros e na conversa
- Peça na conversa: "faça um vídeo curto sobre..." ou "use o método de ganchos virais para..."
### Conta
- Memória do ORION em Minha conta: conte quem você é, no que trabalha e como prefere ser atendido; vale só para a sua conta, no ORION Web e no app logado com o mesmo e-mail
- A memória não entra nas respostas públicas (widget e chaves de API) e recusa textos com cara de senha ou chave

## 1.8.1 — 16/10/2026
**Verificação do Discord pela tela oficial de autorização, pagamentos integrados à API da SyncPayments, e-mails do ORION chegando na caixa de entrada e vídeos de apresentação narrados.**
### Discord
- Novo canal de verificação: clique em Verificar, autorize o ORION na tela do próprio Discord e os canais do servidor são liberados
- O ORION aparece em Configurações → Aplicativos autorizados do Discord, e você remove a autorização quando quiser
- Quem tem conta no ORION sai da verificação já com os cargos do plano, sem código para copiar
- "Conectar com o Discord" no site, no ORION Web e no app abre a mesma autorização e conecta a conta na hora
- Quem saiu do servidor e voltou recebe os cargos de volta sozinho
### Pagamentos
- Confirmação de pagamento na hora pelo aviso assinado da SyncPayments, conferido antes de liberar o plano
- Painel do dono com a situação da conta na SyncPayments, saldo e o cadastro do aviso de pagamentos
- Pedido de reembolso pelo painel, com motivo e descrição; o plano só cai quando o reembolso é concluído
- Opção de mandar as vendas ao UTMify pela própria SyncPayments
- Cartão de crédito aparece como "em breve" enquanto a SyncPayments analisa a conta
### E-mails
- Os e-mails do ORION (código de entrada, recuperação de senha e avisos) saem pelo domínio assistanceorion.cloud, com assinatura que os provedores reconhecem
- Responder um e-mail do ORION chega direto ao suporte

## 1.8.0 — 16/10/2026
**Conta ligada ao Discord com cargos por plano, plano anual com 30% de desconto, tela de entrar igual à do site, painéis que recolhem, player de mídia universal e relatório de segurança.**
### Tela principal
- O painel da esquerda (Áudio, Clima, Agentes, Novidades e Histórico) começa recolhido e abre por um trilho de atalhos
- O painel de Conversa, Diagnóstico e HUD também recolhe, liberando a tela para o núcleo e os módulos
- Novidades agora fica na barra lateral, com um aviso claro quando sai uma versão nova
### Conta e entrada
- A tela de entrar do app é a mesma do site: abas Entrar e Criar conta, mostrar senha e força da senha
- Entrar com o Google direto do app
- Dá para criar a conta sem sair do app; na primeira configuração ela fica no passo 6
- "Esqueci a senha" no site: link por e-mail que vale 30 minutos e só funciona uma vez
### Discord
- "Sincronizar com Discord" em Minha conta, no ORION Web e nas Configurações do app
- Entre com o Discord (ou use o código com /vincular) e receba os cargos do seu plano no servidor
- Os cargos mudam sozinhos quando o plano muda
- Suporte automático no servidor: o bot responde dúvidas no canal de dúvidas, nos tickets e no /pergunta, e chama a equipe quando precisa
- Canal de redes sociais com Instagram e TikTok oficiais
### Planos
- Escolha mensal ou anual na página de planos e no pagamento; o anual sai 30% mais barato
- O cupom vale sobre o preço do ciclo escolhido
### Mídia e voz
- Player universal: mostra capa, título e controles do que estiver tocando (Spotify, YouTube no navegador ou outro app do Windows)
- Ao testar uma voz, a anterior para na hora; os ícones de som não somem mais ao clicar
### Site
- A página inicial voltou às demonstrações animadas, agora com uma apresentação em sequência no topo
- Página de Novidades com todas as versões e aviso de versão nova no site
### Segurança
- Relatório de segurança no painel do dono: um clique analisa o site, o bot e o app (código, dependências, segredos e configuração do servidor)
- Mensagens de erro previstas aparecem certas (antes algumas viravam "Erro interno")
- Links e nomes de arquivo nas telas do editor e do roteirizador passam por escape

## 1.7.0 — 16/10/2026
**Barra lateral nova no app e no ORION Web, Financeiro, Home Assistant, Monitoramento e a biblioteca Componentes & UI.**
### Barra lateral
- Navegação agrupada em Visão geral, Dados e automação, Módulos, Sistema e Componentes, com submenus
- Recolhe para só ícones e abre ao passar o mouse
- A mesma barra e as mesmas telas no app do PC e no ORION Web
### Financeiro
- Saldos das contas, gastos por categoria, faturas e investimentos
- Importa extrato do banco em OFX ou CSV sem duplicar lançamentos
- Avisa um dia antes do vencimento e no dia; fale "gastei 35 reais no almoço" que ele anota
- Os dados ficam só no seu PC
### Home Assistant
- Liga e desliga luzes, tomadas, ar-condicionado e cenas pela tela ou falando
- Passo "Casa" nas Rotinas: ao dizer "cheguei", acende a luz da sala
- Fechaduras e alarmes ficam só para leitura, por segurança
### Monitoramento
- Saúde do PC com nota, processador, memória, disco e programas pesados
- Tempo de uso por hora e por dia, só neste computador
- Lembretes de pausa, água, postura e hora de dormir
### Sistema
- Logs com eventos recentes e o registro técnico, com chaves e senhas mascaradas
- Fontes de dados: IAs, conectores, canais e o que o ORION lembra sobre você
- Números anônimos de uso (opcional) para priorizar as melhorias
### Componentes & UI
- Biblioteca visual do ORION com 68 peças em HTML e CSS para copiar no seu site
- Free, Basic e Premium liberam quantidades diferentes

## 1.6.1 — 16/10/2026
**Site e app conectados pela sua conta, ORION Web igual ao app e cadastro novo.**
### Site e app pela conta
- O site encontra o ORION do seu PC pela conta, sem código e sem depender do navegador
- Corrige o aviso "Abra o ORION Desktop" com o app aberto (o Chrome passou a bloquear sites de falar com o PC)
- Motor local na bandeja funcionando pelo site: abrir módulos, cortar silêncios, limpeza segura e diagnóstico
### ORION Web
- O ORION do navegador agora tem a mesma tela do app: anel de energia, agentes, voz, modo de personalidade e melhorador de prompt
- Aba Meu PC para usar o app do computador pelo site
### Cadastro e primeiros passos
- Tela de entrar e criar conta nova, com mostrar senha e medidor de força
- Primeiros passos um de cada vez, com o modo Híbrido recomendado
- Login com o Google
### Site
- Barra só com ícones que mostram o nome ao passar o mouse
- Telas reais do ORION no lugar dos desenhos de demonstração
- Páginas de Política de Privacidade e Termos de Uso

## 1.6.0 — 16/10/2026
**Visual novo em preto e azul neon, personalidade, câmera, rotinas e melhorador de prompt.**
### Visual novo
- Tela toda preta com detalhes em azul neon e grade de planta técnica
- Anel de energia no lugar da esfera: pulsa com a voz do ORION
- Configurações com as abas numa coluna, todas visíveis
### Configuração inicial
- Antes de ligar pela primeira vez: nome, como te chamar, personalidade, voz, câmera e gostos
- Dá para refazer quando quiser em Configurações
### Personalidade
- Seis jeitos de falar: Sério, Equilibrado, Mordomo, Divertido, Zueiro e Motivador
- Botão Modo na tela principal para trocar na hora
### O ORION enxerga
- Com a câmera ligada, pergunte "o que você está vendo?" e ele olha pela webcam
- Pode te cumprimentar quando você volta para o PC
### Rotinas
- Diga "cheguei" e o ORION fala, espera, pergunta, abre sites e controla a música, na ordem que você montar
- Também disparam ao abrir o ORION, no bom dia ou quando a câmera nota que você chegou
### Melhorador de prompt
- Varinha ao lado do campo de mensagem (Alt+M): a IA reescreve o pedido para entender de primeira
