# Auditoria de segurança do frontend ORION (19/10/2026)

Escopo: código estático público de assistanceorion.cloud (80 arquivos) e sondagem **somente leitura** de endpoints
sem autenticação. Não houve login, brute force, fuzzing nem acesso a contas. Auditoria do lado cliente + superfície
pública: **não cobre o backend** (código do servidor não foi analisado).

## Resultado: nenhuma falha crítica encontrada. Nada precisou ser "curado" no código.

### Verificado
| Item | Como foi verificado | Resultado |
|---|---|---|
| Segredos no código | regex de chaves (sk-, gsk_, AIza, AKIA, ghp_, JWT, chave privada) em todos os .js/.html/.css | Nenhum. `sk_live_SUA_CHAVE` em docs.html e `gsk_…` em ias-tutorial.js são placeholders |
| Endpoints (65 mapeados no JS) | GET anônimo em 32 rotas | Rotas de conta/projetos/ponte/clima respondem 401; inexistentes 404; `/api/v1` exige Bearer |
| Cabeçalhos | `curl -I` | HSTS 1 ano, CSP restritiva (sem unsafe-eval, sem unsafe-inline em script), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| XSS no chat (`md()` em web.js) | executei a função real com 7 payloads (script, img onerror, javascript:, quebra de href, etc.) | Todos neutralizados: HTML é escapado antes do Markdown, links só http(s) |
| Outros `innerHTML` | li cada ocorrência | Apenas SVG/HTML fixo do próprio código |
| Login inválido | POST com credencial falsa | 401 genérico "E-mail ou senha incorretos." (sem enumerar usuário) |

### Observações (baixo risco, para avaliar)
1. **`/api/marketing/publico` é público** e devolve IDs de Google Ads (`AW-…`) e rótulos de conversão. São identificadores
   de tag, públicos por natureza (aparecem no tráfego do navegador), mas permitem a terceiros enviar conversões falsas
   e poluir a otimização de anúncios.
2. **`/api/info` expõe** limites de plano e lista de provedores; `/api/download/info` expõe versão, tamanho e SHA-256 do
   instalador (útil, aliás, para o usuário verificar integridade). Informação não sensível.
3. **`/api/dono/eu` responde 200 para anônimos** (`{"dono":false}`): existe uma rota de "dono" e ela revela ao público que
   há papel administrativo. Baixo risco; considere 401 para anônimos.
4. **CSP `style-src 'unsafe-inline'`**: necessário pelos estilos inline do projeto, mas enfraquece a defesa em profundidade.
5. **CSP `connect-src http://127.0.0.1:* http://localhost:*`**: necessário para a ponte com o app do PC; qualquer script
   que rode na página poderia falar com portas locais. Mitigado por não haver XSS conhecido.
6. Não verificado: flags do cookie de sessão (HttpOnly/Secure/SameSite), pois só aparecem após login válido. Não afirmo que estão corretos.
7. Não verificado: rate limiting de login, CSRF nas rotas POST, autorização entre usuários (IDOR) em `/api/projetos/:id`
   e `/api/pagamentos/:id`. Requerem conta de teste e autorização expressa do dono para testar.
