# Fix Prisma generated client

Se `npm run db:seed` restituisce:

```text
Cannot find module './generated/prisma/client'
```

significa che Prisma Client non è stato generato nella cartella `generated/prisma`.

In questa versione gli script sono stati corretti in modo che `db:seed` esegua automaticamente `prisma generate` prima del seed.

Comandi consigliati in locale:

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:sync
npm run db:seed
npm run dev
```

Se il database locale ha già tabelle vecchie e vuoi ripartire pulito:

```bash
npm run db:reset-local
npm run db:sync
npm run db:seed
npm run dev
```
