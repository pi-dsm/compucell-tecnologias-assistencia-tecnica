const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
// lucro = valor_venda - custo
const calcProfit = (venda, custo) => round2((Number(venda) || 0) - (Number(custo) || 0));

module.exports = { round2, formatBRL, calcProfit };