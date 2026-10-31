> Registro da primeira entrega local. Para a publicação atual com SQLite por família, consulte [HOMOLOGACAO.md](HOMOLOGACAO.md).

# Validação do MVP

## Testes automatizados

`npm run check`: verificação de sintaxe, 12 testes aprovados e build independente.

Os testes cobrem currículo e sequência entre meses; senha armazenada como hash e cookie de sessão; logout/expiração; acesso entre famílias; trilha bloqueada; conclusão indevida; idempotência da pontuação; confirmação da senha do responsável; autorização administrativa; cadastro/edição e conflito de versões de aulas; sandbox financeiro; exportação e exclusão em cascata; CSRF; limites de tentativa; e validação do conteúdo cadastrado.

`npm run test:runtime`: teste integrado aprovado em Workers `workerd`/Miniflare e D1 local. Executa cadastro de teste, perfil infantil, entrada no modo criança, oito aulas, 32 respostas, conclusão com 320 pontos e 24 estrelas, desbloqueio do painel, assinatura simulada, promoção controlada do administrador no banco de teste, edição da aula e exclusão dos dados de teste.

Migrações: `0001_initial.sql`, `0002_seed.sql` e `0003_study_days.sql` aplicadas com sucesso via Wrangler no banco local.

Empacotamento Cloudflare: `wrangler deploy --dry-run` aprovado. O modo dry-run não publicou nem criou infraestrutura remota.

## Conferência no navegador

Prévia local aberta pelo serviço de preview gerenciado. A demonstração foi identificada explicitamente como dados fictícios e usa somente memória. Conferidos visualmente: trilha, bloqueio das próximas aulas, selecionar alternativa, feedback correto, exercício de escuta, campo de escrita, alternativa de prática sem microfone, conclusão e recompensa, painel da família e formulário administrativo.

A autenticação real e o banco não foram substituídos pela demonstração nos testes de servidor. A demonstração não é prova de persistência: a persistência foi validada separadamente pelos testes funcionais e pelo runtime D1 local.

Um smoke HTTP externo ao processo não conseguiu atravessar a ponte de rede da prévia gerenciada. A validação de runtime foi feita com `Miniflare.dispatchFetch`, que passou a jornada completa. Não houve alteração das políticas de rede para contornar o limite.

## Ainda não validados

- Implantação Cloudflare remota, consumo de CPU/cotas e URL pública de homologação.
- Instalação PWA em dispositivos reais e experiência completa em Safari/iOS e Android.
- Captura efetiva de microfone/reconhecimento em navegador HTTPS. A alternativa sem microfone foi conferida.
- Envio/recuperação de senha por e-mail, pois ainda não implementados.
- Validação pedagógica e operação comercial.

## Reproduzir

```sh
npm ci
npm run check
npm run test:runtime
npm run db:local
npm run dev
```
