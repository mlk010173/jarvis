"use strict";
// Testes do módulo de log de execução (v1.3.5) — roda com: node --test tests/web/exec-log.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../../jarvis/web/exec-log.js'), 'utf8'), { filename: 'exec-log.js' });
const EX = globalThis.JARVIS_EXEC;

test('sanitização: nenhum segredo sobrevive', () => {
  assert.equal(EX.limpaSegredo('chave sk-abc123def456 vazou'), 'chave [removido] vazou');
  assert.ok(!EX.limpaSegredo('Incorrect API key provided: sk-fake1********************ESTE.').includes('sk-fake1')); // eco mascarado também sai
  assert.equal(EX.limpaSegredo('nvapi-Ab12Cd34Ef56 aqui'), '[removido] aqui');
  assert.equal(EX.limpaSegredo('Bearer eyJhbGciOi.abc'), '[removido]');
  assert.equal(EX.limpaSegredo('AIzaSyA1234567890xyz no meio'), '[removido] no meio');
  assert.equal(EX.limpaSegredo('gsk_abc123456 tail'), '[removido] tail');
});

test('mergePassos: sem duplicações, ordem por sequência, versão mais recente vence', () => {
  const a = [{ step_id: 'e-1', sequencia: 1, estado: 'executando' }, { step_id: 'e-2', sequencia: 2, estado: 'executando' }];
  const b = [{ step_id: 'e-2', sequencia: 2, estado: 'concluida', fim: '2026-10-22T02:00:00Z' }, { step_id: 'e-1', sequencia: 1, estado: 'concluida', fim: '2026-10-22T01:59:59Z' }];
  const r = EX.mergePassos(a, b);
  assert.equal(r.length, 2);
  assert.equal(r[0].step_id, 'e-1'); assert.equal(r[1].step_id, 'e-2');
  assert.equal(r[1].estado, 'concluida');
  assert.equal(EX.mergePassos(null, null).length, 0);
});

test('somaTokens: null quando o provedor não informa, soma quando informa', () => {
  const sem = { passos: [{ tipo: 'modelo', estado: 'concluida', tokens_entrada: null, tokens_saida: null }] };
  assert.equal(EX.somaTokens(sem).entrada, null); assert.equal(EX.somaTokens(sem).saida, null);
  const com = { passos: [
    { tipo: 'modelo', estado: 'concluida', tokens_entrada: 120, tokens_saida: 80 },
    { tipo: 'modelo', estado: 'concluida', tokens_entrada: 100, tokens_saida: null },
    { tipo: 'modelo', estado: 'falhou', tokens_entrada: 999 },
    { tipo: 'ferramenta', estado: 'concluida', tokens_entrada: 5 },
  ] };
  assert.equal(EX.somaTokens(com).entrada, 220); assert.equal(EX.somaTokens(com).saida, 80);
  assert.equal(EX.somaTokens({}).entrada, null);
});

test('estados e tipos do painel', () => {
  assert.deepEqual(Object.keys(EX.STATUS).sort(), ['cancelado', 'concluido', 'em_andamento', 'falhou', 'parcial']);
  assert.equal(EX.STATUS.falhou.cls, 'st-erro');
  assert.equal(EX.TIPOS.modelo, 'Modelo');
  assert.ok(EX.durFmt(500).includes('ms'));
  assert.ok(EX.durFmt(2300).includes('s'));
});
