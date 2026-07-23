# Changelog

## 0.2.0 - 2026-07-23
- Suporte a `workdir` explicito com precedencia sobre inferencia por `copy.dest`.
- Suporte a `entrypoint` com geracao `ENTRYPOINT` em exec form.
- Novo suporte a `docker-yaml generate <arquivo> --out <caminho>` para gravar Dockerfile em arquivo.
- Testes adicionais cobrindo `workdir`, `entrypoint` e `--out`.

## 0.1.0 - 2026-07-23
- Estrutura inicial da biblioteca TypeScript `docker-yaml`.
- Implementacao de parser YAML, validador v1 e gerador de Dockerfile.
- CLI com comandos `validate` e `generate`.
- Testes unitarios e de integracao da CLI.
- Documentacao inicial com exemplo de uso.