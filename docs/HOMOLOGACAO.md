# Publicação da homologação

Endereço: https://pequizinho-staging.romariocristian94.workers.dev

Worker implantado pela API Cloudflare. Deployment ID: `42d7114bae584fe7b2a939b045f46bec`. Cobranças da aplicação desativadas.

Repositório autorizado pelo proprietário: https://github.com/rcristian94/app-pequizinho

A conta Cloudflare atingiu o limite de dez bancos D1. A tentativa de criar um banco separado retornou `7406: System limit reached: databases per account (10)`. Nenhum banco existente foi alterado e nenhum plano foi contratado.

A homologação usa **SQLite em Durable Objects**, disponível no plano gratuito. Cada família tem sua própria instância para conta, sessões, crianças, respostas e progresso. Um objeto separado coordena apenas o catálogo compartilhado de aulas e seu log administrativo. O Worker público atende assets e encaminha a API à instância correta por um cookie de roteamento HttpOnly/Secure; esse cookie não substitui a validação da sessão.

O schema usa chaves estrangeiras locais para responsável/perfis/progresso. A referência ao catálogo compartilhado é validada na API, pois pertence a outro SQLite. Transações de sessões, pontuação e administração ficam inteiramente na respectiva instância; lotes que misturem bancos são recusados.

Arquivos principais: `src/durable-storage.mjs`, `src/durable-schema.mjs`, `scripts/build-durable.mjs`, `scripts/durable-smoke.mjs` e `env.staging` em `wrangler.jsonc`.

Reproduzir:

```sh
npm ci
npm run check
npm run test:durable
npx wrangler deploy --dry-run --env staging
```

O caminho D1 original permanece disponível para desenvolvimento local e eventual migração autorizada. Não é necessário criar um D1 para executar a homologação.

A publicação não ativa Stripe, Pix, cartão ou cobranças de assinatura. O plano de R$ 9,90 continua em sandbox. Recuperação de senha por e-mail, revisão pedagógica e instalação PWA em aparelhos físicos permanecem etapas posteriores.

A conta inicial de administração deve ser provisionada separadamente, depois que o proprietário cadastrar sua conta. Nenhum e-mail fornecido no cadastro se torna administrador automaticamente.

Documentação oficial consultada: https://developers.cloudflare.com/durable-objects/platform/pricing/ e https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/

Validação HTTPS concluída: cadastro, perfil infantil, oito aulas/32 respostas, 320 pontos, 24 estrelas, painel da família, sandbox e exclusão da conta de teste aprovados no endereço público.
