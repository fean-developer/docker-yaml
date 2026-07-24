# Template Variables Guide

Guia completo para usar templates no docker-yaml.

## Visao geral

O docker-yaml suporta placeholders em strings no YAML para evitar duplicacao entre ambientes e servicos.

Sintaxe base:

```yaml
from: node:${NODE_VERSION}
workdir: /app/${SERVICE_NAME}
env:
  APP_ENV: ${APP_ENV}
```

A resolucao acontece antes da validacao e antes da geracao do Dockerfile.

## Fontes de variaveis e precedencia

Precedencia (do menor para o maior):

1. Variaveis de ambiente do shell (`process.env`)
2. Arquivo `.env` no mesmo diretorio do spec
3. Arquivo `.vars` no mesmo diretorio do spec
4. Arquivos passados por `--vars-file` (na ordem informada)
5. Variaveis passadas por `--var CHAVE=valor`

Exemplo:

```bash
docker-yaml generate docker.yaml \
  --vars-file .env.shared \
  --var APP_ENV=production \
  --var NODE_VERSION=22
```

## Sintaxes suportadas

### 1) Variavel simples (Fase 1)

```yaml
from: node:${NODE_VERSION}
```

Regra padrao: se `NODE_VERSION` nao existir, o placeholder e mantido literal.
Isso evita quebrar cenarios Docker que usam `${VAR}` junto de `ARG`/`ENV`.

### 2) Variavel com default (Fase 2)

```yaml
from: node:${NODE_VERSION:-20}-alpine
```

Regra: usa `20` quando a variavel nao estiver definida ou estiver vazia.

### 3) Variavel obrigatoria (Fase 3)

```yaml
env:
  REQUIRED_SECRET: ${REQUIRED_SECRET?REQUIRED_SECRET deve ser informado}
```

Regra: falha com a mensagem informada quando a variavel nao estiver definida ou estiver vazia.

## Modo estrito (API)

Na API, voce pode ativar modo estrito para variaveis simples:

```ts
generate(yaml, {
  strictTemplates: true,
  vars: { NODE_VERSION: "22" }
});
```

Com `strictTemplates: true`, `${VAR}` sem valor passa a gerar erro.

### 4) Escape literal

```yaml
run:
  - echo '$${NODE_VERSION}'
```

Resultado no Dockerfile:

```dockerfile
RUN echo '${NODE_VERSION}'
```

## Opcoes de CLI

### `--var CHAVE=valor`

Pode repetir varias vezes:

```bash
docker-yaml generate docker.yaml --var APP_ENV=prod --var NODE_VERSION=22
```

### `--vars-file arquivo`

Pode repetir varias vezes:

```bash
docker-yaml generate docker.yaml --vars-file .env --vars-file .vars
```

## Onde templates funcionam

Templates funcionam em qualquer campo string do spec, incluindo:

- `from`, `workdir`, `user`, `stopsignal`
- valores de `env`
- strings de `run`
- `copy.src`, `copy.dest`, `copy.chown`
- `add.src`, `add.dest`, `add.chown`
- arrays de `entrypoint` e `cmd`
- `label` e outros textos
- `services` (single-stage e multi-stage)
- `stages`

## Exemplo completo (services + multi-stage)

```yaml
version: v1
services:
  - name: dotnet-api
    stages:
      - from: mcr.microsoft.com/dotnet/sdk:${DOTNET_SDK_VERSION:-8.0}
        workdir: /src
        copy:
          - src: .
            dest: /src
        run:
          - dotnet publish -c ${BUILD_CONFIG:-Release} -o /out
      - from: mcr.microsoft.com/dotnet/aspnet:${DOTNET_RUNTIME_VERSION:-8.0}
        workdir: /app
        copy:
          - src: --from=0 /out
            dest: /app
        entrypoint:
          - dotnet
          - ${APP_DLL?APP_DLL obrigatoria}
```

Comando:

```bash
docker-yaml generate app.yaml --name dotnet-api --var APP_DLL=Api.dll
```

## Erros comuns

### Variavel nao definida

Erro exemplo:

```text
Templates invalidos:
- env.REQUIRED_SECRET: REQUIRED_SECRET deve ser informado
```

### Formato invalido de --var

Erro exemplo:

```text
Formato invalido para --var: APP_ENV. Use CHAVE=valor
```

## Boas praticas

1. Evite secrets em YAML. Prefira BuildKit secrets no build Docker.
2. Use defaults para reduzir parametrizacao repetitiva.
3. Use `${VAR?mensagem}` para campos criticos.
4. Centralize ambiente base em `.env` e overrides por ambiente em `.vars`.
5. Use `--var` para overrides pontuais em CI/CD.
