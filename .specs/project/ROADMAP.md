# Roadmap

## M0 - Fundacao
- Estruturar projeto TypeScript e toolchain (`tsup` ou `tsc` + `bin`).
- Definir formato YAML v1 e schema de entrada.

## M1 - Core da Biblioteca
- Implementar parser de YAML para modelo interno.
- Implementar validacao semantica e estrutural.
- Implementar gerador deterministico de `Dockerfile`.

## M2 - CLI
- Implementar `docker-yaml validate <arquivo>`.
- Implementar `docker-yaml generate <arquivo>`.
- Padronizar logs, erros e codigos de saida.

## M3 - Qualidade
- Testes unitarios para parser/validator/generator.
- Testes de integracao da CLI com fixtures.
- Documentacao de uso e exemplos.

## Backlog Pos-v1
- Suporte a `WORKDIR` customizavel sem depender de `copy.dest`.
- Suporte a mais instrucoes Docker (ex.: `ENTRYPOINT`, `VOLUME`, `ARG`).
- Modo output file (`--out Dockerfile`).