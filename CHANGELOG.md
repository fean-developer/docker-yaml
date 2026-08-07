# Changelog

## 0.12.0 - 2026-08-07
- Comentarios YAML (`# texto`) sao preservados e emitidos no Dockerfile gerado na mesma posicao relativa.
- Linhas em branco entre secoes do YAML sao preservadas no Dockerfile.
- Comentarios movem junto com a secao quando `order` e usado para reordenar instrucoes.
- Funciona em single-stage e multi-stage (comentarios no nivel raiz do documento).

## 0.11.0 - 2026-07-24
- Suporte completo a templates em strings YAML (`${VAR}`).
- Suporte a default (`${VAR:-valor}`), required (`${VAR?mensagem}`) e escape (`$${VAR}`).
- Resolucao de variaveis a partir de:
	- ambiente shell (`process.env`),
	- arquivos `.env` e `.vars` no diretorio do spec,
	- `--vars-file <arquivo>`,
	- `--var CHAVE=valor` (maior precedencia).
- Templates agora sao resolvidos antes da validacao e da geracao.
- Suporte aplicado em single-stage, multi-stage e `services` com multi-stage.
- Novo guia detalhado de uso: `TEMPLATE_VARIABLES_GUIDE.md`.
- Novos testes de API e CLI cobrindo os cenarios das 3 fases.

## 0.10.0 - 2026-07-24
- Suporte a `multi-stage` dentro de `services` usando `services[].stages`.
- Cada `service` agora pode ser:
	- single-stage (`from`, `run`, `copy`, etc.), ou
	- multi-stage (`stages`).
- Validacao para impedir mistura de `from` e `stages` no mesmo `service`.
- Novos testes de API e CLI cobrindo `services` multi-stage e caso invalido.

## 0.9.1 - 2026-07-24
- Suporte a `order.<chave>.before` e `order.<chave>.after` com lista de anchors.
- Exemplo: `order.user.after: [copy, workdir]` agora garante `USER` depois de `COPY` e `WORKDIR`.
- Novos testes de API e CLI cobrindo ordenacao com multiplos anchors.

## 0.9.0 - 2026-07-24
- Suporte a multi-Dockerfile via `services` com selecao por nome (`--name <service>`).
- CLI agora aceita `--name` em `validate` e `generate`.
- `validate` tambem aceita `--out` para validar e gravar o Dockerfile no mesmo fluxo.
- Suporte ao alias de versao `version: v1` (alem de `version: 1`).
- Ordenacao padrao atualizada para seguir um fluxo recomendado quando `order` nao e informado.
- Correcao da ordenacao com `order.<chave>.after: copy` quando `copy.afterRun: true` (ex.: `USER` nao vai mais para depois de `ENTRYPOINT` indevidamente).
- Novos testes de API e CLI cobrindo `services`, `--name` e a regressao de ordenacao do `user`.

## 0.8.0 - 2026-07-24
- Suporte a instrucao `SHELL` com array de comandos.
- Suporte a instrucao `ADD` com `src`, `dest` e opcional `chown`.
- Suporte a instrucao `LABEL` para metadados de imagem.
- Suporte a instrucao `VOLUME` com array de caminhos.
- Suporte a instrucao `HEALTHCHECK` com `cmd`, `interval`, `timeout`, `retries`, `startPeriod`.
- Suporte a instrucao `STOPSIGNAL` para definir sinal de parada.
- Atualizacao da ordenacao padrao para incluir 16 instrucoes.
- Novos testes cobrindo cada instrucao isoladamente.

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