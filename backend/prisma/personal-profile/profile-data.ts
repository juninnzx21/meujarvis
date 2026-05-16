export type PersonalMemoryType = "preference" | "fact" | "reminder" | "note" | "system";

export type PersonalProfileMemory = {
  type: PersonalMemoryType;
  title: string;
  content: string;
  tags: string[];
  importance: number;
  aliases?: string[];
};

export const personalProfileCategories = [
  "Identidade e perfil",
  "Contato profissional público",
  "Formação",
  "Experiência profissional",
  "Stack técnica",
  "Ambiente de desenvolvimento",
  "Preferências de resposta",
  "Preferências de validação",
  "Preferências de prompts Codex",
  "Segurança e estilo de trabalho",
  "Infraestrutura recorrente",
  "Domínios e marca pessoal",
  "Projeto JARVIS",
  "Projeto Meta Locadora",
  "Projeto Controle Financeiro",
  "Projeto Controle de Mercado",
  "Outros projetos e sistemas",
  "Deploy e produção",
  "Rotinas de comandos",
  "Roadmap pessoal/técnico",
  "Pendências recorrentes",
  "Linguagem e estilo",
  "Dados que NÃO devem ser salvos",
  "Relação com IA/Codex/JARVIS",
  "Histórico técnico resumido",
  "Prioridades futuras"
];

export const personalProfileMemories: PersonalProfileMemory[] = [
  {
    type: "fact",
    title: "Identidade principal do usuário",
    aliases: ["Identidade principal do usuario"],
    content: "O usuário se chama Junior Rodrigues. Também pode usar os nomes Geraldo Junior, Juninnzx e Junin em contextos pessoais/profissionais. Atua como Desenvolvedor Full Stack Júnior / Desenvolvedor Web, com foco em sistemas web, SaaS, automações, painéis administrativos, integrações, deploys e validação de sistemas.",
    tags: ["perfil", "identidade", "junior-rodrigues", "juninnzx", "desenvolvedor", "carreira"],
    importance: 5
  },
  {
    type: "fact",
    title: "Localização e atuação",
    aliases: ["Localizacao e atuacao", "Localizacao e contexto de atuacao"],
    content: "O usuário é de Belo Horizonte, Minas Gerais, Brasil. Costuma trabalhar com projetos próprios, freelas, oportunidades PJ, CLT e sistemas SaaS voltados para negócios reais.",
    tags: ["localizacao", "belo-horizonte", "minas-gerais", "brasil", "trabalho", "freelance", "pj", "clt"],
    importance: 4
  },
  {
    type: "fact",
    title: "Contato profissional público",
    aliases: ["Contato profissional publico"],
    content: "Contato profissional público informado pelo usuário: contatojuninnzx@gmail.com. Site/portfólio: www.juninnzxtec.com.br. GitHub: juninnzx21. Usar esses dados em currículos, propostas, assinaturas, portfólio e materiais profissionais quando o usuário solicitar.",
    tags: ["contato", "email-profissional", "portfolio", "github", "curriculo", "proposta"],
    importance: 4
  },
  {
    type: "fact",
    title: "Marca pessoal",
    aliases: ["Marca pessoal e presenca profissional", "Marca pessoal e presença profissional"],
    content: "O usuário usa a marca JuninnzxTec e mantém o domínio juninnzxtec.com.br para projetos, portfólio, sistemas, subdomínios de produção e demonstrações comerciais.",
    tags: ["marca", "juninnzxtec", "dominio", "portfolio", "producao"],
    importance: 5
  },
  {
    type: "fact",
    title: "Formação acadêmica",
    aliases: ["Formacao academica"],
    content: "O usuário cursa Análise e Desenvolvimento de Sistemas pela UNOPAR desde 2022 e possui Ensino Médio completo.",
    tags: ["formacao", "faculdade", "unopar", "ads", "curriculo"],
    importance: 4
  },
  {
    type: "fact",
    title: "Experiências profissionais informadas",
    aliases: ["Experiencias profissionais informadas"],
    content: "Experiências informadas pelo usuário: Junior Full Stack Developer na MKT - Elite Soluções entre 03/2023 e 12/2023; IT Technician Level 2 na Santa Casa BH entre 2022 e 2023; N1 Support Analyst na QA / IT ANSOWER entre 03/2024 e 12/2024.",
    tags: ["experiencia", "curriculo", "full-stack", "suporte", "tecnico-ti", "santa-casa", "mkt"],
    importance: 4
  },
  {
    type: "fact",
    title: "Perfil profissional resumido",
    content: "O usuário tem perfil de desenvolvedor full stack júnior com forte capacidade prática, foco em criar sistemas reais, validar fluxos, publicar projetos, corrigir problemas de ambiente e transformar ideias em produtos SaaS/comerciais.",
    tags: ["perfil-profissional", "full-stack", "saas", "produtos", "sistemas"],
    importance: 5
  },
  {
    type: "fact",
    title: "Stack principal do usuário",
    aliases: ["Stack principal do usuario"],
    content: "Stack recorrente do usuário: PHP, Laravel, WordPress, Elementor, JavaScript, TypeScript, Vue 3, React, Vite, Tailwind CSS, Node.js, Express, Prisma, PostgreSQL, MySQL/MariaDB, Docker, Docker Compose, Caddy, n8n, Evolution API, Home Assistant, Git/GitHub, DirectAdmin, VPS Linux e Windows PowerShell.",
    tags: ["stack", "php", "laravel", "wordpress", "javascript", "typescript", "vue", "react", "docker", "caddy", "n8n"],
    importance: 5
  },
  {
    type: "fact",
    title: "Backend recorrente",
    content: "O usuário trabalha com backend usando PHP/Laravel, Node.js/Express/TypeScript, Prisma, PostgreSQL, MySQL/MariaDB, APIs REST, autenticação, middlewares, health checks, jobs, filas e integrações externas.",
    tags: ["backend", "php", "laravel", "node", "express", "prisma", "postgresql", "mysql", "api"],
    importance: 5
  },
  {
    type: "fact",
    title: "Frontend recorrente",
    content: "O usuário trabalha com frontend usando React, Vue 3, Vite, TypeScript, Tailwind CSS, Inertia.js, componentes reutilizáveis, dashboards, páginas públicas, painéis administrativos e layouts responsivos.",
    tags: ["frontend", "react", "vue", "vite", "typescript", "tailwind", "dashboard", "ui"],
    importance: 5
  },
  {
    type: "fact",
    title: "Infraestrutura recorrente",
    aliases: ["Infraestrutura e DevOps recorrentes", "Infraestrutura recorrente do usuario"],
    content: "O usuário costuma usar arquitetura híbrida: DirectAdmin/Fab Web para hospedagem compartilhada, DNS e frontend estático; VPS Vultr para serviços Docker; Caddy para reverse proxy/HTTPS; PostgreSQL/Redis quando necessário; Evolution API, n8n e containers para serviços long-running.",
    tags: ["infraestrutura", "directadmin", "fab-web", "vps", "vultr", "docker", "caddy", "dns"],
    importance: 5
  },
  {
    type: "fact",
    title: "Ambiente local de desenvolvimento",
    content: "O usuário desenvolve principalmente no Windows com PowerShell, VS Code, Docker Desktop, Git, Node/npm, PHP/Composer quando necessário, caminhos em E: e C:, e usa Codex para automatizar implementação, auditoria, validação, deploy e documentação.",
    tags: ["ambiente", "windows", "powershell", "vscode", "docker-desktop", "codex"],
    importance: 5
  },
  {
    type: "preference",
    title: "Preferência de respostas práticas",
    aliases: ["Preferencia de respostas praticas"],
    content: "O usuário prefere respostas diretas, práticas, organizadas e com comandos prontos para copiar e colar. Valoriza passo a passo, explicação objetiva, códigos completos, prompts para Codex e próximos passos claros.",
    tags: ["preferencia", "resposta", "comandos", "copy-paste", "passo-a-passo"],
    importance: 5
  },
  {
    type: "preference",
    title: "Preferência por prompts completos para Codex",
    aliases: ["Preferencia por prompts completos para Codex"],
    content: "O usuário frequentemente pede prompts super completos para colar no Codex. Esses prompts devem conter objetivo, diretório correto, contexto, tarefas, comandos, validação, critérios de aprovação, segurança, documentação e entrega final.",
    tags: ["codex", "prompt", "automacao", "validacao", "checklist"],
    importance: 5
  },
  {
    type: "preference",
    title: "Critério de validação preferido",
    aliases: ["Criterio de validacao preferido"],
    content: "O usuário valoriza validação honesta com comandos executados, resultados, erros encontrados, correções aplicadas, evidências, status por módulo, pendências reais e conclusão APROVADO/NÃO APROVADO.",
    tags: ["validacao", "aprovado", "nao-aprovado", "auditoria", "evidencia"],
    importance: 5
  },
  {
    type: "preference",
    title: "Formato de relatório preferido",
    aliases: ["Formato de relatorio preferido"],
    content: "O usuário prefere relatórios em Markdown com resumo executivo, comandos executados, evidências, bugs, correções, status por módulo, pendências reais, riscos e próximo passo exato.",
    tags: ["relatorio", "markdown", "auditoria", "status", "evidencias"],
    importance: 5
  },
  {
    type: "preference",
    title: "Linguagem preferida",
    content: "O usuário se comunica em português brasileiro informal, com erros de digitação ocasionais. O JARVIS deve responder em português brasileiro claro, objetivo, profissional e sem julgamento.",
    tags: ["linguagem", "pt-br", "portugues", "comunicacao"],
    importance: 5
  },
  {
    type: "preference",
    title: "Estilo do JARVIS",
    content: "O JARVIS deve responder de forma objetiva, útil, profissional e levemente tecnológica. Deve evitar enrolação, não inventar dados, deixar incertezas claras e pedir confirmação antes de ações sensíveis.",
    tags: ["jarvis", "personalidade", "estilo", "objetividade", "seguranca"],
    importance: 5
  },
  {
    type: "preference",
    title: "Segurança como prioridade",
    aliases: ["Seguranca como prioridade"],
    content: "O usuário valoriza segurança prática: não expor .env, tokens, senhas ou chaves; bloquear ações perigosas; exigir confirmação para ações sensíveis; proteger backups; não versionar node_modules/dist/backups/storage/imports; redigir logs.",
    tags: ["seguranca", "env", "tokens", "redaction", "backups", "gitignore"],
    importance: 5
  },
  {
    type: "fact",
    title: "Projeto principal JARVIS Home AI",
    content: "Projeto principal atual: JARVIS Home AI Assistant. Diretório local: E:\\jarvis-home-assistant. Repositório: https://github.com/juninnzx21/meujarvis.git. Produção frontend: https://jarvis.juninnzxtec.com.br. API oficial: https://apijarvis.juninnzxtec.com.br/api. Webhook WhatsApp/Evolution: https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook.",
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
    title: "Status atual do JARVIS",
    aliases: ["Status do JARVIS ate Fase 6", "Status do JARVIS até Fase 6"],
    content: "O JARVIS está aprovado com ressalvas e evoluído até a fase de Central de Integrações. Possui login, dashboard, status, chat, voz, memórias, tarefas, automações, comandos, rotinas, relatórios, notificações, logs, settings, scheduler automático seguro, backup/restore, scripts operacionais, OpenAI, Gemini fallback, fallback local seguro, módulo financeiro, importação OFX/CSV, PWA/mobile, documentos/RAG preparado, n8n próprio em Docker, EventBus e Central de Integrações.",
    tags: ["jarvis", "status", "aprovado-com-ressalvas", "fase-10", "integracoes"],
    importance: 5
  },
  {
    type: "fact",
    title: "Fase 10 do JARVIS",
    content: "A Fase 10 adicionou fundação JARVIS 100000/10: n8n próprio em Docker, workflows importáveis, EventBus/IntegrationEvent, memória semântica preparada com fallback local, documentos/RAG preparado, CI inicial, hardening, monitoramento, backup/offsite planejado e documentação operacional.",
    tags: ["jarvis", "fase-10", "n8n", "eventbus", "rag", "ci", "hardening"],
    importance: 5
  },
  {
    type: "fact",
    title: "Central de Integrações do JARVIS",
    content: "O JARVIS possui Central de Integrações nas rotas /integrations, /settings/integrations, /integrations/setup-wizard, /integrations/events, /n8n e /whatsapp. Ela permite configurar n8n, WhatsApp/Evolution, Home Assistant, Financeiro, monitoramento, backup e URLs públicas. Segredos são criptografados em Setting e o frontend recebe apenas status/máscara.",
    tags: ["jarvis", "integracoes", "settings", "n8n", "whatsapp", "seguranca"],
    importance: 5
  },
  {
    type: "fact",
    title: "n8n do JARVIS",
    content: "O JARVIS possui n8n próprio em Docker Compose com serviços n8n e n8n-postgres. Localmente usa 127.0.0.1:15678 para o n8n e 127.0.0.1:15433 para o PostgreSQL do n8n. Produção planejada: https://n8njarvis.juninnzxtec.com.br com Caddy apontando para 127.0.0.1:15678, Basic Auth ativo e N8N_ENCRYPTION_KEY forte.",
    tags: ["jarvis", "n8n", "docker", "workflows", "automacao"],
    importance: 5
  },
  {
    type: "fact",
    title: "Workflows n8n do JARVIS",
    content: "Workflows n8n importáveis do JARVIS ficam em n8n/workflows e incluem system alert, daily summary, task created, task overdue, backup completed, finance transaction, statement import, whatsapp command, health monitor e evolution test. Nenhum workflow deve conter credencial real.",
    tags: ["jarvis", "n8n", "workflows", "automacao", "eventos"],
    importance: 5
  },
  {
    type: "fact",
    title: "WhatsApp e Evolution API no JARVIS",
    content: "O webhook oficial WhatsApp/Evolution do JARVIS é https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook. O JARVIS só deve responder ou executar comandos quando a mensagem, legenda ou transcrição tiver a frase 'ei jarvis'. Mensagens de grupo são ignoradas por padrão, fromMe é ignorado para evitar loop e OFX/CSV enviados por WhatsApp devem criar prévia de importação financeira, nunca importação direta.",
    tags: ["jarvis", "whatsapp", "evolution", "webhook", "ei-jarvis", "seguranca"],
    importance: 5
  },
  {
    type: "fact",
    title: "Módulo financeiro do JARVIS",
    aliases: ["Modulo financeiro do JARVIS"],
    content: "O JARVIS possui módulo financeiro com contas bancárias, categorias, lançamentos, assistente guiado, regras, relatórios e importação de extratos OFX/CSV. Importações exigem revisão obrigatória em /finance/import/:id/review. OFX é o formato recomendado; CSV é fallback; PDF é apenas conferência quando não houver parser confiável.",
    tags: ["jarvis", "financeiro", "ofx", "csv", "extrato", "banco-inter"],
    importance: 5
  },
  {
    type: "fact",
    title: "Conta PJ do Inter no contexto financeiro",
    content: "O usuário deseja usar o JARVIS para importar e organizar extratos da conta PJ do Banco Inter, criando ou validando a conta PJ DO INTER, categorizando entradas/saídas, detectando duplicatas, perguntando origem/destino e atualizando saldo somente após confirmação/revisão.",
    tags: ["financeiro", "banco-inter", "pj-do-inter", "extrato", "ofx", "csv"],
    importance: 5
  },
  {
    type: "fact",
    title: "Deploy de produção do JARVIS",
    aliases: ["Deploy JARVIS producao"],
    content: "Produção do JARVIS: frontend público em https://jarvis.juninnzxtec.com.br, servido estaticamente pela Fabweb/DirectAdmin; API oficial em https://apijarvis.juninnzxtec.com.br/api, servida via VPS/Caddy; WhatsApp webhook em https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook. O domínio principal /api/* não deve ser tratado como contrato público.",
    tags: ["jarvis", "deploy", "producao", "fabweb", "vps", "caddy"],
    importance: 5
  },
  {
    type: "fact",
    title: "Portas e produção JARVIS",
    aliases: ["Producao JARVIS VPS"],
    content: "Na produção, o backend/API roda na VPS e deve ficar atrás do Caddy. Portas internas devem ficar presas em 127.0.0.1. O n8n em produção deve usar Caddy para https://n8njarvis.juninnzxtec.com.br apontando para 127.0.0.1:15678, sem publicar a porta diretamente.",
    tags: ["jarvis", "vps", "caddy", "n8n", "portas", "seguranca"],
    importance: 5
  },
  {
    type: "fact",
    title: "Mobile PWA do JARVIS",
    content: "O JARVIS possui PWA instalável com manifest, service worker seguro, ícones, atalhos e tela /mobile-assistant. O service worker não cacheia /api, Authorization, cookies ou dados autenticados. O microfone só é ativado por interação explícita e não existe escuta contínua oculta.",
    tags: ["jarvis", "mobile", "pwa", "android", "seguranca", "voz"],
    importance: 5
  },
  {
    type: "fact",
    title: "Projeto Meta Locadora",
    content: "Meta Locadora é um SaaS Laravel para gestão de frota/locadora, com veículos, clientes, contratos, manutenções, inadimplência, dashboards, relatórios de lucro por carro, planos SaaS, white label, billing, trial, leads, CRM e automações. Domínio usado: controledefrotas.juninnzxtec.com.br.",
    tags: ["meta-locadora", "laravel", "saas", "frotas", "locadora", "controledefrotas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Projeto Controle Financeiro",
    content: "Controle Financeiro é um app financeiro com Laravel, Inertia/Vue, Tailwind, Open Finance sandbox, contas, transações, cartões, metas, orçamentos, relatórios, alertas, admin master, billing sandbox, PWA e API mobile. Domínio usado: controlefinanceiro.juninnzxtec.com.br.",
    tags: ["controle-financeiro", "laravel", "vue", "open-finance", "financeiro", "saas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Projeto Controle de Mercado",
    content: "Controle de Mercado / ERP supermercado é um sistema com produtos, importação por planilha, etiquetas, estoque, compras, fiscal/chave de acesso, caixa, relatórios, dashboard, fornecedores, validade/perdas, help center e páginas públicas. Domínio usado: controlemarcketplace.juninnzxtec.com.br.",
    tags: ["controle-de-mercado", "erp", "supermercado", "laravel", "saas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Projetos comerciais e sites",
    aliases: ["Projetos de sites comerciais"],
    content: "O usuário também trabalha com sites comerciais, landing pages, propostas para empresas, lojas de autopeças, assistência técnica/celulares, CMS estilo WordPress, Elementor/Hello Elementor, painéis admin e apresentações comerciais.",
    tags: ["sites", "landing-page", "wordpress", "elementor", "autopecas", "cms", "propostas"],
    importance: 4
  },
  {
    type: "fact",
    title: "Padrão de deploy Laravel",
    aliases: ["Padrao de deploy Laravel"],
    content: "Comandos recorrentes em deploy Laravel: composer install --no-dev --optimize-autoloader, php artisan migrate --force, php artisan optimize:clear, php artisan optimize, php artisan storage:link, php artisan config:cache, php artisan route:cache e php artisan view:cache.",
    tags: ["laravel", "deploy", "composer", "artisan", "producao"],
    importance: 4
  },
  {
    type: "fact",
    title: "Padrão de deploy Node Docker",
    aliases: ["Padrao de deploy Node Docker"],
    content: "Para projetos Node/Docker, o usuário usa Docker Compose, variáveis em .env, containers com portas internas presas em 127.0.0.1, Caddy para HTTPS, docker compose up -d --build, migrations Prisma, seed, health checks e logs.",
    tags: ["node", "docker", "deploy", "caddy", "prisma", "health-check"],
    importance: 5
  },
  {
    type: "fact",
    title: "Padrão de validação de sistemas",
    aliases: ["Padrao de validacao de sistemas"],
    content: "Rotina recorrente de validação do usuário: npm install, npm run build, npm run test, npm run validate, php artisan test, php artisan route:list, health checks, testes de endpoints, auditoria de rotas, simulação de fluxos, dados fake e relatórios em Markdown.",
    tags: ["validacao", "testes", "build", "health-check", "relatorio", "auditoria"],
    importance: 5
  },
  {
    type: "preference",
    title: "Padrão de comandos PowerShell",
    aliases: ["Padrao de comandos PowerShell"],
    content: "O usuário prefere comandos PowerShell prontos, com Set-Location para o diretório correto, validação após cada etapa, e instruções claras para corrigir erros de permissão, Docker, Prisma, Git, npm e portas.",
    tags: ["powershell", "comandos", "windows", "validacao"],
    importance: 5
  },
  {
    type: "preference",
    title: "Padrão de prompts de auditoria",
    aliases: ["Padrao de prompts de auditoria"],
    content: "Prompts de auditoria devem pedir para o Codex validar seção por seção, container por container, rota por rota, simular interações, inserir dados fictícios, testar CRUDs, health checks, builds, testes, endpoints e gerar relatório APROVADO/NÃO APROVADO.",
    tags: ["codex", "auditoria", "simulacao", "e2e", "relatorio"],
    importance: 5
  },
  {
    type: "preference",
    title: "Padrão de prompts de deploy",
    aliases: ["Padrao de prompts de deploy"],
    content: "Prompts de deploy devem incluir diretório, branch, remoto Git, git status, .gitignore seguro, varredura de segredos, npm/prisma/build/test, docker compose, Caddy/DNS quando aplicável, health checks e relatório final.",
    tags: ["codex", "deploy", "git", "docker", "caddy", "seguranca"],
    importance: 5
  },
  {
    type: "system",
    title: "Dados proibidos em memória comum",
    aliases: ["Dados proibidos em memoria comum"],
    content: "O JARVIS não deve salvar como memória comum: senhas reais, tokens, API keys, JWT_SECRET, chaves SSH privadas, credenciais de VPS, DirectAdmin, banco, GitHub, OpenAI, Gemini, n8n, Evolution API, Home Assistant, dados bancários, cartões, documentos sensíveis ou dumps. Esses dados devem ficar apenas em .env, vault ou gerenciador de senhas.",
    tags: ["seguranca", "proibido", "segredos", "env", "vault"],
    importance: 5
  },
  {
    type: "system",
    title: "Como lidar com informações sensíveis",
    aliases: ["Como lidar com informacoes sensiveis"],
    content: "Se o usuário pedir para armazenar informação sensível, o JARVIS deve alertar o risco e sugerir salvar em vault/gerenciador de senhas. Caso seja necessário referenciar, salvar apenas metadado seguro, como credencial configurada ou acesso existe, sem valor real.",
    tags: ["seguranca", "dados-sensiveis", "vault", "credenciais"],
    importance: 5
  },
  {
    type: "system",
    title: "Respostas sem expor segredos",
    content: "O JARVIS nunca deve exibir valores reais de .env, tokens, API keys, senhas, chaves privadas ou credenciais. Deve responder apenas com configurado/ausente, válido/inválido ou status operacional.",
    tags: ["seguranca", "respostas", "redaction", "env"],
    importance: 5
  },
  {
    type: "reminder",
    title: "Prioridades imediatas do JARVIS",
    aliases: ["Proximas prioridades JARVIS"],
    content: "Próximas prioridades: deployar o commit atual na VPS; configurar Caddy para n8njarvis.juninnzxtec.com.br apontar para 127.0.0.1:15678; preencher credenciais reais pelo painel; configurar Evolution API real; testar WhatsApp com 'ei jarvis status do sistema'; testar envio de OFX/CSV real e confirmar prévia; configurar n8n real; configurar Home Assistant real.",
    tags: ["jarvis", "roadmap", "prioridades", "deploy", "n8n", "whatsapp"],
    importance: 5
  },
  {
    type: "reminder",
    title: "Prioridade de segurança em produção",
    aliases: ["Prioridade de seguranca em producao"],
    content: "Antes de evoluir para uso comercial, o usuário deve rotacionar credenciais compartilhadas, proteger acesso SSH com chave, revisar firewall, garantir que portas internas não estejam públicas, manter Caddy como único ponto público HTTP/HTTPS, configurar backup offsite e monitoramento externo.",
    tags: ["seguranca", "producao", "ssh", "firewall", "caddy", "backup"],
    importance: 5
  }
];
