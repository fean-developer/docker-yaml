# Changelog

## 0.7.0 - 2026-07-23
- Suporte a ordenacao customizada com `order.<chave>.before|after`.
- Suporte a `expose` em formato objeto com `ports` e `before/after`.
- Validacao de regras de ordenacao para chaves suportadas.
- Novos testes para API e CLI cobrindo ordenacao customizada.

## 0.6.0 - 2026-07-23
- Suporte a `run` em formato multiline (string YAML) alem de lista.
- Geracao de `RUN` multiline com continuacao por `\\`.
- Novos testes de API e CLI cobrindo o comportamento.

## 0.5.0 - 2026-07-23
- Suporte ao campo `user` com geracao de instrucao `USER`.
- Suporte a `copy.chown` para gerar `COPY --chown=...`.
- Suporte a `copy.afterRun` para ordenar copias apos os comandos `RUN`.
- `env` agora aceita valores string, numero e boolean.
- Atualizacao do fixture `complex.yaml` para o formato suportado.

## 0.4.0 - 2026-07-23
- Suporte a `arg` em single-stage e multi-stage.
- Geracao de `ARG CHAVE=valor` e `ARG CHAVE` (quando valor e `null`).
- Validacao de tipo para valores de `arg` (string, numero, boolean ou null).
- Novos testes de API e CLI cobrindo casos validos e invalidos de `arg`.

## 0.3.0 - 2026-07-23
- Suporte a `stages` para geracao de Dockerfile multi-stage basico.
- Validacao de conflitos entre modo single-stage e multi-stage.
- Novos testes para API e CLI cobrindo casos multi-stage validos e invalidos.

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