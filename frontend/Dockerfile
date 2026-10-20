# Baixa uma distribuição Linux que já vem com o runtime do Node.js pronto
FROM node:20-alpine

# Determina que todas as ações seguintes ocorrerão dentro do diretório app
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# O conteiner abrirá internamente a porta 3000
EXPOSE 5173

# Dispara assim que o container iniciar
CMD ["npm", "run", "dev", "--", "--host"]