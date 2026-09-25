# Guia de Instalação e Implantação na VPS (Déio Informática)

Este projeto está 100% preparado para ser executado na sua VPS Linux (Ubuntu, Debian, CentOS, Rocky Linux ou qualquer servidor Linux com Node.js).

Com o banco de dados **SQLite persistente integrado**, todos os seus atalhos, links, chats, estatísticas e preferências de temas (Dia e Noite) ficam salvos no servidor da VPS. Dessa forma, você pode cadastrar atalhos no trabalho e encontrá-los exatamente iguais quando fizer login em casa ou no celular!

---

## 🚀 Requisitos do Servidor (VPS)

- **Node.js**: Versão 20 ou 22+ (recomendado Node 22 com SQLite nativo integrado)
- **Git**
- **PM2** (gerenciador de processos para manter a aplicação rodando 24/7)
- **Nginx** (opcional, para usar seu domínio com SSL HTTPS)

---

## 🛠️ Passo a Passo de Instalação

### 1. Clonar ou Enviar os Arquivos para a VPS
No terminal da sua VPS:

```bash
mkdir -p /var/www/deio-hub
cd /var/www/deio-hub

# Copie os arquivos do projeto para esta pasta
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Compilar a Aplicação Frontend
```bash
npm run build
```

### 4. Executar em Produção com PM2 (Recomendado)
Instale o PM2 globalmente (caso ainda não tenha):
```bash
npm install -g pm2
```

Inicie o servidor full-stack:
```bash
pm2 start server.ts --name "deio-hub" --interpreter ./node_modules/.bin/tsx
```

Para garantir que o servidor reinicie automaticamente se a VPS for reinicializada:
```bash
pm2 save
pm2 startup
```

---

## 💾 Banco de Dados Persistente

O banco de dados SQLite é criado e gerenciado automaticamente na pasta:
```
/var/www/deio-hub/data/deio.sqlite
```

- **Zero configuração**: você não precisa instalar MySQL ou PostgreSQL. O SQLite é embutido e de altíssimo desempenho com WAL mode ativado.
- **Backup simplificado**: para fazer backup de todo o sistema (usuários, senhas criptografadas, atalhos, conversas do chat e estatísticas), basta copiar o arquivo `data/deio.sqlite`.

---

## 🌐 Configuração do Domínio e Nginx com SSL (Opcional)

Se você possui um domínio apontado para o IP da sua VPS, crie um arquivo de configuração no Nginx:

```bash
sudo nano /etc/nginx/sites-available/deio-hub
```

Conteúdo recomendado:
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative o site e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/deio-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Para gerar certificado SSL grátis (HTTPS):
```bash
sudo certbot --nginx -d seu-dominio.com.br
```

---

## 🔐 Contas Padrão e Permissões

- **Master Admin**:
  - Email: `deiorbo@gmail.com`
  - Senha padrão: `Deio@2409`
  - Permissões: Acesso exclusivo aos menus **Estatísticas & Cliques** e **Usuários** (Adicionar, Editar e Excluir), além de poder gerenciar e definir os dashboards públicos.
- **Usuários Comuns / Técnicos**:
  - Possuem sua própria **Área de Trabalho** com seus atalhos privados persistidos no banco de dados.
  - Podem usar o **Chat Corporativo** em tempo real com upload de arquivos e reações.
  - Podem personalizar seus fundos de tela para **Tema Dia (Modo Claro)** e **Tema Noite (Modo Escuro)**, além de alterar o apelido de exibição.
  - Não têm acesso aos menus de Estatísticas nem de Usuários.

---

## 🔄 Como Atualizar a Aplicação na VPS

Quando fizer alterações no código:
```bash
cd /var/www/deio-hub
npm install
npm run build
pm2 restart deio-hub
```
O banco de dados em `./data/deio.sqlite` continuará intacto durante qualquer atualização.
