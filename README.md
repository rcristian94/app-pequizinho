# Pequizinho

**Inglês para grandes aventuras.** MVP infantil em português brasileiro para aprender inglês americano, inspirado no Cerrado tocantinense.

## Estado desta entrega

MVP preparado para homologação Cloudflare e repositório próprio `rcristian94/app-pequizinho`. A homologação usa SQLite em Durable Objects, com uma instância por família e catálogo separado, pois a conta atingiu a cota de bancos D1. Nenhum plano pago foi contratado; cobranças de assinatura permanecem desativadas. Veja `docs/HOMOLOGACAO.md` para detalhes da publicação.

## Executar

Requer Node 22.13+ (validado com Node 24), npm e os pacotes de desenvolvimento do lockfile.

```sh
npm ci
npm run db:local
npm run dev
```

Abra o endereço informado pelo Wrangler. Em ambientes de preview gerenciados, utilize o endereço informado pelo serviço de preview. O parâmetro `?demo=1` abre uma demonstração com dados fictícios, mantidos somente em memória; ela não autentica na API real.

Crie a conta do responsável e um perfil infantil para testar persistência real. O cadastro não concede perfil administrador. Para promover uma conta local já cadastrada, use o console D1 local com uma instrução parametrizada ou substitua manualmente um e-mail de teste no comando abaixo:

```sh
npx wrangler d1 execute DB --local --command "UPDATE parents SET role='admin' WHERE email='seu-email-de-teste@example.test'"
```

Entre novamente e abra Família → Administração de aulas. Nunca há promoção automática do primeiro usuário ou por e-mail fornecido no cadastro.

## Funcionalidades

- Conta do responsável, senha com PBKDF2 e sal individual, sessão via cookie HttpOnly/Secure/SameSite e bloqueio de tentativas.
- Até cinco perfis por família, com apelido, faixa etária e avatar; dados e progresso isolados por perfil e família.
- Oito aulas em seis unidades, 32 exercícios de escolha, escuta, escrita e prática de fala, com áudio americano local.
- Liberação sequencial das aulas, correção no servidor, pontos concedidos uma única vez por aula, estrelas e dias de estudo (inclusive revisão).
- Painel da família protegido novamente por senha após entrar no modo infantil; exportação e exclusão de dados.
- Administração com criação/edição/publicação de aulas e exercícios em formulário, revisão de conteúdo e auditoria.
- Assinatura de R$ 9,90 exclusivamente em simulação. O banco impede status ativo e cobrança habilitada.
- Layout responsivo, manifesto PWA, ícones e service worker. O aplicativo armazena a interface para reabertura; autenticação, aulas e progresso real exigem conexão.

## Base Lingo e licença

Adaptação da base pública [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone), referência `096e2531f353bf7437fe9d64099402080a27c6d8`. Os arquivos originais estão preservados em `legacy/lingo/`. O histórico Git original também foi preservado no pacote de entrega `Pequizinho-MVP.bundle`; o repositório próprio mantém o histórico do proprietário e os commits de publicação. A licença MIT e o copyright de Sanidhya Kumar Verma permanecem em `LICENSE`.

Esta entrega é uma **portabilidade do modelo de domínio e do fluxo de exercícios**, com implementação nova de servidor e interface. Não é apenas uma troca de logotipo no Next.js original. A hierarquia de unidades/aulas/desafios e o fluxo de selecionar → verificar → receber feedback → continuar foram adaptados. Clerk, Neon/PostgreSQL, Stripe e o runtime Next.js do projeto original não são usados pelo MVP.

Os elementos visuais de Pequizinho não vêm do Duolingo. A prancha aprovada do usuário é reutilizada por recortes de apresentação em SVG. Os áudios em espanhol e os mascotes do Lingo original ficam somente no arquivo histórico e não são servidos pelo aplicativo.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `src/worker.mjs` | API, sessões, autorização e progresso |
| `src/curriculum.mjs` | Conteúdo inicial e validação de aulas |
| `public/` | Interface, identidade aprovada, fontes locais, áudios e PWA |
| `migrations/` | Tabelas D1, aulas iniciais e dias de estudo |
| `tests/` | Testes funcionais e de autorização com SQLite |
| `scripts/runtime-smoke.mjs` | Jornada completa no runtime Workers/D1 local |
| `scripts/build.mjs` | Worker independente com assets incorporados |
| `scripts/build-demo.mjs` | Demonstração HTML independente, sem backend |
| `wrangler.jsonc` | Configuração local e preparação de homologação |
| `docs/` | Avaliação técnica, validação e próximos passos |
| `legacy/lingo/` | Fontes originais preservadas; não participam do build |

## Verificar

```sh
npm run check
npm run test:runtime
npx wrangler deploy --dry-run --env="" --outdir dist/dry-run
node scripts/build-demo.mjs
```

O Worker não depende de IA ou APIs de pagamento. A versão local usa D1; a homologação usa APIs Web e SQLite em Durable Objects. Wrangler e Miniflare são ferramentas locais de desenvolvimento.

## Cloudflare

Worker de homologação: `pequizinho-staging`. Em `env.staging`, `PEQUI_FAMILIES` vincula a classe `PequizinhoFamily` e `PEQUI_CATALOG` vincula `PequizinhoCatalog`, ambas SQLite. A configuração D1 original fica apenas no ambiente local. Os bancos dos outros projetos permanecem separados.

```sh
npm run build:staging
npm run test:durable
# Apenas depois de autorização do proprietário:
npm run deploy:staging -- --authorized
```

O pipeline não tem publicação automática em produção. Veja `docs/HOMOLOGACAO.md`.

## Limites desta primeira versão

- Recuperação de senha e verificação de e-mail do responsável ainda não implementadas.
- Reconhecimento de fala depende de navegador compatível e HTTPS. O navegador pode utilizar seu próprio serviço remoto. Não há avaliação fonética, IA paga ou armazenamento de gravação; existe alternativa sem microfone.
- Instalação PWA em aparelhos reais e captura real de microfone dependem de homologação HTTPS; ainda não foram validadas.
- Conteúdo inicial é introdutório, compartilhado entre as faixas etárias, e precisa de revisão pedagógica antes do lançamento comercial. Não há promessa de certificação, proficiência ou curso completo.
- O administrador pode apontar áudio local existente; upload e geração de novos áudios pelo painel ficam para uma etapa posterior.
- A homologação deve usar dados fictícios. Antes da produção: termos, canal de privacidade, revisão de consentimento/verificação do responsável, recuperação de conta e avaliação de segurança/custos.
