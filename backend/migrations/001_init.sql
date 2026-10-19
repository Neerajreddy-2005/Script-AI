-- Script-AI 2.0 schema: documents, vector chunks (pgvector), generation records, and email reminders.
-- Run once in the Supabase SQL editor (or psql). Safe to re-run.
--
-- IMPORTANT: vector(768) must equal EMBEDDING_DIM in backend/.env.
-- If you pick an embedding model with a different size, change every "768" below
-- BEFORE the first run (or drop and recreate document_chunks, then re-upload documents).

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists documents (
    id                uuid primary key default gen_random_uuid(),
    owner_id          uuid not null,
    filename          text not null,
    content_type      text not null,
    file_size         integer not null check (file_size > 0),
    content_hash      text not null,
    status            text not null check (status in ('uploaded', 'processing', 'ready', 'failed', 'deleting')),
    chunk_count       integer not null default 0,
    ingestion_version integer not null default 1,
    error_code        text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    -- Re-uploading identical bytes is idempotent per user.
    unique (owner_id, content_hash)
);
create index if not exists documents_owner_idx on documents (owner_id, created_at desc);

create table if not exists document_chunks (
    id                uuid primary key default gen_random_uuid(),
    document_id       uuid not null references documents (id) on delete cascade,
    owner_id          uuid not null,
    chunk_index       integer not null,
    section           text,
    page_number       integer,
    text              text not null,
    embedding         vector(768) not null,
    embedding_model   text not null,
    ingestion_version integer not null default 1,
    tsv               tsvector generated always as (to_tsvector('english', text)) stored,
    unique (document_id, chunk_index)
);
create index if not exists document_chunks_owner_idx on document_chunks (owner_id, document_id);
create index if not exists document_chunks_tsv_idx on document_chunks using gin (tsv);
-- HNSW supports up to 2000 dimensions; for larger embeddings remove this index (exact search still works).
create index if not exists document_chunks_embedding_idx
    on document_chunks using hnsw (embedding vector_cosine_ops);

create table if not exists generations (
    id                 uuid primary key,
    owner_id           uuid not null,
    request            jsonb not null,
    mode               text not null,
    status             text not null check (status in ('succeeded', 'failed')),
    validation         jsonb,
    sources            jsonb,
    provider           text,
    model              text,
    llm_calls          integer,
    input_tokens       integer,
    output_tokens      integer,
    estimated_cost_usd numeric(12, 6),
    duration_ms        integer,
    error_code         text,
    created_at         timestamptz not null default now()
);
create index if not exists generations_owner_idx on generations (owner_id, created_at desc);

-- Email reminders. FastAPI stores them; the n8n "Script-AI Reminders" workflow claims due rows
-- every few minutes through the backend and sends the emails.
create table if not exists reminders (
    id          uuid primary key,
    owner_id    uuid not null,
    email       text not null,
    title       text not null,
    note        text,
    remind_at   timestamptz not null,
    status      text not null default 'pending'
                check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts    integer not null default 0,
    claimed_at  timestamptz,
    sent_at     timestamptz,
    last_error  text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists reminders_due_idx on reminders (status, remind_at);
create index if not exists reminders_owner_idx on reminders (owner_id, remind_at);

-- Row-level security: a signed-in user can only see their own rows when accessing tables
-- directly (e.g. through the Supabase JS client). The backend also filters by owner_id.
-- Skipped automatically on plain Postgres where Supabase's auth schema does not exist.
do $$
begin
    if exists (select 1 from pg_namespace where nspname = 'auth') then
        alter table documents enable row level security;
        alter table document_chunks enable row level security;
        alter table generations enable row level security;
        alter table reminders enable row level security;

        drop policy if exists documents_owner on documents;
        create policy documents_owner on documents
            for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

        drop policy if exists document_chunks_owner on document_chunks;
        create policy document_chunks_owner on document_chunks
            for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

        drop policy if exists generations_owner on generations;
        create policy generations_owner on generations
            for select using (owner_id = auth.uid());

        drop policy if exists reminders_owner on reminders;
        create policy reminders_owner on reminders
            for select using (owner_id = auth.uid());

        -- The browser never reads or writes these tables: all access goes through FastAPI,
        -- which connects as the table owner. Supabase grants anon/authenticated full table
        -- privileges by default, which (with the policies above) would let any signed-in user
        -- write rows straight through the REST API, bypassing upload limits and validation.
        revoke all on documents, document_chunks, generations, reminders from anon, authenticated;
    end if;
end
$$;
