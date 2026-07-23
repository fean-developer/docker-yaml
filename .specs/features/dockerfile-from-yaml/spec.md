# Feature Spec: Geracao de Dockerfile a partir de YAML

## Contexto
Esta feature define o comportamento da biblioteca `docker-yaml` para:
- validar um arquivo YAML conforme schema v1;
- gerar um `Dockerfile` equivalente.

## Exemplo de Entrada (Referencia)
```yaml
version: 1
from: node:22-alpine
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
cmd:
  - npm
  - start
```

## Exemplo de Saida Esperada (Referencia)
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . /app
RUN npm install
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

## Requisitos Funcionais

### RF-001 - Leitura de arquivo YAML
O sistema deve aceitar caminho de arquivo YAML e carregar seu conteudo para processamento.

### RF-002 - Validacao de schema v1
O sistema deve validar obrigatoriedade, tipo e formato dos campos suportados na versao `1`.

### RF-003 - Campo `version`
O campo `version` deve ser obrigatorio e aceitar apenas valor inteiro `1` na v1.

### RF-004 - Campo `from`
O campo `from` deve ser obrigatorio e gerar instrucao `FROM <image>`.

### RF-005 - Campo `copy`
`copy` deve aceitar lista de objetos com `src` e `dest` obrigatorios (strings nao vazias).
Cada item deve gerar `COPY <src> <dest>`.

### RF-006 - Campo `run`
`run` deve aceitar lista de strings nao vazias.
Cada item deve gerar uma linha `RUN <command>` em ordem.

### RF-007 - Campo `env`
`env` deve aceitar mapa `chave: valor` com chaves nao vazias.
Cada par deve gerar `ENV CHAVE=valor`.

### RF-008 - Campo `expose`
`expose` deve aceitar lista de portas inteiras validas (1-65535).
Cada item deve gerar `EXPOSE <porta>`.

### RF-009 - Campo `cmd`
`cmd` deve aceitar lista de strings representando o comando em exec form.
Deve gerar `CMD ["arg1", "arg2", ...]`.

### RF-010 - Definicao de `WORKDIR`
Quando existir ao menos um `copy.dest` absoluto (ex.: `/app`), o sistema deve definir `WORKDIR` com o primeiro `dest` antes de `COPY`.

### RF-011 - Comando CLI `validate`
`docker-yaml validate <arquivo>` deve:
- validar schema;
- retornar saida amigavel;
- retornar codigo `0` se valido e `1` se invalido.

### RF-012 - Comando CLI `generate`
`docker-yaml generate <arquivo>` deve:
- validar antes de gerar;
- imprimir `Dockerfile` em stdout quando valido;
- retornar codigo `1` em caso de erro.

### RF-013 - API programatica
A biblioteca deve expor funcoes para `parse`, `validate` e `generate` para consumo via codigo TypeScript.

### RF-014 - Ordenacao deterministica
A ordem de emissao no `Dockerfile` v1 deve ser:
`FROM`, `WORKDIR` (quando aplicavel), `COPY*`, `RUN*`, `ENV*`, `EXPOSE*`, `CMD`.

## Requisitos Nao Funcionais

### RNF-001 - Mensagens de erro claras
Erros devem informar campo e causa (ex.: `expose[0] deve estar entre 1 e 65535`).

### RNF-002 - Determinismo
Duas entradas YAML semanticamente iguais devem produzir exatamente a mesma saida.

### RNF-003 - Portabilidade
Implementacao deve rodar em Node.js LTS atual.

### RNF-004 - Testabilidade
Componentes devem ser isolaveis para testes unitarios e de integracao da CLI.

## Regras de Validacao (v1)
- Campos obrigatorios: `version`, `from`.
- Campos opcionais: `copy`, `run`, `env`, `expose`, `cmd`.
- Campos desconhecidos devem resultar em erro de validacao na v1.

## Extensoes Planejadas (Passo 2)

### EP-001 - Suporte a `entrypoint`
- Novo campo opcional `entrypoint: string[]`.
- Geracao esperada: `ENTRYPOINT ["arg1", "arg2", ...]`.

### EP-002 - Suporte a `workdir` explicito
- Novo campo opcional `workdir: string`.
- Regra de prioridade:
  - se `workdir` existir, usar esse valor;
  - senao, manter inferencia pelo primeiro `copy.dest` absoluto.

### EP-003 - Suporte a output em arquivo
- CLI `generate` com flag opcional `--out <caminho>`.
- Sem `--out`: stdout (comportamento atual).
- Com `--out`: gravar arquivo de destino.

### EP-004 - Suporte inicial a multi-stage
- Novo campo opcional `stages` (lista), mantendo compatibilidade com schema simples atual.
- Cada stage deve ter ao menos `from` e blocos equivalentes (`copy`, `run`, etc.).
- v1.1: sem recursos avancados de target/build args cruzados.

## Criterios de Aceitacao

### CA-001
Dado o YAML do exemplo, `docker-yaml validate docker.yaml` retorna sucesso (exit code 0).

### CA-002
Dado o YAML do exemplo, `docker-yaml generate docker.yaml` produz o Dockerfile esperado.

### CA-003
Quando `from` estiver ausente, `validate` falha com mensagem indicando campo obrigatorio.

### CA-004
Quando `expose` tiver porta invalida, `validate` falha com mensagem de intervalo.

### CA-005
Quando existir campo nao suportado, `validate` falha com mensagem de campo desconhecido.

## Criterios de Aceitacao Futuros (v1.1+)

### CAF-001
Quando `entrypoint` for informado, a saida deve conter `ENTRYPOINT` em exec form.

### CAF-002
Quando `workdir` for informado, ele deve prevalecer sobre inferencia por `copy.dest`.

### CAF-003
`docker-yaml generate arquivo.yaml --out Dockerfile` deve criar/atualizar o arquivo alvo.

### CAF-004
Quando `stages` for informado com dois estagios simples, a saida deve conter dois blocos `FROM` em ordem.