# Tasks: dockerfile-from-yaml

## T1 - Inicializar projeto TypeScript
- What: criar estrutura base da lib + CLI.
- Done when:
  - projeto compila;
  - comando binario `docker-yaml` resolve localmente.
- Tests:
  - build sem erros.

## T2 - Implementar modelo e parser YAML
- Depends on: T1
- What: criar tipos v1 e parser baseado em `yaml`.
- Done when:
  - parser converte YAML em objeto tipado;
  - falhas de sintaxe YAML retornam erro claro.
- Tests:
  - unit tests para YAML valido/invalido.

## T3 - Implementar validador v1
- Depends on: T2
- What: validar obrigatoriedade, tipos, ranges e campos desconhecidos.
- Done when:
  - requisitos RF-002 a RF-009 e regras v1 cobertos;
  - mensagens com path do campo.
- Tests:
  - suite de casos validos/invalidos.

## T4 - Implementar gerador de Dockerfile
- Depends on: T3
- What: gerar linhas em ordem canonica e inferir `WORKDIR`.
- Done when:
  - exemplo base gera saida esperada;
  - ordem deterministica garantida.
- Tests:
  - snapshot test do exemplo principal;
  - caso sem campos opcionais.

## T5 - Implementar CLI `validate`
- Depends on: T3
- What: adicionar comando `validate <arquivo>`.
- Done when:
  - exit code `0` para valido e `1` para invalido;
  - mensagens legiveis no terminal.
- Tests:
  - integracao com fixture valido/invalido.

## T6 - Implementar CLI `generate`
- Depends on: T4, T5
- What: adicionar comando `generate <arquivo>` com validacao previa.
- Done when:
  - imprime Dockerfile em stdout quando valido;
  - falha com exit code `1` quando invalido.
- Tests:
  - integracao comparando stdout com esperado.

## T7 - Expor API programatica
- Depends on: T4
- What: exportar `parse`, `validate` e `generate`.
- Done when:
  - API disponivel para import em TypeScript.
- Tests:
  - unit/integration de import e retorno.

## T8 - Documentacao e exemplos
- Depends on: T5, T6, T7
- What: README com exemplo do usuario e comandos CLI.
- Done when:
  - instrucoes de uso e exemplo completo publicados.
- Tests:
  - smoke test manual dos comandos documentados.

## Trilha Pos-v1 (Passo 2)

## T9 - `entrypoint` e `workdir` explicito
- Depends on: T4
- What: estender schema e gerador com `entrypoint` e `workdir`.
- Done when:
  - `ENTRYPOINT` suportado em exec form;
  - `workdir` explicito com precedencia sobre inferencia.

## T10 - `generate --out`
- Depends on: T6
- What: permitir escrita do Dockerfile em arquivo.
- Done when:
  - flag `--out` funcional;
  - erros de escrita tratados com mensagem clara.

## T11 - Multi-stage basico
- Depends on: T3, T4
- What: introduzir campo `stages` para multiplos blocos `FROM`.
- Done when:
  - validacao e geracao de dois estagios simples funcionando.

## Gate Final
- `npm test` verde.
- `docker-yaml validate` e `docker-yaml generate` funcionando com o exemplo de referencia.
- Sem erros de lint/build.