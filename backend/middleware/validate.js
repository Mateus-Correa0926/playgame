// backend/middleware/validate.js
// Centralised input validation + sanitisation using express-validator
const { body, param, query, validationResult } = require('express-validator');

// Run validation and return 400 on errors
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// Reusable chains
const trimStr = (field, label, max = 255) =>
  body(field).trim().notEmpty().withMessage(`${label} é obrigatório.`).isLength({ max }).withMessage(`${label} deve ter no máximo ${max} caracteres.`);

const optStr = (field, max = 255) =>
  body(field).optional({ values: 'falsy' }).trim().isLength({ max }).withMessage(`Máximo de ${max} caracteres.`);

const safeText = (field, max = 2000) =>
  body(field).optional({ values: 'falsy' }).trim().isLength({ max })
    .customSanitizer(v => v ? v.replace(/<[^>]*>/g, '') : v);

const safeTextReq = (field, label, max = 2000) =>
  body(field).trim().notEmpty().withMessage(`${label} é obrigatório.`)
    .isLength({ max }).withMessage(`${label} deve ter no máximo ${max} caracteres.`)
    .customSanitizer(v => v.replace(/<[^>]*>/g, ''));

const email = () =>
  body('email').trim().isEmail().withMessage('E-mail inválido.').normalizeEmail();

const password = (min = 8) =>
  body('password').isLength({ min }).withMessage(`Senha deve ter pelo menos ${min} caracteres.`)
    .matches(/[A-Z]/).withMessage('Senha deve conter ao menos uma letra maiúscula.')
    .matches(/[a-z]/).withMessage('Senha deve conter ao menos uma letra minúscula.')
    .matches(/\d/).withMessage('Senha deve conter ao menos um número.');

const newPassword = (field = 'new_password', min = 8) =>
  body(field).isLength({ min }).withMessage(`Senha deve ter pelo menos ${min} caracteres.`)
    .matches(/[A-Z]/).withMessage('Senha deve conter ao menos uma letra maiúscula.')
    .matches(/[a-z]/).withMessage('Senha deve conter ao menos uma letra minúscula.')
    .matches(/\d/).withMessage('Senha deve conter ao menos um número.');

const intId = (field = 'id') =>
  param(field).isInt({ min: 1 }).withMessage('ID inválido.');

const optionalDate = (field) =>
  body(field).optional({ values: 'falsy' }).isISO8601().withMessage('Data inválida.');

const requiredDate = (field, label) =>
  body(field).notEmpty().withMessage(`${label} é obrigatório.`).isISO8601().withMessage(`${label} inválida.`);

const cpf = () =>
  body('cpf').optional({ values: 'falsy' }).trim().matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).withMessage('CPF no formato 000.000.000-00.');

const phone = (field = 'phone') =>
  body(field).optional({ values: 'falsy' }).trim().isLength({ min: 8, max: 20 }).withMessage('Telefone inválido.');

const posNum = (field, label) =>
  body(field).optional().isFloat({ min: 0 }).withMessage(`${label} deve ser um valor positivo.`);

const posInt = (field, label) =>
  body(field).optional().isInt({ min: 1 }).withMessage(`${label} deve ser um número inteiro positivo.`);

// ── Specific route validators ──

const registerRules = [
  trimStr('name', 'Nome', 150),
  email(),
  password(),
  phone(),
  body('role').isIn(['organizador', 'atleta']).withMessage('Perfil deve ser organizador ou atleta.'),
  handleValidation
];

const loginRules = [
  email(),
  body('password').notEmpty().withMessage('Senha é obrigatória.'),
  handleValidation
];

const updateProfileRules = [
  optStr('name', 150),
  phone(),
  safeText('bio', 500),
  cpf(),
  optionalDate('birth_date'),
  optStr('gender', 20),
  optStr('city', 100),
  optStr('state', 50),
  optStr('shirt_size', 5),
  handleValidation
];

const changePasswordRules = [
  body('current_password').notEmpty().withMessage('Senha atual é obrigatória.'),
  newPassword(),
  handleValidation
];

const createEventRules = [
  body('arena_id').isInt({ min: 1 }).withMessage('Arena é obrigatória.'),
  trimStr('title', 'Título', 200),
  body('modality').notEmpty().withMessage('Modalidade é obrigatória.'),
  requiredDate('event_date', 'Data do evento'),
  body('start_time').notEmpty().withMessage('Horário de início é obrigatório.'),
  optStr('end_time', 10),
  posNum('registration_fee', 'Taxa de inscrição'),
  posInt('participant_limit', 'Limite de participantes'),
  safeText('rules', 5000),
  safeText('description', 5000),
  handleValidation
];

const updateEventRules = [
  intId('id'),
  optStr('title', 200),
  safeText('rules', 5000),
  safeText('description', 5000),
  posNum('registration_fee', 'Taxa'),
  posInt('participant_limit', 'Limite'),
  handleValidation
];

const commentRules = [
  intId('id'),
  safeTextReq('message', 'Mensagem', 2000),
  handleValidation
];

const registrationRules = [
  body('event_id').isInt({ min: 1 }).withMessage('ID do evento é obrigatório.'),
  optStr('partner_name', 150),
  body('partner_email').optional({ values: 'falsy' }).isEmail().withMessage('E-mail do parceiro inválido.').normalizeEmail(),
  optStr('partner_phone', 20),
  optStr('team_name', 150),
  safeText('notes', 500),
  handleValidation
];

const pixKeyRules = [
  intId('id'),
  trimStr('pix_key', 'Chave PIX', 255),
  handleValidation
];

// ── Param-only validators ──

const paramId = [intId('id'), handleValidation];
const paramRegId = [param('regId').isInt({ min: 1 }).withMessage('ID de inscrição inválido.'), handleValidation];
const paramEventId = [param('eventId').isInt({ min: 1 }).withMessage('ID do evento inválido.'), handleValidation];

const rejectRules = [
  param('regId').isInt({ min: 1 }).withMessage('ID de inscrição inválido.'),
  safeText('reason', 500),
  handleValidation
];

const updateRegistrationRules = [
  intId('id'),
  optStr('partner_name', 150),
  body('partner_email').optional({ values: 'falsy' }).isEmail().withMessage('E-mail do parceiro inválido.').normalizeEmail(),
  optStr('partner_phone', 20),
  optStr('team_name', 150),
  safeText('notes', 500),
  handleValidation
];

const searchQuery = [
  query('q').optional().trim().isLength({ max: 100 }).withMessage('Busca muito longa.'),
  query('modality').optional().trim().isLength({ max: 50 }),
  query('city').optional().trim().isLength({ max: 100 }),
  query('status').optional().trim().isIn(['aberto', 'confirmado', 'finalizado', 'cancelado']).withMessage('Status inválido.'),
  handleValidation
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  createEventRules,
  updateEventRules,
  commentRules,
  registrationRules,
  pixKeyRules,
  paramId,
  paramRegId,
  paramEventId,
  rejectRules,
  updateRegistrationRules,
  searchQuery,
  intId,
  safeText,
  safeTextReq,
  optStr,
  trimStr,
  posNum
};
