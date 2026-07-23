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
workdir: /workspace
copy:
  - src: .
    dest: /app
run:
  - npm install
  - npm run build
env:
  NODE_ENV: production
expose:
  - 3000
entrypoint:
  - node
  - server.js
cmd:
  - npm
  - start
```

## Exemplo de saida

```dockerfile
FROM node:22-alpine
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
- `workdir`
- `copy`
- `run`
- `env`
- `expose`
- `entrypoint`
- `cmd`