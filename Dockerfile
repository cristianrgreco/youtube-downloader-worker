FROM node:carbon

WORKDIR /usr/src/app

COPY . .

RUN yarn

CMD ["yarn", "start"]
