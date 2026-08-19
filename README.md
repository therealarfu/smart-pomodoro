# Pomodoro Inteligente

App pessoal de pomodoro com conta, timer persistente (funciona mesmo se você fechar o site), calendário por dia e notas.

Stack: React + Vite no front-end, Supabase (banco de dados + autenticação) no back-end.

---

## 1. Criar o projeto no Supabase

1. Crie uma conta grátis em https://supabase.com e clique em **New project**.
2. Espere o projeto terminar de ser criado (leva ~1 minuto).
3. No menu lateral, vá em **SQL Editor** → **New query**, cole todo o conteúdo do arquivo
   [`supabase/schema.sql`](./supabase/schema.sql) deste projeto e clique em **Run**.
   Isso cria as tabelas `sessions`, `day_notes` e `timer_state`, já com segurança por usuário (RLS).
4. Vá em **Project Settings → API**. Copie:
   - **Project URL** → vai virar `VITE_SUPABASE_URL`
   - **anon public key** → vai virar `VITE_SUPABASE_ANON_KEY`
5. (Opcional, recomendado para uso rápido e pessoal) Em **Authentication → Providers → Email**,
   desative "Confirm email" se não quiser precisar clicar num link de confirmação toda vez que
   criar uma conta nova. Para uso só seu isso é totalmente seguro.

> A `anon key` é feita para ser pública — ela vai parecer no código do site depois de compilado,
> e isso é esperado. Quem protege seus dados são as regras de RLS do passo 3 (cada pessoa só
> acessa as próprias linhas), não o segredo da chave.

---

## 2. Rodar localmente

Pré-requisito: [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
npm install
cp .env.example .env.local
```

Abra `.env.local` e cole a URL e a chave que você copiou do Supabase.

```bash
npm run dev
```

Abra o endereço que aparecer no terminal (algo como `http://localhost:5173`).

---

## 3. Colocar no GitHub

```bash
git init
git add .
git commit -m "Pomodoro Inteligente"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

(`.env.local` não vai junto — ele está no `.gitignore` de propósito, para você não vazar sua chave por engano. As duas opções de deploy abaixo pedem essas variáveis de outro jeito.)

---

## 4A. Deploy no Vercel (mais simples e recomendado)

1. Entre em https://vercel.com, faça login com o GitHub e clique em **Add New → Project**.
2. Selecione o repositório que você acabou de subir.
3. O Vercel já detecta que é um projeto Vite — não precisa mudar nada no build.
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em **Deploy**. Em menos de um minuto você recebe uma URL tipo
   `https://seu-projeto.vercel.app` — funciona igual no celular e no PC.

Qualquer novo `git push` para `main` atualiza o site automaticamente.

---

## 4B. Deploy no GitHub Pages

Tem duas formas — escolha uma.

### Opção manual (mais rápida de configurar)

```bash
npm install
echo "VITE_SUPABASE_URL=sua-url" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=sua-chave" >> .env.local
npm run deploy
```

Isso builda o site e publica a pasta `dist` na branch `gh-pages` (usando o pacote `gh-pages`,
já incluso no `package.json`). Depois:

1. No GitHub, vá em **Settings → Pages**.
2. Em **Source**, escolha a branch `gh-pages` e a pasta `/ (root)`.
3. Espere ~1 minuto. Seu site fica em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.

Sempre que quiser atualizar o site depois de mudar algo, rode `npm run deploy` de novo.

### Opção automática (GitHub Actions)

Este projeto já inclui um workflow em `.github/workflows/deploy-gh-pages.yml` que builda e
publica sozinho a cada `git push` na branch `main`. Para ativar:

1. No GitHub, vá em **Settings → Secrets and variables → Actions → New repository secret** e
   adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Vá em **Settings → Pages** e em **Source** escolha **GitHub Actions**.
3. Dê um `git push` — o site é publicado sozinho a partir daí.

---

## Como o timer sobrevive a fechar o site

O timer não conta o tempo com um contador local — ele guarda **o horário em que começou**
(`run_start`) no banco de dados. Toda vez que a página carrega, o tempo decorrido é recalculado
comparando esse horário com o relógio atual. Por isso funciona mesmo se você fechar a aba,
desligar a tela do celular, ou entrar de outro aparelho: o estado real está no banco, não na
memória do navegador.

## Como a conta continua logada

Diferente da versão em artefato do Claude, aqui o login usa autenticação de verdade do Supabase,
que guarda a sessão no navegador. Você só precisa entrar de novo se sair manualmente (botão
"Sair"), limpar os dados do navegador, ou não usar o site por muito tempo (a sessão expira e é
renovada automaticamente enquanto você estiver ativo).

## Estrutura do projeto

```
src/
  App.jsx              # estado principal: sessão, timer, mês, dia selecionado
  main.jsx             # ponto de entrada do React
  styles.css           # todo o visual do app
  lib/
    supabase.js        # cliente do Supabase
    format.js           # datas, formatação de tempo, cálculo do timer
  components/
    AuthScreen.jsx      # tela de entrar / criar conta
    TimerCard.jsx        # o timer circular
    CalendarCard.jsx     # calendário do mês
    DayDetailCard.jsx    # horas do dia, atividades e notas
    HourglassMark.jsx    # o logo
supabase/
  schema.sql            # tabelas e regras de segurança para colar no Supabase
```
