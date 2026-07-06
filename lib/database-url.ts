const DEFAULT_SCHEMA = "public";
const BUILD_DATABASE_URL = "postgresql://tabularium_build:tabularium_build@localhost:5432/tabularium_build?schema=public";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} non impostata. Controlla il file .env`);
  }
  return value;
}

export function getDatabaseUrl() {
  if (process.env.TABULARIUM_ALLOW_BUILD_DATABASE_URL === "1") {
    return BUILD_DATABASE_URL;
  }

  const host = requiredEnv("POSTGRES_HOST");
  const port = process.env.POSTGRES_PORT ?? "5432";
  const user = requiredEnv("POSTGRES_USER");
  const password = requiredEnv("POSTGRES_PASSWORD");
  const database = requiredEnv("POSTGRES_DB");
  const schema = process.env.POSTGRES_SCHEMA ?? DEFAULT_SCHEMA;

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?schema=${encodeURIComponent(schema)}`;
}
