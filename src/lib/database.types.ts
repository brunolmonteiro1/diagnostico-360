// Gerado por `npm run gen:types` a partir do schema em supabase/migrations/.
// NÃO editar à mão: qualquer ajuste aqui se perde na próxima geração e passa a
// mentir sobre o que o banco realmente aceita. Alterou o schema? Crie migration
// e rode `npm run gen:types` de novo.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          logo_url: string | null
          n_colaboradores: number | null
          nome_fantasia: string
          observacoes: string | null
          owner_id: string
          porte: string | null
          razao_social: string | null
          segmento: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          n_colaboradores?: number | null
          nome_fantasia: string
          observacoes?: string | null
          owner_id: string
          porte?: string | null
          razao_social?: string | null
          segmento?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          n_colaboradores?: number | null
          nome_fantasia?: string
          observacoes?: string | null
          owner_id?: string
          porte?: string | null
          razao_social?: string | null
          segmento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          aberto_em: string | null
          created_at: string
          email: string | null
          enviado_em: string | null
          id: string
          lembretes_enviados: number
          nome_sugerido: string | null
          rodada_id: string
          token: string
        }
        Insert: {
          aberto_em?: string | null
          created_at?: string
          email?: string | null
          enviado_em?: string | null
          id?: string
          lembretes_enviados?: number
          nome_sugerido?: string | null
          rodada_id: string
          token?: string
        }
        Update: {
          aberto_em?: string | null
          created_at?: string
          email?: string | null
          enviado_em?: string | null
          id?: string
          lembretes_enviados?: number
          nome_sugerido?: string | null
          rodada_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "rodadas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas: {
        Row: {
          ajuda: string | null
          area_scope: string[]
          ativa: boolean
          bloco: Database["public"]["Enums"]["pergunta_bloco"]
          codigo: string
          dimensao: string | null
          enunciado: string
          id: string
          invertida: boolean
          obrigatoria: boolean
          opcoes: Json | null
          ordem: number
          permite_nao_sei: boolean
          peso: number
          tipo: Database["public"]["Enums"]["pergunta_tipo"]
          vinculo_scope: string[]
        }
        Insert: {
          ajuda?: string | null
          area_scope?: string[]
          ativa?: boolean
          bloco: Database["public"]["Enums"]["pergunta_bloco"]
          codigo: string
          dimensao?: string | null
          enunciado: string
          id?: string
          invertida?: boolean
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          permite_nao_sei?: boolean
          peso?: number
          tipo: Database["public"]["Enums"]["pergunta_tipo"]
          vinculo_scope?: string[]
        }
        Update: {
          ajuda?: string | null
          area_scope?: string[]
          ativa?: boolean
          bloco?: Database["public"]["Enums"]["pergunta_bloco"]
          codigo?: string
          dimensao?: string | null
          enunciado?: string
          id?: string
          invertida?: boolean
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          permite_nao_sei?: boolean
          peso?: number
          tipo?: Database["public"]["Enums"]["pergunta_tipo"]
          vinculo_scope?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string
        }
        Relationships: []
      }
      relatorios: {
        Row: {
          editado_manualmente: boolean
          gerado_em: string
          gerado_por: string | null
          id: string
          narrativa: Json | null
          narrativa_editada: Json | null
          rodada_id: string
          scores: Json | null
          versao: number
        }
        Insert: {
          editado_manualmente?: boolean
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          narrativa?: Json | null
          narrativa_editada?: Json | null
          rodada_id: string
          scores?: Json | null
          versao?: number
        }
        Update: {
          editado_manualmente?: boolean
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          narrativa?: Json | null
          narrativa_editada?: Json | null
          rodada_id?: string
          scores?: Json | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "rodadas"
            referencedColumns: ["id"]
          },
        ]
      }
      respondentes: {
        Row: {
          area_principal: string | null
          areas_secundarias: string[]
          autoavaliacao_confianca: number | null
          cargo: string | null
          concluido_em: string | null
          consentimento_lgpd: boolean
          convite_id: string | null
          duracao_segundos: number | null
          email: string | null
          id: string
          iniciado_em: string | null
          n_liderados: number | null
          nome: string | null
          reporta_para: string | null
          rodada_id: string
          status: Database["public"]["Enums"]["respondente_status"]
          tempo_empresa: string | null
          vinculo: Database["public"]["Enums"]["respondente_vinculo"] | null
        }
        Insert: {
          area_principal?: string | null
          areas_secundarias?: string[]
          autoavaliacao_confianca?: number | null
          cargo?: string | null
          concluido_em?: string | null
          consentimento_lgpd?: boolean
          convite_id?: string | null
          duracao_segundos?: number | null
          email?: string | null
          id?: string
          iniciado_em?: string | null
          n_liderados?: number | null
          nome?: string | null
          reporta_para?: string | null
          rodada_id: string
          status?: Database["public"]["Enums"]["respondente_status"]
          tempo_empresa?: string | null
          vinculo?: Database["public"]["Enums"]["respondente_vinculo"] | null
        }
        Update: {
          area_principal?: string | null
          areas_secundarias?: string[]
          autoavaliacao_confianca?: number | null
          cargo?: string | null
          concluido_em?: string | null
          consentimento_lgpd?: boolean
          convite_id?: string | null
          duracao_segundos?: number | null
          email?: string | null
          id?: string
          iniciado_em?: string | null
          n_liderados?: number | null
          nome?: string | null
          reporta_para?: string | null
          rodada_id?: string
          status?: Database["public"]["Enums"]["respondente_status"]
          tempo_empresa?: string | null
          vinculo?: Database["public"]["Enums"]["respondente_vinculo"] | null
        }
        Relationships: [
          {
            foreignKeyName: "respondentes_convite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respondentes_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "rodadas"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          id: string
          nao_sei: boolean
          pergunta_id: string
          respondente_id: string
          respondido_em: string
          valor_num: number | null
          valor_opcoes: string[] | null
          valor_texto: string | null
        }
        Insert: {
          id?: string
          nao_sei?: boolean
          pergunta_id: string
          respondente_id: string
          respondido_em?: string
          valor_num?: number | null
          valor_opcoes?: string[] | null
          valor_texto?: string | null
        }
        Update: {
          id?: string
          nao_sei?: boolean
          pergunta_id?: string
          respondente_id?: string
          respondido_em?: string
          valor_num?: number | null
          valor_opcoes?: string[] | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_respondente_id_fkey"
            columns: ["respondente_id"]
            isOneToOne: false
            referencedRelation: "respondentes"
            referencedColumns: ["id"]
          },
        ]
      }
      rodadas: {
        Row: {
          abertura_em: string | null
          anonima: boolean
          cliente_id: string
          created_at: string
          id: string
          mensagem_abertura: string | null
          modulos_ativos: string[]
          prazo_em: string | null
          status: Database["public"]["Enums"]["rodada_status"]
          titulo: string
        }
        Insert: {
          abertura_em?: string | null
          anonima?: boolean
          cliente_id: string
          created_at?: string
          id?: string
          mensagem_abertura?: string | null
          modulos_ativos?: string[]
          prazo_em?: string | null
          status?: Database["public"]["Enums"]["rodada_status"]
          titulo: string
        }
        Update: {
          abertura_em?: string | null
          anonima?: boolean
          cliente_id?: string
          created_at?: string
          id?: string
          mensagem_abertura?: string | null
          modulos_ativos?: string[]
          prazo_em?: string | null
          status?: Database["public"]["Enums"]["rodada_status"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rodadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dearmor: { Args: { "": string }; Returns: string }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      owns_cliente: { Args: { p_cliente_id: string }; Returns: boolean }
      owns_respondente: { Args: { p_respondente_id: string }; Returns: boolean }
      owns_rodada: { Args: { p_rodada_id: string }; Returns: boolean }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
    }
    Enums: {
      pergunta_bloco:
        | "identificacao"
        | "universal"
        | "area"
        | "lideranca"
        | "encerramento"
      pergunta_tipo:
        | "likert5"
        | "frequencia5"
        | "escala0a10"
        | "unica"
        | "multipla"
        | "texto_curto"
        | "texto_longo"
        | "numero"
      respondente_status: "em_andamento" | "concluido"
      respondente_vinculo:
        | "socio"
        | "gestor"
        | "colaborador"
        | "terceirizado"
        | "estagiario"
        | "franqueadora"
      rodada_status: "rascunho" | "aberta" | "encerrada" | "arquivada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pergunta_bloco: [
        "identificacao",
        "universal",
        "area",
        "lideranca",
        "encerramento",
      ],
      pergunta_tipo: [
        "likert5",
        "frequencia5",
        "escala0a10",
        "unica",
        "multipla",
        "texto_curto",
        "texto_longo",
        "numero",
      ],
      respondente_status: ["em_andamento", "concluido"],
      respondente_vinculo: [
        "socio",
        "gestor",
        "colaborador",
        "terceirizado",
        "estagiario",
        "franqueadora",
      ],
      rodada_status: ["rascunho", "aberta", "encerrada", "arquivada"],
    },
  },
} as const

