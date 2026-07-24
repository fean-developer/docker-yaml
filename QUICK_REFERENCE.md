# docker-yaml - Referência Rápida

## 🚀 Instalar

```bash
# Global
npm install -g docker-yaml

# Projeto
npm install docker-yaml

# Verificar
docker-yaml --version
```

---

## 📝 Comandos Essenciais

### Validar Spec

```bash
docker-yaml validate docker.yaml

# Validar service especifico
docker-yaml validate docker.yaml --name node20

# Validar e gerar arquivo
docker-yaml validate docker.yaml --name dotnet8 --out Dockerfile.dotnet8
```

**Saída sucesso**: ✅ Spec válida  
**Saída erro**: ❌ [erro detalhado]

---

### Gerar Dockerfile

```bash
# Exibir no console
docker-yaml generate docker.yaml

# Salvar em arquivo
docker-yaml generate docker.yaml --out Dockerfile

# Gerar service especifico
docker-yaml generate docker.yaml --name node20 --out Dockerfile.node20
```

---

### Ver Ajuda

```bash
docker-yaml --help
docker-yaml validate --help
docker-yaml generate --help
```

---

## 📋 Estrutura Básica do Spec

```yaml
version: 1               # Obrigatório (ou "v1")
from: node:20-alpine     # Obrigatório
arg:                     # Opcional
  KEY: value
workdir: /app            # Opcional
copy:                    # Opcional
  - src: .
    dest: /app
run:                     # Opcional
  - npm install
env:                     # Opcional
  NODE_ENV: production
expose:                  # Opcional
  - 3000
user: node               # Opcional
cmd:                     # Opcional
  - npm
  - start
```

### Modo multi-service

```yaml
version: v1
services:
  - name: dotnet8
    from: mcr.microsoft.com/dotnet/aspnet:8.0-alpine
    entrypoint: ["dotnet", "App.dll"]
  - name: node20
    from: node:20-alpine
    cmd: ["npm", "start"]
```

---

## 🔧 Campos Suportados

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `version` | number | `1` |
| `services` | array | `[{name: "api", from: "node:20"}]` |
| `from` | string | `node:20-alpine` |
| `arg` | object | `{ NODE_ENV: production }` |
| `shell` | array | `["/bin/sh", "-c"]` |
| `workdir` | string | `/app` |
| `copy` | array of objects | `[{src: ".", dest: "/app"}]` |
| `add` | array of objects | `[{src: "file.tar", dest: "/app"}]` |
| `run` | array | `["npm install", "npm build"]` |
| `env` | object | `{ NODE_ENV: production }` |
| `expose` | array | `[3000, 8080]` |
| `label` | object | `{ version: "1.0" }` |
| `volume` | array | `["/data", "/config"]` |
| `user` | string | `node` |
| `healthcheck` | object | `{cmd: "curl ...", interval: "30s"}` |
| `entrypoint` | array | `["node", "server.js"]` |
| `cmd` | array | `["npm", "start"]` |
| `stopsignal` | string | `SIGTERM` |
| `stages` | array | `[{...}, {...}]` |
| `order` | object | `{before: {...}, after: {...}}` |

---

## 🎯 Exemplos Comuns

### Express.js

```yaml
version: 1
from: node:20-alpine
workdir: /app
copy:
  - src: package*.json
    dest: /app/
run:
  - npm ci --production
copy:
  - src: .
    dest: /app
user: node
expose:
  - 3000
cmd:
  - node
  - server.js
```

### Next.js

```yaml
version: 1
from: node:20-alpine as builder
workdir: /app
copy:
  - src: .
    dest: /app
run:
  - npm ci
  - npm run build
---
from: node:20-alpine
workdir: /app
copy:
  - src: "--from=builder /app/node_modules"
    dest: /app/node_modules
  - src: "--from=builder /app/.next"
    dest: /app/.next
copy:
  - src: package.json
    dest: /app
user: node
expose:
  - 3000
cmd:
  - npm
  - start
```

### Python Flask

```yaml
version: 1
from: python:3.11-slim
workdir: /app
copy:
  - src: requirements.txt
    dest: /app/
run:
  - pip install --no-cache-dir -r requirements.txt
copy:
  - src: .
    dest: /app
user: nobody
expose:
  - 5000
env:
  FLASK_APP: app.py
cmd:
  - flask
  - run
  - --host=0.0.0.0
```

---

## 🔒 Boas Práticas

```yaml
# ✅ CORRETO
version: 1
from: node:20-alpine
arg:
  NODE_ENV: production    # OK - não-sensível

run:
  - npm ci --production

user: node

healthcheck:
  cmd: "curl -f http://localhost:3000/health"
  interval: 30s

# ❌ ERRADO
arg:
  NPM_TOKEN: "npm_xxxxx"  # NÃO FAZER! Use --secret
env:
  DB_PASSWORD: "secret"   # NÃO FAZER! Use --secret
```

---

## 🐳 Usar o Dockerfile Gerado

```bash
# 1. Gerar Dockerfile
docker-yaml generate spec.yaml --out Dockerfile

# 2. Build
docker build -t myapp:latest .

# 3. Run
docker run -p 3000:3000 myapp:latest

# 4. Com secrets
docker build \
  --secret npm_token=~/.npmrc \
  -t myapp:latest .
```

---

## 🔍 Validar YAML sem CLI

```bash
# Via Node.js
node -e "
  const { parseAndValidate } = require('docker-yaml');
  const fs = require('fs');
  const yaml = fs.readFileSync('docker.yaml', 'utf8');
  const result = parseAndValidate(yaml);
  console.log(result);
"
```

---

## 🐛 Debug

```bash
# Modo verbose (não suportado)
# Use ferramentas externas:

# Validar YAML com yamllint
yamllint docker.yaml

# Validar Dockerfile com hadolint
hadolint Dockerfile
```

---

## 💻 Programático (TypeScript/JavaScript)

```typescript
import { 
  parse, 
  validate, 
  generate, 
  parseAndValidate 
} from 'docker-yaml';

// 1. Parse + Validate
const yaml = `
version: 1
from: node:20
cmd: npm start
`;

const result = parseAndValidate(yaml);
if (result.valid) {
  console.log('✅ Válido');
} else {
  console.log('❌ Erros:', result.errors);
}

// 2. Gerar Dockerfile
const dockerfile = generate(yaml);
console.log(dockerfile);
```

---

## 📚 Multi-stage

```yaml
version: 1
from: node:20-alpine as builder
workdir: /app
copy:
  - src: .
    dest: /app
run:
  - npm ci
  - npm run build
---
from: node:20-alpine
workdir: /app
copy:
  - src: "--from=builder /app/dist"
    dest: /app/dist
run:
  - npm ci --production
user: node
expose:
  - 3000
cmd:
  - node
  - dist/server.js
```

**Separador**: `---` (YAML document separator)

---

## 🔄 Ordenação Customizada

```yaml
version: 1
from: node:20-alpine

order:
  # Instalar dependências antes de copiar source
  before:
    run: [copy]
    
  # Criar usuário depois de instalar
  after:
    user: [run]

workdir: /app
copy:
  - src: package.json
    dest: /app
run:
  - npm install
user: node
```

---

## ⚙️ Variáveis de Build

```yaml
version: 1
from: node:${NODE_VERSION:-20}-alpine

arg:
  NODE_VERSION: "20"
  BUILD_DATE: "2026-07-24"

label:
  version: "1.0.0"
  build-date: "${BUILD_DATE}"
```

**Build com ARG**:
```bash
docker build \
  --build-arg NODE_VERSION=22 \
  -t myapp:latest .
```

---

## 🎓 Próximas Etapas

1. Ler [README.md](README.md) - Documentação completa
2. Ver [SECURITY.md](SECURITY.md) - Análise de segurança
3. Explorar [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md) - CI/CD
4. Ir para [NPM_PUBLISH.md](NPM_PUBLISH.md) - Publicar package

---

## 📞 Suporte

- **Issues**: GitHub Issues
- **Segurança**: Veja SECURITY.md
- **Documentação**: README.md

---

**Versão**: v0.8.0 | **Última atualização**: 2026-07-24
