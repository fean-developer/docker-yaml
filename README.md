# docker-yaml

Biblioteca e CLI em TypeScript para validar um YAML simples e gerar `Dockerfile`.

**Status**: ✅ v0.8.0 - Seguro para produção | [Análise de Segurança](SECURITY.md)

## Instalação

### Como dependência do projeto

```bash
npm install docker-yaml
```

### Instalação global (recomendado para uso em CLI)

```bash
# Instalar globalmente
npm install -g docker-yaml

# Verificar instalação
docker-yaml --help

# Atualizar
npm install -g docker-yaml@latest

# Remover
npm uninstall -g docker-yaml
```

### Requisitos

- Node.js >= 20
- npm >= 10

## CLI

### Validar

```bash
docker-yaml validate docker.yaml
```

### Gerar

```bash
docker-yaml generate docker.yaml
```

### Gerar em arquivo

```bash
docker-yaml generate docker.yaml --out Dockerfile
```

### Versão

```bash
docker-yaml --version
```

## Exemplo de entrada

```yaml
version: 1
from: node:22-alpine
arg:
  NODE_VERSION: 22
  APP_ENV: production
  OPTIONAL_TOKEN: null
workdir: /workspace
copy:
  - src: .
    dest: /app
run:
  - npm install
  - npm run build
env:
  NODE_ENV: production
  ENABLE_FEATURE_X: true
expose:
  ports:
    - 3000
  after: run
entrypoint:
  - node
  - server.js
user: appuser:appgroup
cmd:
  - npm
  - start
```

## Exemplo multi-stage

```yaml
version: 1
stages:
  - from: node:22-alpine
    arg:
      BUILD_MODE: production
    workdir: /app
    copy:
      - src: .
        dest: /app
    run:
      - npm install
      - npm run build
  - from: nginx:alpine
    copy:
      - src: /app/dist
        dest: /usr/share/nginx/html
        chown: nginx:nginx
        afterRun: true
    expose:
      - 80
```

## Exemplo run multiline

```yaml
version: 1
from: node:22-alpine
run: |
  addgroup -S appgroup &&
  adduser -S appuser -G appgroup
```

## Exemplo de ordenacao customizada

```yaml
version: 1
from: node:22-alpine
arg:
  APP_ENV: production
run:
  - npm ci
env:
  NODE_ENV: production
expose:
  ports:
    - 3000
  before: arg
order:
  env:
    after: run
```

## Exemplo com ADD, LABEL e HEALTHCHECK

```yaml
version: 1
from: nginx:latest
label:
  maintainer: user@example.com
  version: "1.0.0"
add:
  - src: https://example.com/app.tar.gz
    dest: /opt/app
run: apt-get update && apt-get install -y curl
expose:
  - 80
  - 443
healthcheck:
  cmd: "curl -f http://localhost/ || exit 1"
  interval: 30s
  timeout: 10s
  retries: 3
```

## Exemplo com SHELL e VOLUME

```yaml
version: 1
from: postgres:15-alpine
shell:
  - /bin/sh
  - -c
volume:
  paths:
    - /var/lib/postgresql/data
    - /var/log/postgresql
env:
  POSTGRES_DB: mydb
  POSTGRES_USER: postgres
```

## Exemplo de saida

```dockerfile
FROM node:22-alpine
ARG NODE_VERSION=22
ARG APP_ENV=production
ARG OPTIONAL_TOKEN
WORKDIR /workspace
COPY . /app
RUN npm install
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["node", "server.js"]
CMD ["npm", "start"]
```

## API

```ts
import { parse, validate, generate } from "docker-yaml";

const parsed = parse(yamlContent);
const result = validate(parsed);

if (result.valid) {
  const dockerfile = generate(yamlContent);
  console.log(dockerfile);
}
```

## Escopo v1

Campos suportados:
- `version`
- `from`
- `shell` (array de comandos para shell)
- `arg`
- `workdir`
- `copy`
  - `chown` (opcional por item)
  - `afterRun` (opcional por item)
- `add`
  - `chown` (opcional por item)
- `run`
  - aceita lista de comandos ou string multiline
- `env`
  - aceita string, numero e boolean
- `expose`
  - aceita lista simples ou objeto `{ ports, before?, after? }`
- `label`
  - objeto key-value para metadados
- `volume`
  - aceita lista simples ou objeto `{ paths }`
- `user`
- `healthcheck`
  - `cmd` (obrigatorio)
  - `interval` (opcional, e.g. "30s")
  - `timeout` (opcional, e.g. "10s")
  - `retries` (opcional)
  - `startPeriod` (opcional, e.g. "40s")
- `entrypoint`
- `cmd`
- `stopsignal`
- `stages` (modo multi-stage basico)
- `order`
  - `before`/`after` para qualquer chave: `arg`, `workdir`, `copy`, `add`, `run`, `env`, `expose`, `label`, `volume`, `user`, `healthcheck`, `entrypoint`, `cmd`, `stopsignal`

## 🔒 Segurança

### ⚠️ Importante: Dados Sensíveis

**NÃO coloque credentials em ARG ou ENV**:

```yaml
# ❌ NÃO FAZER ISSO
version: 1
from: node:22-alpine
arg:
  NPM_TOKEN: "npm_xxxxxxxxxxxxx"
env:
  DATABASE_PASSWORD: "super_secret_password"
```

**Por que**: Valores aparecem no Dockerfile e em `docker history`.

### ✅ Forma Correta: Docker BuildKit Secrets

```bash
# 1. Criar secret
docker build \
  --secret npm_token=$(cat ~/.npmrc) \
  -t myapp:latest .

# 2. Gerar Dockerfile sem credenciais
docker-yaml generate spec.yaml --out Dockerfile
```

```dockerfile
# Dockerfile (gerado - seguro)
FROM node:22-alpine
ARG NODE_ENV=production    # ✅ OK - não sensível
RUN --mount=type=secret,id=npm_token \
    cat /run/secrets/npm_token > ~/.npmrc && \
    npm install && \
    rm ~/.npmrc
```

### Boas Práticas

1. ✅ Use apenas dados **não-sensíveis** em ARG/ENV
2. ✅ Passe credentials via `--secret` do Docker
3. ✅ Verifique [SECURITY.md](SECURITY.md) para análise completa
4. ✅ Escaneie imagens: `trivy image myapp:latest`
5. ✅ Mantenha dependências atualizadas: `npm audit`

---

## 📚 Documentação Adicional

- [SECURITY.md](SECURITY.md) - Análise de segurança detalhada
- [NPM_PUBLISH.md](NPM_PUBLISH.md) - Guia de publicação no npm
- [CHANGELOG.md](CHANGELOG.md) - Histórico de versões

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/sua-feature`
3. Commit suas mudanças: `git commit -m 'feat: adicione feature'`
4. Push para branch: `git push origin feat/sua-feature`
5. Abra um Pull Request

### Executar localmente

```bash
# Clone
git clone https://github.com/seu-usuario/docker-yaml.git
cd docker-yaml

# Instale
npm install

# Desenvolva
npm run dev

# Teste
npm test

# Build
npm run build
```

---

## 📄 Licença

MIT - Veja [LICENSE](LICENSE) para detalhes

---

## 🆘 Suporte

- 📧 Issues: [GitHub Issues](https://github.com/seu-usuario/docker-yaml/issues)
- 🔒 Segurança: Veja [SECURITY.md](SECURITY.md) para reportar vulnerabilidades
- 📖 Documentação: Este README + arquivos .md

---

**Última atualização**: 2026-07-24 | **Versão**: v0.8.0