# Projeto: docker-yaml

## Visao
Criar uma biblioteca TypeScript com CLI para converter uma especificacao YAML simplificada em `Dockerfile` valido, com validacao estrutural antes da geracao.

## Problema
Escrever `Dockerfile` manualmente para casos simples e repetitivos e sujeito a erro, especialmente em equipes que padronizam imagens de build/deploy.

## Objetivos
- Permitir gerar `Dockerfile` a partir de YAML declarativo.
- Expor comando de validacao para falhar cedo em erros de schema.
- Expor comando de geracao com saida previsivel e deterministica.
- Fornecer API programatica para uso em outros projetos Node.js.

## Nao Objetivos (v1)
- Nao cobrir 100% de todas as instrucoes Docker avancadas.
- Nao executar build de imagem (`docker build`) internamente.
- Nao fazer interpretacao de templates dinamicos complexos.

## Publico-Alvo
- Devs backend/fullstack que querem padronizar Dockerfiles.
- Equipes de plataforma que desejam fluxo declarativo simples para conteinerizacao.

## Entregaveis v1
- Pacote npm TypeScript.
- CLI `docker-yaml validate <arquivo>`.
- CLI `docker-yaml generate <arquivo>`.
- Parser + validador + gerador de `Dockerfile`.

## Criterios de Sucesso
- Exemplo fornecido pelo usuario gera `Dockerfile` esperado.
- Erros de validacao apresentam mensagem clara por campo.
- Comandos CLI retornam codigos de saida padronizados (`0` sucesso, `1` erro).