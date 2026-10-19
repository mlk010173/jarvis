# ORION Desktop — engenharia reversa do instalador (forense autorizada)

> Análise do instalador Windows oficial (v1.9.8, build 1792394811, 50.209.953 bytes),
> baixado com conta autenticada e verificado: SHA-256 `9E8FB92B…D9297D` idêntico ao publicado
> em `/api/download/info`. Autorizada pelo proprietário. Documenta apenas estrutura e
> metadados; nenhum código-fonte proprietário foi extraído para uso.

## 1. O contêiner Inno Setup 6.7.0 (formato inédito)

O instalador usa **Inno Setup 6.7.0** com um loader modificado ("revision 2"), ainda não
suportado por nenhuma ferramenta pública. Para abrir, compilamos o innoextract 1.10-dev
(master) com 4 patches:

1. **Loader rev2**: a tabela de offsets tem 2 × u32 extras e usa offsets de 64 bits (qwords)
2. **Versão 6.7.0**: registrada no `setup/version.cpp` (formato próprio, não 6.4)
3. **SetupEncryptionHeader**: entre a string de versão e o primeiro bloco há um CRC32 + struct
   packed de 49 bytes (`EncryptionUse` u8 + `KDFSalt` 16 + `KDFIterations` 4 + `BaseNonce` 24 +
   `PasswordTest` 4) — decifrado no fonte oficial do Inno (issrc, tag is-6_7_0)
4. **TCompressedBlockHeader**: `StoredSize` virou `Int64` (header de 9 bytes)

Layout final decifrado:
```
PE stub (Delphi, 880.640 bytes) | setup data @ 0x0D7000 (LZMA2 sólido) | headers @ 0x2E7EFF0
```
- EncryptionUse = euNone (sem senha no instalador)
- Bloco de header: 61.873 bytes comprimidos com LZMA1

## 2. O payload: 204.781.268 bytes descomprimidos

A seção de dados é **um único chunk sólido LZMA2** (magic `zlb\x1a`, prop 0x16 = dict 8 MB,
`lzma.FILTER_LZMA2`), que descomprime para ~205 MB com TODOS os arquivos do app concatenados.

### Arquivos identificados dentro do payload

| Arquivo | Tamanho | O que é |
|---|---|---|
| `manifest.json` | 37 B | `{"versao":"1.9.8","build":1792394811}` |
| `README.txt` | ~3,5 KB | Manual + **seção completa de licenças** |
| **App principal** | 82,8 MB | PE x64, 13 seções, FFmpeg e OpenSSL linkados estaticamente (editor de vídeo + crypto), refs a Delphi |
| `bandeja.exe` | ~0,1 MB | Ícone da bandeja do Windows (Product "ORION", token `ORION_TOKEN`, abre o ORION Web) |
| `node.exe` | 91,7 MB | **Node.js v24.15.0** (runtime embutido em `runtime\node.exe`) |
| + node_modules | — | SQLite ×2, ZIPs, JARs, 61 RIFF (áudio), PNGs, 2.158 JSONs |

### Stack revelada pelas licenças do README (verbatim)

- Node.js v24.15.0 (MIT) · express 5.2.1 (MIT) · **msedge-tts 2.1.0 (MIT — motor de voz)** ·
  **@anthropic-ai/sdk 0.132.1 (Claude)** · playwright-core 1.56.1 (Apache-2.0 — automação de navegador)
- `lib\conteudo-skills`: Claude Content Skills (Ootto, MIT)
- Fontes da UI (Google Fonts): Orbitron, Rajdhani, JetBrains Mono (OFL 1.1)

## 3. Arquitetura do app desktop (reconstruída)

1. **App principal** (~83 MB): monolito nativo com FFmpeg (editor de vídeo: corte de silêncio,
   legendas, motion) + OpenSSL; conversa com a nuvem pela conta
2. **Servidor local Node** (`runtime\node.exe`): Express; serve a API local da ponte
   (`127.0.0.1:3950/ponte/v1`), voz via msedge-tts, IA via SDK da Anthropic (fila BYOK com failover)
3. **bandeja.exe**: integração com a bandeja do Windows, "Abrir o ORION Web"
4. Playwright: automação de navegador (pesquisa/entrega dos "Seus sites" dos leads → Vercel)

## 4. Como reproduzir (ferramentas)

```bash
# innoextract 1.10-dev + 4 patches (ver patches acima) — extrai headers e metadados
# payload: python3 -c com lzma.FILTER_LZMA2, dict 8MB, no offset 880.645 do instalador
```

Artefatos da análise: `/tmp/pe_94583.exe` (app), `/tmp/pe_83013584.exe` (bandeja),
`/tmp/pe_113086860.exe` (node), `/tmp/orion_payload.bin` (payload completo).
