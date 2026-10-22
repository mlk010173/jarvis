#!/bin/bash
# Testes ao vivo do motor de tarefas (jarvisTarefas) — v1.3.6
CORE='https://superagent-6e379590.base44.app/functions/jarvisApi'
MOTOR='https://superagent-6e379590.base44.app/functions/jarvisTarefas'
PASS=0; FAIL=0
chk() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 (esperado=$2 obtido=$3)"; fi }
call() {
  for i in 1 2 3 4; do
    R=$(curl -s -m 40 -X POST "$1" -H 'Content-Type: application/json' -d "$2")
    if echo "$R" | grep -q 'Rate limit exceeded'; then sleep 22; else break; fi
  done
  echo "$R"
}

TS=$(date +%s)
R=$(call "$CORE" '{"rota":"/api/conta/cadastro","metodo":"POST","corpo":{"email":"motor.teste'"$TS"'@jarvis.local","nome":"Motor Teste","senha":"SenhaForte123"}}')
T1=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")
[ -n "$T1" ] && chk "cadastro conta de teste" ok ok || chk "cadastro conta de teste" ok falhou
R=$(call "$CORE" '{"rota":"/api/projetos","metodo":"POST","token":"'"$T1"'","corpo":{"nome":"Projeto Motor","assistente":"JARVIS"}}')
PID=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
[ -n "$PID" ] && chk "criacao de projeto" ok ok

sleep 3
# T1 sucesso: plano manual com dependencia
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Ver clima de Vitoria e cotacao do dolar","projeto_id":"'"$PID"'","plano":{"etapas":[{"id":"e1","ferramenta":"clima","args":{"cidade":"Vitória"}},{"id":"e2","ferramenta":"moeda","args":{"de":"USD","para":"BRL"},"depende_de":["e1"]}]}}}')
TID=$(echo "$R" | python3 -c "import sys,json;t=json.load(sys.stdin).get('tarefa',{});print(t.get('id',''))")
chk "criacao de tarefa com plano manual" executando "$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['estado'])")"
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID"'/rodar","metodo":"POST","token":"'"$T1"'"}')
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID"'/rodar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "
import sys,json; t=json.load(sys.stdin)['tarefa']
print(t['estado'], t['plano']['etapas'][0]['status'], t['plano']['etapas'][1]['status'], len(t['passos']), 'Clima' in t['plano']['etapas'][0]['resultado'][:100])")
chk "sucesso com evidencias reais" "concluida concluida concluida 3 True" "$S"

sleep 3
# T2 timeout: limite_ms=1
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Teste de timeout","projeto_id":"'"$PID"'","plano":{"etapas":[{"id":"e1","ferramenta":"pesquisar","args":{"q":"testes"},"limite_ms":1}]}}}')
TID2=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['id'])")
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID2"'/rodar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "
import sys,json; t=json.load(sys.stdin)['tarefa']; e=t['plano']['etapas'][0]
print(t['estado'], e['status'], e['erro'].strip()[:14], e['tentativas'])")
chk "timeout com limite de etapa" "falhou falhou Tempo esgotado 2" "$S"

sleep 3
# T3 falha com recuperacao (SSRF bloqueado, 2 tentativas)
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Abrir endereco interno","projeto_id":"'"$PID"'","plano":{"etapas":[{"id":"e1","ferramenta":"abrir","args":{"url":"http://192.168.0.1/segredo"}}]}}}')
TID3=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['id'])")
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID3"'/rodar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "
import sys,json; t=json.load(sys.stdin)['tarefa']; e=t['plano']['etapas'][0]
print(t['estado'], e['status'], 'https' in e['erro'], e['tentativas'])")
chk "falha honesta com guarda anti-SSRF" "falhou falhou True 2" "$S"

sleep 3
# T4 ferramenta inexistente
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Pular alto","projeto_id":"'"$PID"'","plano":{"etapas":[{"id":"e1","ferramenta":"saltar","args":{}}]}}}')
S=$(echo "$R" | python3 -c "import sys,json;t=json.load(sys.stdin)['tarefa'];print('True' if t['estado']=='falhou' and 'não existe no catálogo' in t['resumo'] else t['resumo'])")
chk "ferramenta fora do catalogo rejeitada" "True" "$S"

sleep 3
# T5 cancelamento com resultado parcial
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Coletar dados","projeto_id":"'"$PID"'","plano":{"etapas":[{"id":"e1","ferramenta":"clima","args":{"cidade":"São Paulo"}},{"id":"e2","ferramenta":"moeda","args":{"de":"EUR","para":"BRL"},"depende_de":["e1"]},{"id":"e3","ferramenta":"wiki","args":{"termo":"Vitória Brasil"},"depende_de":["e2"]},{"id":"e4","ferramenta":"feriados","args":{"ano":"2026"},"depende_de":["e3"]}]}}}')
TID5=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['id'])")
call "$MOTOR" '{"rota":"/api/tarefas/'"$TID5"'/rodar","metodo":"POST","token":"'"$T1"'"}' > /dev/null
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID5"'/cancelar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "
import sys,json; t=json.load(sys.stdin)['tarefa']
est=[e['status'] for e in t['plano']['etapas']]
ok = t['estado']=='cancelada' and len(est)==4 and est.count('cancelada')>=1 and est.count('concluida')>=2 and sum(est.count(x) for x in ['concluida','cancelada','falhou'])==4
print('True' if ok else json.dumps(est))")
chk "cancelamento preserva resultado parcial" "True" "$S"

# T6 aprovacao humana obrigatoria
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Salvar e apagar memoria","projeto_id":"'"$PID"'","plano":{"etapas":[{"id":"e1","ferramenta":"memoria_salvar","args":{"texto":"Fato importante de teste"}},{"id":"e2","ferramenta":"memoria_apagar","args":{},"depende_de":["e1"]}]}}}')
TID6=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['id'])")
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID6"'/rodar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['estado'])")
chk "acao sensivel trava sem aprovacao" "aguardando_aprovacao" "$S"
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID6"'/aprovar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['tarefa']['estado'])")
chk "aprovacao libera execucao" "executando" "$S"
R=$(call "$MOTOR" '{"rota":"/api/tarefas/'"$TID6"'/rodar","metodo":"POST","token":"'"$T1"'"}')
S=$(echo "$R" | python3 -c "
import sys,json; t=json.load(sys.stdin)['tarefa']
print(t['estado'], t['plano']['etapas'][1]['status'])")
chk "apos aprovacao, memoria apagada" "concluida concluida" "$S"

sleep 3
# T7 memoria controlada
call "$MOTOR" '{"rota":"/api/memoria","metodo":"POST","token":"'"$T1"'","corpo":{"texto":"Dado de controle da memoria"}}' > /dev/null
R=$(call "$MOTOR" '{"rota":"/api/memoria","metodo":"GET","token":"'"$T1"'"}')
chk "memoria salva e consultavel" "1" "$(echo "$R" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['itens']))")"
call "$MOTOR" '{"rota":"/api/memoria","metodo":"DELETE","token":"'"$T1"'"}' > /dev/null
R=$(call "$MOTOR" '{"rota":"/api/memoria","metodo":"GET","token":"'"$T1"'"}')
chk "memoria apagavel" "0" "$(echo "$R" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['itens']))")"

sleep 3
# T8 planejador sem IA: falha honesta
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Planeje algo","projeto_id":"'"$PID"'"}}')
S=$(echo "$R" | python3 -c "import sys,json;t=json.load(sys.stdin)['tarefa'];print(t['estado'], 'IA' in t['resumo'])")
chk "sem IA conectada: planejamento falha honesto" "falhou True" "$S"

sleep 3
# T9 fallback entre provedores com chaves falsas
call "$CORE" '{"rota":"/api/conta/ias/openai","metodo":"PUT","token":"'"$T1"'","corpo":{"chave":"sk-fake111111111111"}}' > /dev/null
call "$CORE" '{"rota":"/api/conta/ias/groq","metodo":"PUT","token":"'"$T1"'","corpo":{"chave":"gsk_fake2222222222"}}' > /dev/null
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"POST","token":"'"$T1"'","corpo":{"objetivo":"Planeje algo com IA","projeto_id":"'"$PID"'"}}')
S=$(echo "$R" | python3 -c "
import sys,json;t=json.load(sys.stdin)['tarefa']
seg='sk-' in json.dumps(t) or 'gsk_fake' in json.dumps(t)
print(t['estado'], len(t['falhas'])>=1, seg)")
chk "fallback de provedores no planejador + sem vazamento de chave" "falhou True False" "$S"

sleep 3
# T10 isolamento entre contas
R=$(call "$CORE" '{"rota":"/api/conta/cadastro","metodo":"POST","corpo":{"email":"intruso.teste'"$TS"'@jarvis.local","nome":"Intruso","senha":"SenhaForte123"}}')
T2=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$MOTOR" -H 'Content-Type: application/json' -d '{"rota":"/api/tarefas/'"$TID"'/rodar","metodo":"POST","token":"'"$T2"'"}')
chk "conta alheia recebe 404 na tarefa" "404" "$CODE"
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"GET","token":"'"$T2"'"}')
chk "lista de tarefas isolada por conta" "0" "$(echo "$R" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['tarefas']))")"

sleep 3
# T11 deletar tarefa
call "$MOTOR" '{"rota":"/api/tarefas/'"$TID2"'","metodo":"DELETE","token":"'"$T1"'"}' > /dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$MOTOR" -H 'Content-Type: application/json' -d '{"rota":"/api/tarefas/'"$TID2"'","metodo":"GET","token":"'"$T1"'"}')
chk "tarefa deletada some" "404" "$CODE"

# T12 lista persistida
R=$(call "$MOTOR" '{"rota":"/api/tarefas","metodo":"GET","token":"'"$T1"'"}')
N=$(echo "$R" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['tarefas']))")
[ "$N" -ge 5 ] && chk "historico persistido (5+ tarefas)" ok ok || chk "historico persistido" ok "so $N"

echo "===== RESUMO: $PASS passaram, $FAIL falharam ====="
