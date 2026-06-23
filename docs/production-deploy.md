# Produzione Docker

## Variabili

Copia `.env.production.example` in `.env.production` sul server e imposta:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `APP_URL`
- `CRON_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Il file `.env.production` deve esistere sul server: viene usato sia per interpolare il compose sia come `env_file` del container app.

Per build Docker ripetibili è consigliato generare e versionare anche `package-lock.json`:

```bash
npm install --package-lock-only
```

Non committare `.env.production`: contiene segreti reali ed e' ignorato da Git.

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

Il reverse proxy Nginx deve raggiungere il container `tabularium` sulla rete `frontend`, porta `3000`.
Il traffico interno verso Next.js e' HTTP; HTTPS deve terminare su Nginx:

```nginx
location / {
    proxy_pass http://tabularium:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Il compose assegna all'app l'alias `tabularium` sulla rete Docker `frontend`; non serve usare HTTPS tra Nginx e container.

## Procedura deploy

Strategia iniziale: build dell'immagine direttamente sul server da repository Git. Non e' necessario pubblicare l'immagine su GitHub Container Registry per andare in produzione; il registry conviene in una fase successiva, quando si vuole una pipeline CI/CD con immagini taggate e rollback.

Server:

```text
178.18.248.213
```

Percorso progetto:

```bash
/app/tabularium
```

Connessione SSH dal repository locale:

```bash
ssh -i .devops/contabo_rsa root@178.18.248.213
```

Sul server, una tantum:

```bash
mkdir -p /app/tabularium
cd /app/tabularium
```

Porta il codice sul server con `git clone` o `git pull` nel percorso `/app/tabularium`. Il file `.env.production` va creato direttamente sul server partendo da `.env.production.example`.

Prima partenza o aggiornamento:

```bash
cd /app/tabularium
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma db push
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
```

Deploy successivi:

```bash
cd /app/tabularium
git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma db push
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Verifica HTTP dal server, passando da Nginx o dalla rete Docker:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec app wget -qO- http://127.0.0.1:3000/login
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
