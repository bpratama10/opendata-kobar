export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      catalog_data_classifications: {
        Row: {
          code: string
          name: string
          notes: string | null
        }
        Insert: {
          code: string
          name: string
          notes?: string | null
        }
        Update: {
          code?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      catalog_dataset_spatial_coverage: {
        Row: {
          dataset_id: string
          spatial_id: string
        }
        Insert: {
          dataset_id: string
          spatial_id: string
        }
        Update: {
          dataset_id?: string
          spatial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_dataset_spatial_coverage_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "catalog_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_dataset_spatial_coverage_spatial_id_fkey"
            columns: ["spatial_id"]
            isOneToOne: false
            referencedRelation: "spatial_units"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_dataset_tags: {
        Row: {
          dataset_id: string
          tag_id: string
        }
        Insert: {
          dataset_id: string
          tag_id: string
        }
        Update: {
          dataset_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_dataset_tags_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "catalog_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_dataset_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "catalog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_dataset_themes: {
        Row: {
          dataset_id: string
          theme_id: string
        }
        Insert: {
          dataset_id: string
          theme_id: string
        }
        Update: {
          dataset_id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_dataset_themes_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "catalog_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_dataset_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "catalog_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_distributions: {
        Row: {
          availability: Database["public"]["Enums"]["availability_type"] | null
          byte_size: number | null
          checksum_sha256: string | null
          created_at: string
          id: string
          media_type: string
          resource_id: string
          storage_uri: string | null
          version: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability_type"] | null
          byte_size?: number | null
          checksum_sha256?: string | null
          created_at?: string
          id?: string
          media_type: string
          resource_id: string
          storage_uri?: string | null
          version: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability_type"] | null
          byte_size?: number | null
          checksum_sha256?: string | null
          created_at?: string
          id?: string
          media_type?: string
          resource_id?: string
          storage_uri?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_distributions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "catalog_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_metadata: {
        Row: {
          abstract: string | null
          classification_code:
            | Database["public"]["Enums"]["classification_type"]
            | null
          contact_email: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          deleted_at: string | null
          description: string | null
          id: string
          is_priority: boolean | null
          is_published: boolean | null
          keywords: Json | null
          language: string | null
          last_updated_display: string | null
          license_code: string | null
          maintainers: Json | null
          org_id: string | null
          priority_dataset_id: string | null
          publication_status:
            | Database["public"]["Enums"]["publication_status"]
            | null
          publisher_org_id: string | null
          slug: string
          source_name: string | null
          sync_lock: boolean | null
          temporal_end: string | null
          temporal_start: string | null
          title: string
          unpublish_request_reason: string | null
          update_frequency_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abstract?: string | null
          classification_code?:
            | Database["public"]["Enums"]["classification_type"]
            | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_priority?: boolean | null
          is_published?: boolean | null
          keywords?: Json | null
          language?: string | null
          last_updated_display?: string | null
          license_code?: string | null
          maintainers?: Json | null
          org_id?: string | null
          priority_dataset_id?: string | null
          publication_status?:
            | Database["public"]["Enums"]["publication_status"]
            | null
          publisher_org_id?: string | null
          slug: string
          source_name?: string | null
          sync_lock?: boolean | null
          temporal_end?: string | null
          temporal_start?: string | null
          title: string
          unpublish_request_reason?: string | null
          update_frequency_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abstract?: string | null
          classification_code?:
            | Database["public"]["Enums"]["classification_type"]
            | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_priority?: boolean | null
          is_published?: boolean | null
          keywords?: Json | null
          language?: string | null
          last_updated_display?: string | null
          license_code?: string | null
          maintainers?: Json | null
          org_id?: string | null
          priority_dataset_id?: string | null
          publication_status?:
            | Database["public"]["Enums"]["publication_status"]
            | null
          publisher_org_id?: string | null
          slug?: string
          source_name?: string | null
          sync_lock?: boolean | null
          temporal_end?: string | null
          temporal_start?: string | null
          title?: string
          unpublish_request_reason?: string | null
          update_frequency_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_metadata_priority_dataset_id_fkey"
            columns: ["priority_dataset_id"]
            isOneToOne: false
            referencedRelation: "priority_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_catalog_metadata_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_catalog_metadata_license_code"
            columns: ["license_code"]
            isOneToOne: false
            referencedRelation: "lisensi"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_catalog_metadata_org_id"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_catalog_metadata_publisher_org_id"
            columns: ["publisher_org_id"]
            isOneToOne: false
            referencedRelation: "org_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_catalog_metadata_update_frequency_code"
            columns: ["update_frequency_code"]
            isOneToOne: false
            referencedRelation: "freq_upd"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_catalog_metadata_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_resources: {
        Row: {
          aggregation_method: string | null
          chart_type: string | null
          created_at: string
          dataset_id: string
          description: string | null
          frequency: string | null
          id: string
          indicator_title: string | null
          interpretation: string | null
          is_timeseries: boolean | null
          name: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          schema_json: Json | null
          time_dimension: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          aggregation_method?: string | null
          chart_type?: string | null
          created_at?: string
          dataset_id: string
          description?: string | null
          frequency?: string | null
          id?: string
          indicator_title?: string | null
          interpretation?: string | null
          is_timeseries?: boolean | null
          name: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          schema_json?: Json | null
          time_dimension?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          aggregation_method?: string | null
          chart_type?: string | null
          created_at?: string
          dataset_id?: string
          description?: string | null
          frequency?: string | null
          id?: string
          indicator_title?: string | null
          interpretation?: string | null
          is_timeseries?: boolean | null
          name?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          schema_json?: Json | null
          time_dimension?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_resources_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "catalog_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      catalog_themes: {
        Row: {
          code: string
          icon_url: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          icon_url?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          icon_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      data_indicators: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          order_no: number
          resource_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          order_no?: number
          resource_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          order_no?: number
          resource_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_indicators_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "catalog_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_points: {
        Row: {
          attrs: Json
          created_at: string
          distribution_id: string | null
          distribution_key: string | null
          id: string
          indicator_id: string
          period_label: string
          period_start: string
          qualifier: Database["public"]["Enums"]["qualifier_type"]
          resource_id: string
          row_dimension_value: string | null
          sub_header_value: string | null
          time_grain: Database["public"]["Enums"]["time_grain_type"]
          top_header_value: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          attrs?: Json
          created_at?: string
          distribution_id?: string | null
          distribution_key?: string | null
          id?: string
          indicator_id: string
          period_label: string
          period_start: string
          qualifier?: Database["public"]["Enums"]["qualifier_type"]
          resource_id: string
          row_dimension_value?: string | null
          sub_header_value?: string | null
          time_grain: Database["public"]["Enums"]["time_grain_type"]
          top_header_value?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          attrs?: Json
          created_at?: string
          distribution_id?: string | null
          distribution_key?: string | null
          id?: string
          indicator_id?: string
          period_label?: string
          period_start?: string
          qualifier?: Database["public"]["Enums"]["qualifier_type"]
          resource_id?: string
          row_dimension_value?: string | null
          sub_header_value?: string | null
          time_grain?: Database["public"]["Enums"]["time_grain_type"]
          top_header_value?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_points_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "catalog_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_points_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "data_indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_points_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "catalog_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_table_view_columns: {
        Row: {
          column_label: string
          column_order: number
          created_at: string
          id: string
          is_hidden: boolean
          period_start: string
          resource_id: string
          time_grain: Database["public"]["Enums"]["time_grain_type"]
          updated_at: string
        }
        Insert: {
          column_label: string
          column_order?: number
          created_at?: string
          id?: string
          is_hidden?: boolean
          period_start: string
          resource_id: string
          time_grain: Database["public"]["Enums"]["time_grain_type"]
          updated_at?: string
        }
        Update: {
          column_label?: string
          column_order?: number
          created_at?: string
          id?: string
          is_hidden?: boolean
          period_start?: string
          resource_id?: string
          time_grain?: Database["public"]["Enums"]["time_grain_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_table_view_columns_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "catalog_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      freq_upd: {
        Row: {
          code: string
          name: string
          notes: string | null
        }
        Insert: {
          code: string
          name: string
          notes?: string | null
        }
        Update: {
          code?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      gov_dataset_policies: {
        Row: {
          constraint_text: string | null
          created_at: string
          dataset_id: string
          details: Json | null
          id: string
          rule: Database["public"]["Enums"]["policy_rule"]
          subject_id: string | null
          subject_type: Database["public"]["Enums"]["policy_subject_type"]
        }
        Insert: {
          constraint_text?: string | null
          created_at?: string
          dataset_id: string
          details?: Json | null
          id?: string
          rule: Database["public"]["Enums"]["policy_rule"]
          subject_id?: string | null
          subject_type: Database["public"]["Enums"]["policy_subject_type"]
        }
        Update: {
          constraint_text?: string | null
          created_at?: string
          dataset_id?: string
          details?: Json | null
          id?: string
          rule?: Database["public"]["Enums"]["policy_rule"]
          subject_id?: string | null
          subject_type?: Database["public"]["Enums"]["policy_subject_type"]
        }
        Relationships: [
          {
            foreignKeyName: "gov_dataset_policies_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "catalog_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      lisensi: {
        Row: {
          code: string
          name: string
          notes: string | null
          url: string | null
        }
        Insert: {
          code: string
          name: string
          notes?: string | null
          url?: string | null
        }
        Update: {
          code?: string
          name?: string
          notes?: string | null
          url?: string | null
        }
        Relationships: []
      }
      org_organizations: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          parent_id: string | null
          short_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          parent_id?: string | null
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          parent_id?: string | null
          short_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_organizations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      org_user_roles: {
        Row: {
          role_id: string
          user_id: string
        }
        Insert: {
          role_id: string
          user_id: string
        }
        Update: {
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users: {
        Row: {
          attributes: Json | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          org_id: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_dataset_logs: {
        Row: {
          action: Database["public"]["Enums"]["priority_action"]
          actor_id: string | null
          id: number
          notes: string | null
          org_id: string | null
          priority_dataset_id: string | null
          timestamp: string
        }
        Insert: {
          action: Database["public"]["Enums"]["priority_action"]
          actor_id?: string | null
          id?: number
          notes?: string | null
          org_id?: string | null
          priority_dataset_id?: string | null
          timestamp?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["priority_action"]
          actor_id?: string | null
          id?: number
          notes?: string | null
          org_id?: string | null
          priority_dataset_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_dataset_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_dataset_logs_priority_dataset_id_fkey"
            columns: ["priority_dataset_id"]
            isOneToOne: false
            referencedRelation: "priority_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_datasets: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_org: string | null
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          data_depth_level: string | null
          data_type: string | null
          id: string
          name: string
          operational_definition: string | null
          producing_agency: string | null
          proposing_agency: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["dataset_status"]
          update_schedule: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_org?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          data_depth_level?: string | null
          data_type?: string | null
          id?: string
          name: string
          operational_definition?: string | null
          producing_agency?: string | null
          proposing_agency?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["dataset_status"]
          update_schedule?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_org?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          data_depth_level?: string | null
          data_type?: string | null
          id?: string
          name?: string
          operational_definition?: string | null
          producing_agency?: string | null
          proposing_agency?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["dataset_status"]
          update_schedule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_datasets_assigned_org_fkey"
            columns: ["assigned_org"]
            isOneToOne: false
            referencedRelation: "org_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      spatial_units: {
        Row: {
          code: string
          id: string
          level: Database["public"]["Enums"]["spatial_level"]
          metadata: Json | null
          name: string
          parent_id: string | null
        }
        Insert: {
          code: string
          id?: string
          level: Database["public"]["Enums"]["spatial_level"]
          metadata?: Json | null
          name: string
          parent_id?: string | null
        }
        Update: {
          code?: string
          id?: string
          level?: Database["public"]["Enums"]["spatial_level"]
          metadata?: Json | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spatial_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "spatial_units"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          context: Json | null
          created_at: string
          id: number
          object_id: string | null
          object_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          context?: Json | null
          created_at?: string
          id?: number
          object_id?: string | null
          object_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          context?: Json | null
          created_at?: string
          id?: number
          object_id?: string | null
          object_type?: string | null
        }
        Relationships: []
      }
      telemetry_downloads: {
        Row: {
          channel: Database["public"]["Enums"]["download_channel"]
          client_info: Json | null
          created_at: string
          distribution_id: string
          id: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["download_channel"]
          client_info?: Json | null
          created_at?: string
          distribution_id: string
          id?: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["download_channel"]
          client_info?: Json | null
          created_at?: string
          distribution_id?: string
          id?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_downloads_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "catalog_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_views: {
        Row: {
          created_at: string
          dataset_id: string
          id: number
          ip_address: unknown
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: number
          ip_address?: unknown
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: number
          ip_address?: unknown
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_views_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "catalog_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: { Args: never; Returns: string }
      can_log_download: {
        Args: {
          p_distribution_id: string
          p_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_modify_user_role: {
        Args: { _target_role_code: string }
        Returns: boolean
      }
      fn_convert_priority_to_dataset: {
        Args: {
          p_assignee_org_id: string
          p_priority_dataset_id: string
          p_user_id: string
        }
        Returns: string
      }
      get_dataset_download_count: {
        Args: { dataset_id_param: string }
        Returns: number
      }
      get_dataset_view_count: {
        Args: { dataset_id_param: string }
        Returns: number
      }
      get_datasets_download_counts: {
        Args: { dataset_ids: string[] }
        Returns: {
          dataset_id: string
          download_count: number
        }[]
      }
      get_datasets_view_counts: {
        Args: { dataset_ids: string[] }
        Returns: {
          dataset_id: string
          view_count: number
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: { Args: { user_id: string }; Returns: string }
      has_admin_or_walidata_role: { Args: never; Returns: boolean }
      has_role: { Args: { _role_code: string }; Returns: boolean }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      slugify: { Args: { v_text: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      availability_type: "online" | "offline" | "archived"
      classification_type: "PUBLIC" | "TERBATAS"
      dataset_status: "unassigned" | "claimed" | "assigned"
      download_channel: "WEB" | "API" | "DIRECT"
      org_type: "WALIDATA" | "PRODUSEN_DATA" | "KOORDINATOR" | "LAINNYA"
      policy_rule: "VIEW" | "DOWNLOAD" | "UPDATE" | "ADMIN"
      policy_subject_type: "USER" | "ROLE" | "ORG"
      priority_action: "assign" | "claim" | "update" | "unassign"
      publication_status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED"
      qualifier_type: "NA" | "OFFICIAL" | "PRELIM" | "EST"
      resource_type: "TABLE" | "FILE" | "API" | "LINK"
      spatial_level: "PROV" | "KAB" | "KEC" | "DESA" | "KEL" | "OTHER"
      time_grain_type: "YEAR" | "QUARTER" | "MONTH"
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
      availability_type: ["online", "offline", "archived"],
      classification_type: ["PUBLIC", "TERBATAS"],
      dataset_status: ["unassigned", "claimed", "assigned"],
      download_channel: ["WEB", "API", "DIRECT"],
      org_type: ["WALIDATA", "PRODUSEN_DATA", "KOORDINATOR", "LAINNYA"],
      policy_rule: ["VIEW", "DOWNLOAD", "UPDATE", "ADMIN"],
      policy_subject_type: ["USER", "ROLE", "ORG"],
      priority_action: ["assign", "claim", "update", "unassign"],
      publication_status: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"],
      qualifier_type: ["NA", "OFFICIAL", "PRELIM", "EST"],
      resource_type: ["TABLE", "FILE", "API", "LINK"],
      spatial_level: ["PROV", "KAB", "KEC", "DESA", "KEL", "OTHER"],
      time_grain_type: ["YEAR", "QUARTER", "MONTH"],
    },
  },
} as const
