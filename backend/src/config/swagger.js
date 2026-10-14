module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'API Compucell Tecnologias',
    version: '2.0.0',
    description: 'Gestão de assistência técnica, vendas e estoque.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Autentica o usuário e retorna o token JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Token e usuário' }, 401: { description: 'Credenciais inválidas' } },
      },
    },
  },
};