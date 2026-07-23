# STATE

## Decisoes
- Nome do projeto: `docker-yaml`.
- Linguagem principal: TypeScript.
- Interface inicial: biblioteca + CLI.
- Comandos obrigatorios v1: `validate` e `generate`.

## Convencoes
- YAML de entrada usa chaves em minusculo (`from`, `copy`, `run`, `env`, `expose`, `cmd`).
- Geracao de `Dockerfile` deve ser deterministica.

## Blockers
- Nenhum no momento.

## Proximos Passos
- Definir schema formal da entrada.
- Implementar parser e validacao com mensagens de erro por campo.
- Implementar gerador de `Dockerfile` cobrindo o exemplo base.

## Ideias Diferidas
- Auto-fix de YAML invalido.
- Suporte a multiplos estagios (`multi-stage builds`).