
# Imagem base com Node.js
FROM node:22-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm i

# Copia o restante do projeto
COPY . .

# Porta utilizada pelo backend
EXPOSE 8080

# Inicia a aplicação
CMD ["npm", "start"]
