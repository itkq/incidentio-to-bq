FROM node:16-bullseye

WORKDIR /app

COPY package* .
RUN npm i

COPY . .
RUN npm run build

CMD [ "node", "dist/index.js" ]
