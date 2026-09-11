-- Runs once on first initialisation of the postgres data volume.
-- Gives the internal Evolution API service its own database so it never
-- shares tables with the Prisma-managed SaaS schema.
CREATE DATABASE evolution;
