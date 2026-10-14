// Dados da empresa usados nos comprovantes (PDF). Lidos do .env.
module.exports = {
  name: process.env.COMPANY_NAME || 'Compucell Tecnologias',
  document: process.env.COMPANY_DOCUMENT || '',
  phone: process.env.COMPANY_PHONE || '',
  address: process.env.COMPANY_ADDRESS || '',
  defaultWarrantyDays: Number(process.env.DEFAULT_WARRANTY_DAYS) || 90,
  abandonmentDays: 30,
};