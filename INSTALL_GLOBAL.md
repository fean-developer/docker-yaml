# Guia de Instalação Global - docker-yaml

## 🚀 Instalação Rápida

```bash
# Instalar globalmente
npm install -g docker-yaml

# Verificar
docker-yaml --help
```

---

## 📋 Pré-requisitos

### Verificar Node.js

```bash
# Verificar versão (requer >= 20)
node --version

# Se não tiver Node.js, instalar em:
# https://nodejs.org/ (LTS recomendado)
```

### Verificar npm

```bash
# Verificar versão (requer >= 10)
npm --version

# Atualizar npm se necessário
npm install -g npm@latest
```

---

## 🔧 Instalação por Sistema Operacional

### macOS (Homebrew)

```bash
# Opção 1: Via Homebrew (se tiver Node.js instalado)
brew install node
npm install -g docker-yaml

# Opção 2: Direto via npm
npm install -g docker-yaml

# Verificar instalação
which docker-yaml
```

### Linux (Ubuntu/Debian)

```bash
# 1. Instalar Node.js (se não tiver)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar docker-yaml
npm install -g docker-yaml

# 3. Verificar
docker-yaml --version
```

### Linux (Fedora/RHEL)

```bash
# 1. Instalar Node.js
sudo dnf install nodejs npm

# 2. Instalar docker-yaml
npm install -g docker-yaml

# 3. Verificar
docker-yaml --version
```

### Windows (PowerShell)

```powershell
# 1. Instalar Node.js
# Baixar de: https://nodejs.org/

# 2. Instalar docker-yaml (após reiniciar)
npm install -g docker-yaml

# 3. Verificar
docker-yaml --help
```

### Windows (WSL2)

```bash
# 1. Instalar Node.js no WSL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar docker-yaml
npm install -g docker-yaml

# 3. Verificar
docker-yaml --version
```

---

## 📍 Localização do Executável

```bash
# Encontrar onde foi instalado
which docker-yaml          # macOS/Linux
where docker-yaml         # Windows

# Típicas localizações:
# macOS:  /usr/local/bin/docker-yaml
# Linux:  ~/.npm/_global/bin/docker-yaml  ou  /usr/local/bin/docker-yaml
# Windows: %APPDATA%\npm\docker-yaml.cmd
```

---

## 🔄 Gerenciar Versões

### Listar versões disponíveis

```bash
npm view docker-yaml versions
```

### Instalar versão específica

```bash
# Versão exata
npm install -g docker-yaml@0.8.0

# Última versão
npm install -g docker-yaml@latest

# Próxima maior (se 0.8.0, instala 1.x.x)
npm install -g docker-yaml@next
```

### Atualizar para versão mais recente

```bash
npm install -g docker-yaml@latest
```

### Ver versão instalada

```bash
docker-yaml --version
# ou
npm list -g docker-yaml
```

---

## 🗑️ Desinstalar

```bash
npm uninstall -g docker-yaml

# Verificar que foi removido
docker-yaml --help   # Deve retornar "command not found"
```

---

## 🧪 Teste de Instalação

### 1. Criar arquivo de spec

```bash
# Criar arquivo de teste
mkdir -p ~/docker-yaml-test
cd ~/docker-yaml-test

# Criar spec.yaml
cat > spec.yaml << 'EOF'
version: 1
from: node:20-alpine
run: echo "Hello from docker-yaml"
cmd:
  - npm
  - start
EOF
```

### 2. Validar

```bash
docker-yaml validate spec.yaml
# Saída esperada: "Spec valida"
```

### 3. Gerar Dockerfile

```bash
docker-yaml generate spec.yaml

# Saída esperada:
# FROM node:20-alpine
# RUN echo "Hello from docker-yaml"
# CMD ["npm", "start"]
```

### 4. Gerar em arquivo

```bash
docker-yaml generate spec.yaml --out Dockerfile

# Verificar
cat Dockerfile
```

---

## 🔐 Verificação de Segurança

```bash
# Verificar que está instalado globalmente
npm list -g docker-yaml --depth=0

# Verificar versão
docker-yaml --version

# Verificar integridade
npm view docker-yaml version

# Se versões não batem, atualizar
npm install -g docker-yaml@latest
```

---

## 🚨 Troubleshooting

### Erro: "docker-yaml: command not found"

```bash
# Cause: PATH não inclui npm global bin

# Solução 1: Verificar instalação
npm list -g docker-yaml

# Solução 2: Adicionar ao PATH (macOS/Linux)
export PATH=$PATH:~/.npm/_global/bin
# ou
export PATH=$PATH:/usr/local/bin

# Solução 3: Reinstalar
npm uninstall -g docker-yaml
npm install -g docker-yaml

# Solução 4: Usar npx (não recomendado)
npx docker-yaml@latest --help
```

### Erro: "Permission denied"

```bash
# Solução 1: Usar sudo (não recomendado)
sudo npm install -g docker-yaml

# Solução 2: Configurar npm para usar local (recomendado)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Depois:
npm install -g docker-yaml
```

### Erro: "EACCES: permission denied"

```bash
# Solução: Mudar permissões
sudo chown -R $(whoami) ~/.npm
npm install -g docker-yaml
```

### Versão incorreta após atualização

```bash
# Limpar cache
npm cache clean --force

# Desinstalar
npm uninstall -g docker-yaml

# Reinstalar
npm install -g docker-yaml@latest
```

---

## 📝 Alias (opcional)

### Criar alias curto

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
alias dy="docker-yaml"

# Usar
dy validate spec.yaml
dy generate spec.yaml --out Dockerfile
```

---

## 🌍 Integração com Projetos

### Usar com Docker

```bash
# Em um Dockerfile
FROM node:20-alpine

RUN npm install -g docker-yaml

WORKDIR /app
COPY . .

# Gerar Dockerfile durante build
RUN docker-yaml validate specs/app.yaml && \
    docker-yaml generate specs/app.yaml --out Dockerfile.generated
```

### Usar em Scripts

```bash
#!/bin/bash

# script.sh

set -e  # Exit on error

echo "🔍 Validating Docker specs..."
docker-yaml validate specs/app.yaml

echo "📝 Generating Dockerfile..."
docker-yaml generate specs/app.yaml --out Dockerfile

echo "🐳 Building image..."
docker build -t myapp:latest .

echo "✅ Done!"
```

```bash
chmod +x script.sh
./script.sh
```

---

## 📦 Usar sem Instalação Global (npx)

```bash
# Não precisa instalar
npx docker-yaml validate spec.yaml
npx docker-yaml generate spec.yaml --out Dockerfile

# Nota: Mais lento (baixa sempre)
```

---

## 🔗 Links Úteis

- [npm docker-yaml](https://www.npmjs.com/package/docker-yaml)
- [GitHub Repository](https://github.com/fean-developer/docker-yaml)
- [Node.js Download](https://nodejs.org/)
- [npm Docs](https://docs.npmjs.com/)

---

## 📚 Próximos Passos

1. **Criar spec YAML** - Veja [README.md](README.md)
2. **Validar spec** - `docker-yaml validate`
3. **Gerar Dockerfile** - `docker-yaml generate`
4. **Build imagem** - `docker build`
5. **Usar em CI/CD** - Veja [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md)

---

## ❓ FAQ

**P: Qual versão de Node.js preciso?**  
R: Node.js >= 20

**P: Posso usar npm < 10?**  
R: Não é testado, recomenda-se npm >= 10

**P: Funciona offline?**  
R: Sim, após instalação

**P: Quanto espaço usa?**  
R: ~50MB (npm dependencies)

**P: É seguro instalar globalmente?**  
R: Sim, nenhuma permissão elevada requerida

**P: Como desinstalar?**  
R: `npm uninstall -g docker-yaml`

---

**Última atualização**: 2026-07-24 | **Versão**: v0.8.0
