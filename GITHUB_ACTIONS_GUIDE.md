# Guia Prático: docker-yaml em GitHub Actions

## 📋 Casos de Uso

Este guia mostra como usar `docker-yaml` de forma segura em pipelines do GitHub Actions.

---

## 1️⃣ Gerar Dockerfile e Build de Imagem

### ✅ Workflow Seguro

```yaml
name: Build & Push Docker Image

on:
  push:
    branches:
      - main
    paths:
      - 'specs/app.yaml'
      - '.github/workflows/build-image.yml'
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install docker-yaml
        run: npm install -g docker-yaml

      - name: Validate spec
        run: docker-yaml validate specs/app.yaml

      - name: Generate Dockerfile
        run: docker-yaml generate specs/app.yaml --out Dockerfile

      - name: Verify Dockerfile generated
        run: |
          if [ ! -f Dockerfile ]; then
            echo "❌ Dockerfile not generated"
            exit 1
          fi
          echo "✅ Dockerfile generated successfully"
          head -10 Dockerfile

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name == 'push' }}
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/myapp:${{ github.sha }}
            ${{ secrets.DOCKER_USERNAME }}/myapp:latest
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/myapp:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/myapp:buildcache,mode=max
```

### Arquivo de Spec

```yaml
# specs/app.yaml
version: 1
from: node:20-alpine

arg:
  NODE_ENV: production    # ✅ Não-sensível

shell:
  - /bin/sh
  - -c

workdir: /app

copy:
  - src: package*.json
    dest: /app/

run:
  - npm ci --production

copy:
  - src: .
    dest: /app

expose:
  - 3000

healthcheck:
  cmd: "curl -f http://localhost:3000/health || exit 1"
  interval: 30s
  timeout: 10s
  retries: 3

user: node

entrypoint:
  - node
  - server.js

cmd:
  - --port
  - "3000"
```

---

## 2️⃣ CI/CD com Validação e Testes

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate-docker-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install docker-yaml
        run: npm install -g docker-yaml

      - name: Validate all specs
        run: |
          for spec in specs/*.yaml; do
            echo "Validating $spec..."
            docker-yaml validate "$spec" || exit 1
          done

      - name: Generate all Dockerfiles
        run: |
          mkdir -p build
          for spec in specs/*.yaml; do
            name=$(basename "$spec" .yaml)
            docker-yaml generate "$spec" --out "build/Dockerfile.$name"
            echo "✅ Generated build/Dockerfile.$name"
          done

      - name: Upload Dockerfiles
        uses: actions/upload-artifact@v3
        with:
          name: dockerfiles
          path: build/Dockerfile.*

  test:
    runs-on: ubuntu-latest
    needs: validate-docker-spec
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build app
        run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Download Dockerfiles
        uses: actions/download-artifact@v3
        with:
          name: dockerfiles

      - name: Install Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## 3️⃣ Multi-stage com Secrets Seguros

```yaml
name: Secure Build with Secrets

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-with-secrets:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install docker-yaml
        run: npm install -g docker-yaml

      - name: Generate Dockerfile (sem secrets)
        run: docker-yaml generate specs/production.yaml --out Dockerfile

      - name: Verify no secrets in Dockerfile
        run: |
          if grep -E "PASSWORD|TOKEN|SECRET|API_KEY" Dockerfile; then
            echo "❌ Secrets found in Dockerfile!"
            exit 1
          fi
          echo "✅ No secrets in Dockerfile"

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}

      - name: Build and push with secrets
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          secrets: |
            "npm_token=${{ secrets.NPM_TOKEN }}"
            "db_password=${{ secrets.DB_PASSWORD }}"
          # Dockerfile already generated, uses secrets via --mount
```

### Dockerfile correspondente (gerado via spec.yaml)

```dockerfile
# Versão do Dockerfile que usa BuildKit secrets
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

# Usar secret do npm token
RUN --mount=type=secret,id=npm_token \
    export NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    npm ci

# Copiar source
COPY . .

# Build
RUN npm run build

# Stage final
FROM node:20-alpine

WORKDIR /app

# Copiar apenas dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## 4️⃣ Validação de Spec com Lint

```yaml
name: Spec Validation & Lint

on:
  push:
  pull_request:

jobs:
  validate-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install docker-yaml
        run: npm install -g docker-yaml

      - name: Check spec format
        run: |
          for spec in specs/*.yaml; do
            echo "Checking $spec..."
            
            # Validate with docker-yaml
            docker-yaml validate "$spec" || {
              echo "❌ Invalid spec: $spec"
              exit 1
            }
            
            # Check for hardcoded secrets
            if grep -E "PASSWORD|TOKEN|SECRET|API_KEY.*=" "$spec"; then
              echo "⚠️  Warning: Possible hardcoded secrets in $spec"
            fi
          done
          echo "✅ All specs are valid"

      - name: Generate all Dockerfiles
        run: |
          for spec in specs/*.yaml; do
            name=$(basename "$spec" .yaml)
            docker-yaml generate "$spec" --out "Dockerfile.$name"
            echo "✅ Generated Dockerfile.$name"
          done

      - name: Check Dockerfile syntax
        run: |
          # Instalar hadolint
          sudo apt-get update -qq
          sudo apt-get install -y -qq hadolint
          
          # Verificar sintaxe
          for dockerfile in Dockerfile.*; do
            hadolint "$dockerfile" || true
          done
```

---

## 5️⃣ Deploy com Validation

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Validate spec before deploy
        run: |
          npm install -g docker-yaml
          docker-yaml validate specs/production.yaml

      - name: Generate Dockerfile
        run: docker-yaml generate specs/production.yaml --out Dockerfile

      - name: Verify tag matches version
        run: |
          TAG=${GITHUB_REF#refs/tags/v}
          echo "Deploying version: $TAG"

      - name: Deploy to production
        run: |
          echo "✅ Ready to deploy"
          # Adicionar comandos de deploy aqui
```

---

## 🔒 Segurança: Checklist para Workflows

```yaml
✅ Checklist de Segurança:

[ ] Usar `actions/checkout@v4` (versão fixa)
[ ] Usar `actions/setup-node@v4` (versão fixa)
[ ] Instalar `docker-yaml` via npm -g
[ ] Validar spec YAML antes de gerar
[ ] Verificar que Dockerfile NÃO contém secrets
[ ] Usar --secret flag do Docker para credentials
[ ] Escanear imagem com Trivy
[ ] Usar short-sha tags para identificação
[ ] Fazer deploy apenas em tags ou main
[ ] Ter audit trail de todas as ações
[ ] Restringir permissões (permissions.contents, packages)
[ ] Usar environment protection rules
```

---

## 📊 Exemplo: Estrutura de Repositório

```
docker-yaml-example/
├── .github/
│   └── workflows/
│       ├── build-image.yml
│       ├── ci-pipeline.yml
│       ├── secure-build.yml
│       └── deploy.yml
├── specs/
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
├── src/
│   └── server.ts
├── package.json
└── README.md
```

---

## 🚀 Quick Start

1. **Copie um workflow** para `.github/workflows/`
2. **Crie spec** em `specs/app.yaml`
3. **Commit e push**
4. **Veja GitHub Actions** rodar
5. **Verifique logs** de sucesso/erro

---

## 📚 Referências

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)
- [BuildKit Secrets](https://docs.docker.com/build/building/secrets/)

---

**Versão**: v0.8.0 | **Atualizado**: 2026-07-24
