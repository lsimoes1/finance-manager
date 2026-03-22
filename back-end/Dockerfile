FROM node:20

WORKDIR /app

# Copiar os metadados antes garante o aproveitamento do Cache Layer do Docker
COPY package*.json ./

# Como o better-sqlite3 possui código nativo em C++, o node:20 (Debian) 
# já engloba o python e as ferramentas de build nativas (gcc/make) para compilar.
RUN npm install

# Copia o resto dos arquivos
COPY . .

# Expor a porta onde a API roda
EXPOSE 3000

# Executar servidor Node
CMD ["node", "server.js"]
