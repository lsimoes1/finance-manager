# Estágio 1: Build Angular (Compilação pesada)
FROM node:20 AS build
WORKDIR /app

# Copia arquivos de configuração base para otimizar cache
COPY package*.json ./
RUN npm install

# Copia o código fonte do Angular e realiza o Build Produtivo
COPY . .
RUN npm run build --configuration=production

# Estágio 2: Serve Nginx (Servidor Web Leve)
FROM nginx:alpine

# Remove página default do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os arquivos gerados no Stage 1 (Angular v17+ gera arquivos dentro de browser/)
COPY --from=build /app/dist/finance-manager/browser /usr/share/nginx/html

# Copia a configuração personalizada de roteamento (Evita erro 404 em Angular)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
