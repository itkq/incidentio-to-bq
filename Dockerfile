FROM node:16-bullseye
ENV NODE_ENV=production

WORKDIR /app

COPY package* .
RUN npm i

COPY . .
RUN npm run build

CMD [ "node", "dist/index.js" ]
