> Registro da primeira entrega local. Para a publicação atual com SQLite por família, consulte [HOMOLOGACAO.md](HOMOLOGACAO.md).

# Compatibilidade e implantação

## Avaliação do Lingo

O Lingo original utiliza Next.js 16, React, Clerk, Drizzle/PostgreSQL em Neon e Stripe, com instruções voltadas à Vercel. Não é um site estático pronto para copiar para Pages. O schema original usa tipos específicos de PostgreSQL, e os Server Actions, autenticação e checkout dependem dos respectivos provedores.

A decisão para o MVP foi preservar o histórico e o código de origem, portar o modelo e o fluxo de aprendizagem para um Worker ESM nativo e usar D1/SQLite. Isso reduz serviços e elimina a necessidade de Clerk, Neon, Stripe ou IA paga. Os créditos MIT permanecem intactos.

Referências oficiais consultadas:

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/platform/pricing/

## Resultados de compatibilidade

- Bundling do Wrangler concluído em modo `--dry-run`, sem implantação.
- Migrações aplicadas no D1 local pelo Wrangler.
- Autenticação, operações SQL e jornada completa executadas no runtime `workerd`/Miniflare com binding D1 local.
- Worker de runtime sem módulos Node ou conexões TCP; usa `Request`, `Response`, `crypto.subtle`, SQL parametrizado e `DB.batch()`.
- Fontes, imagens e 21 áudios são locais. Nenhuma dependência de IA, pagamentos, Google Fonts ou rastreadores externos em execução.
- PBKDF2 usa 100 mil iterações e sal aleatório individual, com hash de tokens de sessão. O limite de CPU deve ser medido na homologação real antes de assumir operação no plano gratuito.

## Recursos exclusivos propostos

| Recurso | Nome | Estado |
| --- | --- | --- |
| GitHub | `rcristian94/pequizinho` (proposto) | Não criado; verificar disponibilidade antes |
| Worker | `pequizinho-staging` | Não criado |
| D1 | `pequizinho-staging` | Criação bloqueada pela revisão automática |
| Ambiente de produção | Não configurado | Não publicado |
| Cobranças | Nenhum provedor conectado | Desativadas no código e schema |

O conector GitHub disponível não oferece criação de repositório. Será necessário usar um repositório vazio criado pelo proprietário ou autorizar a alternativa pelo navegador. Não foram enviados arquivos para um projeto existente.

A revisão automática rejeitou a tentativa de criar D1 por considerar um recurso externo persistente com possível compromisso de custos, exigindo autorização específica. Não houve tentativa de contornar essa decisão.

## Retomada depois da autorização

1. Verificar plano/cota Cloudflare. Se exigir upgrade ou custo adicional, parar para decisão do proprietário.
2. Criar apenas D1 `pequizinho-staging`, guardar seu ID real e adicionar `binding: DB` em `env.staging.d1_databases`, com `migrations_dir: migrations`.
3. Aplicar as três migrações nesse banco explicitamente selecionado, sem acessar bancos existentes.
4. Implantar apenas o Worker de homologação e habilitar sua URL de teste. Manter os registros de versão para rollback.
5. Validar por HTTPS cadastro/login, isolamento, PWA em iOS/Android e reconhecimento de voz em navegador compatível. Usar somente dados fictícios.
6. Criar o repositório separado, apontar `origin` para a URL retornada pelo GitHub e enviar o commit do MVP com o histórico MIT.

Não há workflows que publiquem automaticamente em produção. Não há segredos ou senhas nos arquivos da entrega.
