# Como ativar login, contratos e localização em tempo real

O app continua funcionando 100% offline e sem login, do jeito que já está,
até você fazer esta configuração. Depois de configurado, ele passa a pedir
login e a mostrar a equipe no mapa para o admin.

## 1. Criar o projeto no Firebase (grátis)

1. Acesse https://console.firebase.google.com e crie um projeto novo.
2. No menu lateral, vá em **Build > Authentication** > aba "Sign-in method"
   e ative o provedor **E-mail/senha**.
3. Vá em **Build > Firestore Database** > "Criar banco de dados" (modo
   produção, região mais próxima, ex: `southamerica-east1`).
4. Em Firestore Database > aba **Regras**, cole o conteúdo do arquivo
   `firestore.rules` deste projeto e publique.

## 2. Pegar a configuração do app web

1. No Firebase Console, vá em **Configurações do projeto** (ícone de
   engrenagem) > aba "Geral" > role até "Seus apps" > clique no ícone `</>`
   para adicionar um app Web.
2. Copie os valores gerados (`apiKey`, `authDomain`, etc.) para um arquivo
   `.env.local` na raiz de `painel-operacional/`, seguindo o modelo de
   `.env.local.example`.

## 3. Criar a primeira conta (admin) — feito uma única vez, manualmente

Por segurança, o app não tem um botão para "criar conta admin" pela web
(assim ninguém consegue se autopromover a admin). Quem tem acesso ao Console
do Firebase (nem precisa ser o próprio admin) cria a conta do admin direto
por lá — no caso, a conta do **Matheus Zimbaldi**:

1. **Authentication > Users > Add user**: informe o e-mail e uma senha para
   o Matheus (pode ser uma senha provisória — ele consegue trocar depois,
   se você adicionar isso no Firebase, ou você mesmo troca no Console).
2. Copie o **User UID** gerado.
3. **Firestore Database > Iniciar coleção** `usuarios` > documento com ID
   igual ao UID copiado, com os campos:
   - `uid` (string) = o mesmo UID
   - `email` (string) = o e-mail do Matheus
   - `nome` (string) = `Matheus Zimbaldi`
   - `role` (string) = `admin`
   - `criadoEm` (número) = qualquer timestamp, ex: `0`

Só isso — o Matheus **não precisa de acesso ao Console do Firebase**, só do
e-mail/senha que você criou para ele. Repasse esse login para ele instalar o
app e entrar. A partir daí ele já vê o botão **Admin** no topo e, de lá,
usa "+ Adicionar operador" para criar o login de cada operador da equipe
(inclusive o seu, se você também for operador em campo) — isso já é feito
pelo próprio app, sem precisar voltar ao Console.

## 4. Rebuild e publicar

Depois de preencher o `.env.local`, rode o build normalmente
(`npm run build`) — as chaves ficam embutidas no app estático. Isso é
esperado: a chave do Firebase Web não é secreta, a segurança de verdade está
nas regras do Firestore (`firestore.rules`).

## 5. Localização em tempo real: permissões no iPhone/Android

Cada operador precisa permitir localização para o Safari/Chrome ao instalar
o app na tela de início. No iOS, isso normalmente só funciona com o app
aberto/em primeiro plano (PWA no Safari não tem localização em segundo
plano como um app nativo da App Store) — então o mais confiável é manter o
app aberto durante o expediente.
