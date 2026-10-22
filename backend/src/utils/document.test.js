const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidCpf, isValidCnpj, isValidDocument } = require('./document');

test('CPF: aceita válido e rejeita inválido/sequência repetida', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('529.982.247-26'), false);
  assert.equal(isValidCpf('111.111.111-11'), false);
});

test('CNPJ: aceita válido e rejeita dígito errado', () => {
  assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(isValidCnpj('11.222.333/0001-82'), false);
  assert.equal(isValidDocument('45678912000155'), true);
});