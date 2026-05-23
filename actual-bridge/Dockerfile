FROM node:20

WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production --loglevel verbose

COPY index.js .
COPY setup-categories.js .

EXPOSE 3788

CMD ["node", "index.js"]
