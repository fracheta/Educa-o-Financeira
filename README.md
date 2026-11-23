# Controle Financeiro

Sistema completo de controle financeiro pessoal construído com **React**, **TypeScript**, **Tailwind CSS**, **Recharts** e **Firebase (Firestore + Authentication)**, com persistência local em **IndexedDB** para uso imediato sem login.

## Funcionalidades

- **Dashboard Financeiro**: indicadores em tempo real (`Saldo Total`, `Despesas Abertas`, `Pagas (Mês)`, `Saldo Disponível`, `Total de Receitas`, `Total de Despesas`, `Resultado do Mês` e `Movimentações`).
- **Saldos por Origem**: acompanhamento de saldo por conta/banco (`Itaú`, `Caixa`, `Nubank`, `Dinheiro Físico` + criação de novos bancos).
- **CRUD Completo**: cadastro, visualização de detalhes, edição, quitação rápida (`Marcar como Paga`) e exclusão com confirmação.
- **Consulta e Filtros**: busca por descrição, filtro por tipo (receita/despesa), status, categoria, origem e período (`DD/MM/AAAA`), além de exportação CSV.
- **Gráficos e Diagnósticos**:
  - Receitas versus Despesas
  - Despesas por Categoria
  - Evolução Financeira Mensal
  - Movimentações ao Longo do Tempo
- **Banco de Dados Real**:
  - **Firebase Firestore** com regras de segurança (`firestore.rules`) quando autenticado com Google.
  - **IndexedDB** local persistente quando usado sem login, com sincronização automática ao conectar a conta Google.

## Executando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

### Scripts úteis

- `npm test` — executa os testes unitários da lógica financeira
- `npm run lint` — verifica tipos TypeScript (`tsc --noEmit`)
- `npm run build` — gera o build de produção em `dist/`

## Publicando no GitHub Pages / Vercel / Netlify

1. O arquivo `vite.config.ts` já está configurado com `base: './'`, permitindo hospedar tanto na raiz quanto em subpastas do GitHub Pages.
2. Caso utilize o login com Google em um novo domínio (ex: `seu-usuario.github.io` ou `meu-app.vercel.app`), adicione esse domínio no **Firebase Console**:
   `Authentication → Settings → Authorized domains → Add domain`.
3. Se quiser usar outro projeto Firebase próprio, substitua as configurações públicas em `firebase-applet-config.json` e implante as regras de `firestore.rules`.
