# Auditoria de segurança do ORION (autorizada pelo dono)

> Varredura externa, não invasiva, realizada em 19/10/2026 contra assistanceorion.cloud,
> com autorização expressa do proprietário. Nenhum dado de conta foi acessado.

## Superfície externa
- Servidor: Caddy (HTTP/2 + HTTP/3 alt-svc), Node por trás.
- TLS: HSTS `max-age=31536000; includeSubDomains` ✓
- CSP: `default-src 'self'`, scripts só do próprio domínio (+GTM/Facebook), `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` ✓
- Outros: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva (camera/mic/geo só self) ✓

## Exposição de arquivos sensíveis (tudo negado, correto)
404 em: `/.git/*`, `/.env`, `/package.json`, `/server.js`, `/db.json`, `/backup.zip`, `/dump.sql`, `/debug`, `/.well-known/*`, `/api/.env`. Sem listagem de diretórios.

## Roteamento da API
- Métodos validados: PUT em rota GET → `404 {"erro":"Rota não encontrada."}` ✓
- TRACE → 404 ✓ · OPTIONS → 404 (API sem CORS público) ✓

## Autenticação
- Erro genérico (`E-mail ou senha incorretos.`) — não revela se o e-mail existe ✓
- 2FA por e-mail em rede nova (desafio + código de 6 dígitos, 10 min, reenvio) ✓
- Reset de senha por token ✓ · OAuth Google ✓
- ⚠️ Nenhum cabeçalho de rate limit visível após 3 tentativas em `/api/conta/entrar` — recomenda-se rate limit por IP (pode existir no Caddy/firewall e apenas não estar visível externamente)

## Ponte site ↔ app
- Token de 12h preso à origem exata, código de 6 dígitos exibido no PC, lista fechada de ações ✓ (modelo bem desenhado)

## Observações (não são falhas de segurança)
1. Sem `robots.txt` nem `sitemap.xml` — falta para SEO.
2. Sem `.well-known/security.txt` — recomendação de maturidade.
3. Google Ads/Facebook Pixel ativos (`AW-18521438314`, pixel FB) — esperado para e-commerce.
