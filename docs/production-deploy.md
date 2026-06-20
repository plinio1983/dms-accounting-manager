# Produzione Docker

## Variabili

Copia `.env.production.example` in `.env.production` sul server e imposta:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Il file `.env.production` deve esistere sul server: viene usato sia per interpolare il compose sia come `env_file` del container app.

Per build Docker ripetibili è consigliato generare e versionare anche `package-lock.json`:

```bash
npm install --package-lock-only
```

`APP_URL` deve essere il dominio pubblico HTTPS:

```env
APP_URL="https://tabularium.devmash.it"
```

Nel Google Cloud Console aggiungi il redirect URI:

```text
https://tabularium.devmash.it/api/auth/google/callback
```

## Docker compose

Percorso previsto sul server:

```bash
/app/tabularium
```

Il compose di produzione espone l'app solo sulla rete Docker, porta interna `3000`; non pubblica porte sull'host.

Reti Docker:

- `app`: reti esterne `frontend` e `backend`
- `db`: rete esterna `backend`

Il reverse proxy Nginx deve raggiungere il container `tabularium-app` sulla rete `frontend`, porta `3000`.

Avvio:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Applicazione schema Prisma al database di produzione:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma db push
```

## Migrazione dati locale -> server

Sul computer locale crea il dump:

```bash
docker exec dms-spese-ricavi-db pg_dump -U dms -d dms_spese_ricavi --format=custom --no-owner --no-acl > tabularium.dump
tar -czf tabularium-uploads.tar.gz -C public uploads
```

Copia sul server:

```bash
scp tabularium.dump tabularium-uploads.tar.gz user@server:/path/tabularium/
```

Sul server, con i container avviati, ripristina il DB. Questo comando svuota/sostituisce gli oggetti presenti nel DB target:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db sh -c 'pg_restore --clean --if-exists --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < tabularium.dump
```

Ripristina gli upload:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production cp tabularium-uploads.tar.gz app:/tmp/tabularium-uploads.tar.gz
docker compose -f docker-compose.prod.yml --env-file .env.production exec app sh -c 'rm -rf /app/public/uploads/* && tar -xzf /tmp/tabularium-uploads.tar.gz -C /app/public/uploads --strip-components=1'
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Verifica:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma db push
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
```
