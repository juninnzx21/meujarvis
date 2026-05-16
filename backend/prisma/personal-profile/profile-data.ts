export type PersonalMemoryType = "preference" | "fact" | "reminder" | "note" | "system";

export type PersonalProfileMemory = {
  type: PersonalMemoryType;
  title: string;
  content: string;
  tags: string[];
  importance: number;
};

export const personalProfileCategories = [
  "Identidade e perfil",
  "Contato profissional publico",
  "Formacao",
  "Experiencia profissional",
  "Stack tecnica",
  "Ambiente de desenvolvimento",
  "Preferencias de resposta",
  "Preferencias de validacao",
  "Preferencias de prompts Codex",
  "Seguranca e estilo de trabalho",
  "Infraestrutura recorrente",
  "Dominios e marca pessoal",
  "Projeto JARVIS",
  "Projeto Meta Locadora",
  "Projeto Controle Financeiro",
  "Projeto Controle de Mercado",
  "Outros projetos e sistemas",
  "Deploy e producao",
  "Rotinas de comandos",
  "Roadmap pessoal/tecnico",
  "Pendencias recorrentes",
  "Linguagem e estilo",
  "Dados que NAO devem ser salvos",
  "Relacao com IA/Codex/JARVIS",
  "Historico tecnico resumido",
  "Prioridades futuras"
];

export const personalProfileMemories: PersonalProfileMemory[] = [
  {
    type: "fact",
    title: "Identidade principal do usuario",
    content: "O usuario se chama Junior Rodrigues. Tambem pode usar os nomes Geraldo Junior, Juninnzx e Junin em contextos pessoais/profissionais. Atua como Desenvolvedor Full Stack Junior / Desenvolvedor Web, com foco em sistemas web, SaaS, automacoes, paineis administrativos, integracoes e deploys.",
    tags: ["perfil", "identidade", "junior-rodrigues", "juninnzx", "desenvolvedor", "carreira"],
    importance: 5
  },
  {
    type: "fact",
    title: "Localizacao e contexto de atuacao",
    content: "O usuario e de Belo Horizonte, Minas Gerais, Brasil. Costuma trabalhar com projetos proprios, freelas, oportunidades PJ, CLT e sistemas SaaS voltados para negocios reais.",
    tags: ["localizacao", "belo-horizonte", "minas-gerais", "brasil", "trabalho", "freelance", "pj", "clt"],
    importance: 4
  },
  {
    type: "fact",
    title: "Marca pessoal e presenca profissional",
    content: "O usuario usa a marca JuninnzxTec e mantem o dominio juninnzxtec.com.br para projetos, portfolio, sistemas e subdominios de producao.",
    tags: ["marca-pessoal", "juninnzxtec", "portfolio", "dominio", "projetos"],
    importance: 5
  },
  {
    type: "fact",
    title: "Contato profissional publico",
    content: "Contato profissional publico informado pelo usuario: contatojuninnzx@gmail.com. Site/portfolio: www.juninnzxtec.com.br. GitHub: juninnzx21. Usar esses dados em curriculos, propostas e materiais profissionais quando o usuario solicitar.",
    tags: ["contato", "email-profissional", "portfolio", "github", "curriculo", "proposta"],
    importance: 4
  },
  {
    type: "fact",
    title: "Formacao academica",
    content: "O usuario cursa Analise e Desenvolvimento de Sistemas pela UNOPAR desde 2022 e possui Ensino Medio completo.",
    tags: ["formacao", "faculdade", "unopar", "ads", "curriculo"],
    importance: 4
  },
  {
    type: "fact",
    title: "Experiencias profissionais informadas",
    content: "Experiencias informadas pelo usuario: Junior Full Stack Developer na MKT - Elite Solucoes entre 03/2023 e 12/2023; IT Technician Level 2 na Santa Casa BH entre 2022 e 2023; N1 Support Analyst na QA / IT ANSOWER entre 03/2024 e 12/2024.",
    tags: ["experiencia", "curriculo", "full-stack", "suporte", "tecnico-ti", "santa-casa", "mkt"],
    importance: 4
  },
  {
    type: "fact",
    title: "Perfil profissional resumido",
    content: "O usuario tem perfil de desenvolvedor full stack junior com forte capacidade pratica, foco em criar sistemas reais, validar fluxos, publicar projetos, corrigir problemas de ambiente e transformar ideias em produtos SaaS/comerciais.",
    tags: ["perfil-profissional", "full-stack", "saas", "produtos", "sistemas"],
    importance: 5
  },
  {
    type: "fact",
    title: "Stack principal do usuario",
    content: "Stack recorrente do usuario: PHP, Laravel, WordPress, Elementor, JavaScript, TypeScript, Vue 3, React, Vite, Tailwind CSS, Node.js, Express, Prisma, PostgreSQL, MySQL/MariaDB, Docker, Docker Compose, Caddy, n8n, Evolution API, Home Assistant, Git/GitHub, DirectAdmin, VPS Linux e Windows PowerShell.",
    tags: ["stack", "php", "laravel", "wordpress", "javascript", "typescript", "vue", "react", "docker", "caddy", "n8n"],
    importance: 5
  },
  {
    type: "fact",
    title: "Backend recorrente",
    content: "O usuario trabalha com backend usando PHP/Laravel, Node.js/Express/TypeScript, Prisma, PostgreSQL, MySQL/MariaDB, APIs REST, autenticacao, middlewares, health checks, jobs, filas e integracoes externas.",
    tags: ["backend", "php", "laravel", "node", "express", "prisma", "postgresql", "mysql", "api"],
    importance: 5
  },
  {
    type: "fact",
    title: "Frontend recorrente",
    content: "O usuario trabalha com frontend usando React, Vue 3, Vite, TypeScript, Tailwind CSS, Inertia.js, componentes reutilizaveis, dashboards, paginas publicas, paineis administrativos e layouts responsivos.",
    tags: ["frontend", "react", "vue", "vite", "typescript", "tailwind", "dashboard", "ui"],
    importance: 5
  },
  {
    type: "fact",
    title: "Infraestrutura e DevOps recorrentes",
    content: "O usuario usa Docker, Docker Compose, Caddy, VPS Linux, DirectAdmin, hospedagem compartilhada, DNS, subdominios, SSL/HTTPS, backups, health checks e scripts PowerShell/Bash para operacao e deploy.",
    tags: ["infra", "devops", "docker", "caddy", "vps", "directadmin", "dns", "ssl", "backup"],
    importance: 5
  },
  {
    type: "fact",
    title: "Ambiente local de desenvolvimento",
    content: "O usuario desenvolve principalmente no Windows com PowerShell, VS Code, Docker Desktop, Git, Node/npm, PHP/Composer quando necessario, caminhos em E: e C:, e usa Codex para automatizar implementacao, auditoria e validacao.",
    tags: ["ambiente", "windows", "powershell", "vscode", "docker-desktop", "codex"],
    importance: 5
  },
  {
    type: "preference",
    title: "Preferencia de respostas praticas",
    content: "O usuario prefere respostas diretas, praticas, organizadas e com comandos prontos para copiar e colar. Valoriza passo a passo, explicacao objetiva, codigos completos, prompts para Codex e proximos passos claros.",
    tags: ["preferencia", "resposta", "comandos", "copy-paste", "passo-a-passo"],
    importance: 5
  },
  {
    type: "preference",
    title: "Preferencia por prompts completos para Codex",
    content: "O usuario frequentemente pede prompts super completos para colar no Codex. Esses prompts devem conter objetivo, diretorio correto, contexto, tarefas, comandos, validacao, criterios de aprovacao, seguranca, documentacao e entrega final.",
    tags: ["codex", "prompt", "automacao", "validacao", "checklist"],
    importance: 5
  },
  {
    type: "preference",
    title: "Criterio de validacao preferido",
    content: "O usuario valoriza validacao honesta com comandos executados, resultados, erros encontrados, correcoes aplicadas, evidencias, status por modulo, pendencias reais e conclusao APROVADO/NAO APROVADO.",
    tags: ["validacao", "aprovado", "nao-aprovado", "auditoria", "evidencia"],
    importance: 5
  },
  {
    type: "preference",
    title: "Formato de relatorio preferido",
    content: "O usuario prefere relatorios em Markdown com resumo executivo, comandos executados, evidencias, bugs, correcoes, status por modulo, pendencias reais, riscos e proximo passo exato.",
    tags: ["relatorio", "markdown", "auditoria", "status", "evidencias"],
    importance: 5
  },
  {
    type: "preference",
    title: "Linguagem preferida",
    content: "O usuario se comunica em portugues brasileiro informal, com erros de digitacao ocasionais. O JARVIS deve responder em portugues brasileiro claro, objetivo, profissional e sem julgamento.",
    tags: ["linguagem", "pt-br", "portugues", "comunicacao"],
    importance: 5
  },
  {
    type: "preference",
    title: "Estilo do JARVIS",
    content: "O JARVIS deve responder de forma objetiva, util, profissional e levemente tecnologica. Deve evitar enrolacao, nao inventar dados, deixar incertezas claras e pedir confirmacao antes de acoes sensiveis.",
    tags: ["jarvis", "personalidade", "estilo", "objetividade", "seguranca"],
    importance: 5
  },
  {
    type: "preference",
    title: "Seguranca como prioridade",
    content: "O usuario valoriza seguranca pratica: nao expor .env, tokens, senhas ou chaves; bloquear acoes perigosas; exigir confirmacao para acoes sensiveis; proteger backups; nao versionar node_modules/dist/backups; redigir logs.",
    tags: ["seguranca", "env", "tokens", "redaction", "backups", "gitignore"],
    importance: 5
  },
  {
    type: "fact",
    title: "Projeto principal JARVIS Home AI",
    content: "Projeto principal atual: JARVIS Home AI Assistant. Diretorio local: E:\\jarvis-home-assistant. Repositorio: https://github.com/juninnzx21/meujarvis.git. Producao: https://jarvis.juninnzxtec.com.br. API dedicada: https://apijarvis.juninnzxtec.com.br/api.",
    tags: ["jarvis", "projeto-principal", "github", "producao", "api", "meujarvis"],
    importance: 5
  },
  {
    type: "fact",
    title: "Stack do JARVIS",
    content: "O JARVIS usa frontend React/Vite/TypeScript/Tailwind; backend Node.js/Express/TypeScript/Prisma; PostgreSQL; Docker Compose; Caddy; OpenAI; Gemini fallback; fallback local seguro; n8n; Evolution API/WhatsApp; Home Assistant; scripts PowerShell; testes Vitest/Supertest/Testing Library.",
    tags: ["jarvis", "stack", "react", "node", "prisma", "postgres", "docker", "openai", "gemini"],
    importance: 5
  },
  {
    type: "fact",
    title: "Status do JARVIS ate Fase 6",
    content: "O JARVIS foi aprovado ate a Fase 6. Possui login, dashboard, status, chat, voz, memorias, tarefas, automacoes, comandos, rotinas, relatorios, notificacoes, logs, settings, scheduler automatico seguro, backup/restore, scripts operacionais, OpenAI, Gemini fallback, fallback local seguro e integracoes preparadas.",
    tags: ["jarvis", "status", "fase-6", "aprovado", "scheduler"],
    importance: 5
  },
  {
    type: "fact",
    title: "Validacao JARVIS Fase 6",
    content: "Na Fase 6, o JARVIS foi validado com backend 24 testes aprovados, frontend 7 testes aprovados, PostgreSQL healthy, Prisma generate/validate/migrate/seed aprovados, scripts status/backup/validate/start aprovados, scheduler enabled=true, running=true, interval=60 e fallbacks n8n/WhatsApp/Home Assistant not_configured sem quebrar.",
    tags: ["jarvis", "validacao", "testes", "fase-6", "scheduler", "aprovado"],
    importance: 5
  },
  {
    type: "fact",
    title: "Deploy JARVIS producao",
    content: "O JARVIS foi publicado em VPS Ubuntu com Docker Compose e Caddy HTTPS. Producao em https://jarvis.juninnzxtec.com.br. API dedicada em https://apijarvis.juninnzxtec.com.br/api. Caddy roteia a API dedicada para backend e o frontend fica publicado na hospedagem Fabweb.",
    tags: ["jarvis", "deploy", "vps", "caddy", "docker", "https", "producao"],
    importance: 5
  },
  {
    type: "fact",
    title: "Git e versoes do JARVIS",
    content: "Repositorio JARVIS: https://github.com/juninnzx21/meujarvis.git. Branch principal: main. Tags importantes planejadas/registradas: v0.5.0-phase5-approved e v0.6.0-scheduler. O repositorio deve permanecer sem .env, backups, dumps, node_modules e dist versionados.",
    tags: ["jarvis", "git", "github", "commits", "tags", "main"],
    importance: 5
  },
  {
    type: "fact",
    title: "Scheduler do JARVIS",
    content: "O scheduler automatico do JARVIS roda no backend quando SCHEDULER_ENABLED=true. Usa SCHEDULER_INTERVAL_SECONDS. Executa rotinas agendadas seguras, lembretes de tarefas e alertas de tarefas vencidas. Usa lastRunAt, reminderSentAt e overdueNotifiedAt para evitar duplicacoes.",
    tags: ["jarvis", "scheduler", "rotinas", "lembretes", "notificacoes"],
    importance: 5
  },
  {
    type: "fact",
    title: "Seguranca do scheduler",
    content: "O scheduler do JARVIS bloqueia WhatsApp direto, Home Assistant sensivel, shell arbitrario, envio em massa e acoes destrutivas. Acoes sensiveis exigem confirmacao explicita.",
    tags: ["jarvis", "scheduler", "seguranca", "bloqueio", "confirmacao"],
    importance: 5
  },
  {
    type: "fact",
    title: "Producao JARVIS VPS",
    content: "Na producao, o JARVIS usa VPS Ubuntu 24.04, Docker Compose, Caddy como reverse proxy HTTPS, PostgreSQL em container, backend em container e frontend tambem pode rodar em container. Portas internas recorrentes na VPS: backend 127.0.0.1:13001, frontend 127.0.0.1:15173 e PostgreSQL 127.0.0.1:15432.",
    tags: ["jarvis", "producao", "vps", "portas", "docker", "caddy"],
    importance: 5
  },
  {
    type: "fact",
    title: "Pendencias futuras do JARVIS",
    content: "Pendencias/evolucoes futuras do JARVIS: configurar credenciais reais n8n/Evolution API/Home Assistant; rotacionar senhas e acessos compartilhados; configurar SSH com chave e desabilitar root por senha; implementar pgvector/memoria semantica real; streaming token a token; testes E2E com navegador; push notifications; app mobile; wake word real sem escuta oculta.",
    tags: ["jarvis", "roadmap", "pendencias", "futuro", "seguranca"],
    importance: 5
  },
  {
    type: "fact",
    title: "Projeto Meta Locadora",
    content: "Meta Locadora e um SaaS Laravel para gestao de frota/locadora, com veiculos, clientes, contratos, manutencoes, inadimplencia, dashboards, relatorios de lucro por carro, planos SaaS, white label, billing, trial, leads, CRM e automacoes. Dominio usado: controledefrotas.juninnzxtec.com.br.",
    tags: ["meta-locadora", "laravel", "saas", "frotas", "locadora", "controledefrotas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Projeto Controle Financeiro",
    content: "Controle Financeiro e um app financeiro com Laravel, Inertia/Vue, Tailwind, Open Finance sandbox, contas, transacoes, cartoes, metas, orcamentos, relatorios, alertas, admin master, billing sandbox, PWA e API mobile. Dominio usado: controlefinanceiro.juninnzxtec.com.br.",
    tags: ["controle-financeiro", "laravel", "vue", "open-finance", "financeiro", "saas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Projeto Controle de Mercado",
    content: "Controle de Mercado / ERP supermercado e um sistema com produtos, importacao por planilha, etiquetas, estoque, compras, fiscal/chave de acesso, caixa, relatorios, dashboard, fornecedores, validade/perdas, help center e paginas publicas. Dominio usado: controlemarcketplace.juninnzxtec.com.br.",
    tags: ["controle-de-mercado", "erp", "supermercado", "laravel", "saas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Projetos de sites comerciais",
    content: "O usuario tambem trabalha com sites comerciais, landing pages, propostas para empresas, lojas de autopecas, assistencia tecnica/celulares, CMS estilo WordPress, Elementor/Hello Elementor, paineis admin e apresentacoes comerciais.",
    tags: ["sites", "landing-page", "wordpress", "elementor", "autopecas", "cms", "propostas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Infraestrutura recorrente do usuario",
    content: "O usuario costuma usar arquitetura hibrida: DirectAdmin/Fab Web para hospedagem compartilhada e DNS, VPS Vultr para servicos Docker, Caddy para reverse proxy/HTTPS, PostgreSQL/Redis quando necessario, Evolution API, n8n e containers para servicos long-running.",
    tags: ["infraestrutura", "directadmin", "fab-web", "vps", "vultr", "docker", "caddy", "dns"],
    importance: 5
  },
  {
    type: "fact",
    title: "Padrao de deploy Laravel",
    content: "Comandos recorrentes em deploy Laravel: composer install --no-dev --optimize-autoloader, php artisan migrate --force, php artisan optimize:clear, php artisan optimize, php artisan storage:link, php artisan config:cache, php artisan route:cache e php artisan view:cache.",
    tags: ["laravel", "deploy", "composer", "artisan", "producao"],
    importance: 4
  },
  {
    type: "fact",
    title: "Padrao de deploy Node Docker",
    content: "Para projetos Node/Docker, o usuario usa Docker Compose, variaveis em .env, containers com portas internas presas em 127.0.0.1, Caddy para HTTPS, docker compose up -d --build, migrations Prisma, seed, health checks e logs.",
    tags: ["node", "docker", "deploy", "caddy", "prisma", "health-check"],
    importance: 5
  },
  {
    type: "fact",
    title: "Padrao de validacao de sistemas",
    content: "Rotina recorrente de validação do usuario: npm install, npm run build, npm run test, npm run validate, php artisan test, php artisan route:list, health checks, testes de endpoints, auditoria de rotas, simulacao de fluxos, dados fake e relatorios em Markdown.",
    tags: ["validacao", "testes", "build", "health-check", "relatorio", "auditoria"],
    importance: 5
  },
  {
    type: "fact",
    title: "Padrao de documentacao",
    content: "O usuario costuma manter documentacao em Markdown como SYSTEM_STATUS_REPORT.md, FINAL_VALIDATION_REPORT.md, HEALTH_CHECK_REPORT.md, README.md, INSTALLATION.md, ARCHITECTURE.md, DEPLOYMENT_STATUS_REPORT.md e guias especificos por modulo.",
    tags: ["documentacao", "markdown", "reports", "status", "arquitetura"],
    importance: 5
  },
  {
    type: "preference",
    title: "Padrao de comandos PowerShell",
    content: "O usuario prefere comandos PowerShell prontos, com Set-Location para o diretorio correto, validacao apos cada etapa, e instrucoes claras para corrigir erros de permissao, Docker, Prisma, Git, npm e portas.",
    tags: ["powershell", "comandos", "windows", "validacao"],
    importance: 5
  },
  {
    type: "preference",
    title: "Padrao de prompts de auditoria",
    content: "Prompts de auditoria devem pedir para o Codex validar secao por secao, container por container, rota por rota, simular interacoes, inserir dados ficticios, testar CRUDs, health checks, builds, testes, endpoints e gerar relatorio APROVADO/NAO APROVADO.",
    tags: ["codex", "auditoria", "simulacao", "e2e", "relatorio"],
    importance: 5
  },
  {
    type: "preference",
    title: "Padrao de prompts de deploy",
    content: "Prompts de deploy devem incluir diretorio, branch, remoto Git, git status, .gitignore seguro, varredura de segredos, npm/prisma/build/test, docker compose, Caddy/DNS quando aplicavel, health checks e relatorio final.",
    tags: ["codex", "deploy", "git", "docker", "caddy", "seguranca"],
    importance: 5
  },
  {
    type: "system",
    title: "Dados proibidos em memoria comum",
    content: "O JARVIS nao deve salvar como memoria comum: senhas reais, tokens, API keys, JWT_SECRET, chaves SSH privadas, credenciais de VPS, DirectAdmin, banco, GitHub, OpenAI, Gemini, n8n, Evolution API, Home Assistant, dados bancarios, cartoes, documentos sensiveis ou dumps. Esses dados devem ficar apenas em .env, vault ou gerenciador de senhas.",
    tags: ["seguranca", "proibido", "segredos", "env", "vault"],
    importance: 5
  },
  {
    type: "system",
    title: "Como lidar com informacoes sensiveis",
    content: "Se o usuario pedir para armazenar informacao sensivel, o JARVIS deve alertar o risco e sugerir salvar em vault/gerenciador de senhas. Caso seja necessario referenciar, salvar apenas metadado seguro, como 'credencial configurada' ou 'acesso existe', sem valor real.",
    tags: ["seguranca", "dados-sensiveis", "vault", "credenciais"],
    importance: 5
  },
  {
    type: "system",
    title: "Respostas sem expor segredos",
    content: "O JARVIS nunca deve exibir valores reais de .env, tokens, API keys, senhas, chaves privadas ou credenciais. Deve responder apenas com configurado/ausente, valido/invalido ou status operacional.",
    tags: ["seguranca", "respostas", "redaction", "env"],
    importance: 5
  },
  {
    type: "reminder",
    title: "Proximas prioridades JARVIS",
    content: "Proximas prioridades recomendadas para o JARVIS: rotacionar senhas/acessos compartilhados; configurar SSH com chave e desabilitar login root por senha; configurar n8n real; configurar Evolution API/WhatsApp real; configurar Home Assistant real; implementar pgvector; criar testes E2E; melhorar streaming real; evoluir push notifications; planejar app mobile/PWA avancado.",
    tags: ["jarvis", "roadmap", "prioridades", "seguranca", "integracoes"],
    importance: 5
  },
  {
    type: "reminder",
    title: "Prioridade de seguranca em producao",
    content: "Antes de evoluir integracoes reais, o usuario deve rotacionar credenciais compartilhadas, proteger acesso SSH com chave, revisar firewall, garantir que 3001/5173/5432 nao estejam publicos e manter Caddy como unico ponto publico HTTP/HTTPS.",
    tags: ["seguranca", "producao", "ssh", "firewall", "caddy"],
    importance: 5
  },
  {
    type: "reminder",
    title: "Prioridade comercial",
    content: "Para uso comercial, o JARVIS precisa de hardening de producao, testes E2E, monitoramento, backups externos, politica de retencao, autenticacao reforcada, usuarios reais, controle de permissoes e revisao de privacidade.",
    tags: ["comercial", "producao", "hardening", "monitoramento", "e2e"],
    importance: 4
  }
];
