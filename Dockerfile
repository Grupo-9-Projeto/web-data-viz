FROM node:20-alpine

ENV NODE_ENV=production \
    AMBIENTE_PROCESSO=producao \
    APP_HOST=0.0.0.0 \
    APP_PORT=8080 \
    DB_HOST=argos-db \
    DB_PORT=3306 \
    DB_DATABASE=argos_db \
    JWT_EXPIRES=2h

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]