import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgPolicy, // Importação da função pgPolicy
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase"; // Importações específicas do Supabase
import { profiles } from "~/database/schemas/profiles-schema"; // Importa o schema de profiles

export const owners = pgTable(
  "owners",
  {
    // Coluna 'id': UUID PRIMARY KEY com valor padrão gerado por uuid_generate_v4()
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Coluna 'profile_id': UUID, pode ser NULL, com chave estrangeira para public.profiles(id)
    // e comportamento ON DELETE SET NULL
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),

    // Coluna 'name': TEXT NOT NULL
    name: text("name").notNull(),

    // Coluna 'email': TEXT UNIQUE
    email: text("email").unique(),

    // Coluna 'phone': TEXT
    phone: text("phone"),

    // Coluna 'document_id': TEXT UNIQUE
    documentId: text("document_id").unique(),

    // Coluna 'bank_details': JSONB
    bankDetails: jsonb("bank_details"),

    // Coluna 'created_at': TIMESTAMP WITH TIME ZONE com valor padrão NOW()
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),

    // Coluna 'updated_at': TIMESTAMP WITH TIME ZONE com valor padrão NOW()
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Índices para otimização de consulta
    index("idx_owners_email").on(table.email),
    index("idx_owners_profile_id").on(table.profileId),

    // --- Políticas de RLS para a tabela 'owners' ---

    // Política: Gerentes podem ver todos os proprietários
    pgPolicy("Managers can view all owners", {
      for: "select",
      to: authenticatedRole, // Aplica-se a usuários autenticados
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Política: Proprietários podem ver apenas seu próprio registro (se tiverem profile_id)
    pgPolicy("Owners can view their own record", {
      for: "select",
      to: authenticatedRole, // Aplica-se a usuários autenticados
      using: sql`${table.profileId} = auth.uid()`,
    }),

    // Política: Gerentes podem criar proprietários
    pgPolicy("Managers can create owners", {
      for: "insert",
      to: authenticatedRole, // Aplica-se a usuários autenticados
      withCheck: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Política: Gerentes podem atualizar proprietários
    pgPolicy("Managers can update owners", {
      for: "update",
      to: authenticatedRole, // Aplica-se a usuários autenticados
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Adicional: Proprietários podem atualizar seu próprio registro (se tiverem profile_id)
    // Esta política é importante para permitir que os próprios proprietários gerenciem seus dados.
    pgPolicy("Owners can update their own record", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.profileId} = auth.uid()`,
      withCheck: sql`${table.profileId} = auth.uid()`, // Garante que o registro atualizado ainda pertença ao usuário
    }),

    // Adicional: Gerentes podem deletar proprietários
    pgPolicy("Managers can delete owners", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),
  ]
);

// Type inference for the owners table
export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;
