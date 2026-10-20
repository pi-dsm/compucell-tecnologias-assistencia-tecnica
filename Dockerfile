# Baixa uma distribuição Linux que já vem com o runtime do Node.js pronto
FROM node:20-alpine

# Determina que todas as ações seguintes ocorrerão dentro do diretório app
WORKDIR /app

# O conteiner abrirá internamente a porta 3000
EXPOSE 3000

# Dispara assim que o container iniciar
CMD ["echo", "Aplicação conectada com sucesso!"]