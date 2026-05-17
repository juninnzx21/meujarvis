# Feedback e Aprendizado do JARVIS

O usuario pode avaliar respostas e registrar preferencias pelo painel `/brain/feedback` ou pelo chat.

Exemplos:

- `isso esta errado`
- `corrige isso`
- `prefiro que voce responda direto`
- `salve isso como padrao`

O Brain registra feedback redigido em `SystemLog`. Quando `savePreference=true` e o conteudo nao parece sensivel, uma memoria de preferencia e criada.

Dados proibidos:

- senhas;
- tokens;
- API keys;
- JWT_SECRET;
- credenciais de VPS, banco, DirectAdmin, OpenAI, Gemini, n8n, Evolution ou Home Assistant;
- dados bancarios sensiveis;
- dumps e documentos pessoais sensiveis.

