const PDFDocument = require('pdfkit');
const company = require('../config/company');
const { formatBRL } = require('../utils/money');
const { DEVICE_TYPE_LABELS, PASSCODE_LABELS, METHOD_LABELS } = require('../utils/labels');

const TZ = 'America/Sao_Paulo';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: TZ }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('pt-BR', { timeZone: TZ }) : '—');

function build(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      draw(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function header(doc, title, subtitle) {
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(company.name, { align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  const contact = [company.document && `CNPJ: ${company.document}`, company.phone, company.address].filter(Boolean).join('  |  ');
  if (contact) doc.text(contact, { align: 'center' });
  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(title, { align: 'center' });
  if (subtitle) doc.font('Helvetica').fontSize(9).fillColor('#475569').text(subtitle, { align: 'center' });
}

function section(doc, title) {
  doc.moveDown(0.9);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a8a').text(title.toUpperCase());
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10).fillColor('#0f172a');
}

function row(doc, label, value) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(String(value ?? '—'));
}

function terms(doc, items) {
  doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
  items.forEach((t, i) => doc.text(`${i + 1}. ${t}`, { align: 'justify' }).moveDown(0.25));
}

function signature(doc, label) {
  doc.moveDown(2.5);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text('_____________________________________________', { align: 'center' });
  doc.text(label, { align: 'center' });
}

// ─── Comprovante de entrada (via do cliente) ────────────────────────────────
exports.buildReceipt = (order) =>
  build((doc) => {
    const { customer, device } = order;
    header(doc, `Comprovante de Entrada — OS #${order.service_order_number}`, `Emitido em ${fmtDateTime(order.created_at)}`);

    section(doc, 'Cliente');
    row(doc, 'Nome', customer.name);
    row(doc, 'Telefone', customer.phone);
    row(doc, 'Telefone alternativo', customer.alternative_phone || '—');

    section(doc, 'Aparelho');
    row(doc, 'Tipo', DEVICE_TYPE_LABELS[device.device_type] || device.device_type);
    row(doc, 'Marca / Modelo', `${device.brand} ${device.model}`);

    section(doc, 'Atendimento');
    row(doc, 'Problema detectado', order.reported_issue);
    row(doc, 'Previsão de orçamento', fmtDate(order.estimated_budget_at));
    row(doc, 'Previsão de entrega', fmtDate(order.estimated_delivery_at));
    if (order.is_warranty) doc.fillColor('#b45309').font('Helvetica-Bold').text('Atendimento em garantia (retorno).').fillColor('#0f172a');

    section(doc, 'Termos e condições');
    terms(doc, [
      'O orçamento será informado até a data de previsão acima. O serviço só é executado após a aprovação do cliente.',
      'A previsão de entrega é estimada e pode variar conforme a disponibilidade de peças.',
      'A retirada do aparelho exige a apresentação deste comprovante.',
      'A senha de bloqueio foi informada pelo cliente exclusivamente para testes técnicos e não consta neste comprovante.',
      'A assistência não se responsabiliza por dados, arquivos ou aplicativos. Recomenda-se backup antes do atendimento.',
    ]);

    doc.moveDown(0.4);
    doc.font('Helvetica-BoldOblique').fontSize(9).fillColor('#b91c1c').text(
      `Atenção: conforme a legislação vigente, aparelhos não retirados no prazo de ${company.abandonmentDays} (trinta) dias após a conclusão do serviço ou a notificação do orçamento ficam sujeitos à cobrança de taxa de permanência ou à alienação para cobertura de custos operacionais.`,
      { align: 'justify' }
    );
    signature(doc, 'Assinatura do cliente');
  });

// ─── Termo de garantia (emitido na entrega) ─────────────────────────────────
exports.buildWarranty = (order) =>
  build((doc) => {
    const { customer, device } = order;
    header(doc, `Termo de Garantia — OS #${order.service_order_number}`, `Entrega em ${fmtDateTime(order.delivered_at)}`);

    section(doc, 'Cliente e aparelho');
    row(doc, 'Cliente', customer.name);
    row(doc, 'Aparelho', `${DEVICE_TYPE_LABELS[device.device_type] || ''} ${device.brand} ${device.model}`.trim());

    section(doc, 'Serviço executado');
    row(doc, 'Problema atendido', order.reported_issue);
    if (order.no_parts_used || order.parts_used.length === 0) {
      doc.text('Nenhuma peça foi substituída.');
    } else {
      order.parts_used.forEach((p) => {
        const w = p.warranty_days ? ` — garantia da peça: ${p.warranty_days} dia(s)` : '';
        doc.text(`• ${p.quantity}x ${p.description}${w}`);
      });
    }
    if (order.labor_amount > 0) row(doc, 'Mão de obra', formatBRL(order.labor_amount));

    section(doc, 'Pagamento');
    row(doc, 'Valor do serviço', order.is_warranty ? 'Sem cobrança (garantia)' : formatBRL(order.grand_total_amount));
    if (order.discount_amount > 0) row(doc, 'Desconto aplicado', formatBRL(order.discount_amount));
    order.payments
      .filter((p) => p.payment_status === 'paid')
      .forEach((p) => doc.text(`• ${METHOD_LABELS[p.payment_method] || p.payment_method}: ${formatBRL(p.amount)} em ${fmtDate(p.paid_at)}`));
    if (order.balance_due > 0) {
      doc.fillColor('#b91c1c').font('Helvetica-Bold').text(`Saldo pendente: ${formatBRL(order.balance_due)}`).fillColor('#0f172a').font('Helvetica');
    }

    section(doc, 'Garantia');
    if (order.warranty_days > 0) {
      row(doc, 'Prazo', `${order.warranty_days} dia(s) a partir da entrega`);
      row(doc, 'Válida até', fmtDate(order.warranty_until));
    } else {
      doc.text('Este serviço foi entregue sem prazo de garantia adicional.');
    }

    section(doc, 'Condições de garantia');
    terms(doc, [
      'A garantia cobre exclusivamente o defeito reparado e as peças substituídas nesta OS.',
      'A garantia perde a validade em caso de mau uso, quedas, contato com líquidos, violação de lacres ou reparo por terceiros.',
      'Para acionar a garantia, apresente este termo ou informe o número da OS.',
      'Este termo é um modelo padrão e deve ser revisado pela assessoria jurídica da empresa.',
    ]);
    signature(doc, 'Assinatura do cliente');
  });