FROM node:slim

WORKDIR /home/node/bot

COPY . .

RUN npm ci

CMD ["node", "app.js"]

