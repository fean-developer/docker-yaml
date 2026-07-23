# docker-yaml

Biblioteca e CLI em TypeScript para validar um YAML simples e gerar `Dockerfile`.

## Instalacao

```bash
npm install
```

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