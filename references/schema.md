# CancioBot — Database Schema
## Proyecto: mi-saas (Supabase)
## Tablas: 27 | Todas con RLS habilitado ✅
## Generado: 2026-05-12

---

## Dominio: Core (CRITICAL)

### leads (CRITICAL — entrada del funnel)
Lead de WhatsApp. Cada número de teléfono es único. Ancla todo el sistema.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | gen_random_uuid() |
| `phone` | varchar UNIQUE | Número WhatsApp |
| `source` | varchar | default `'facebook'` |
| `qualification_status` | varchar | `pending` → `calificado` → `no_calificado` |
| `qualified_at` | timestamptz | nullable |
| `first_message_at` | timestamptz | default now() |
| `origin` | varchar | nullable — país de origen del cliente |
| `residence` | varchar | nullable — país de residencia |
| `created_at` | timestamptz | |

**Referenciado por**: `orders`, `conversations`, `ai_usage`, `nurturing_list`, `rebuys`

---

### orders (CRITICAL — pedido principal)
Un pedido por lead (UNIQUE). Máquina de estados del flujo conversacional.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `lead_id` | uuid FK → leads.id UNIQUE | 1:1 con lead |
| `status` | varchar | Ver estados abajo |
| `story_text` | text | Historia acumulada del cliente |
| `musical_style` | varchar | nullable |
| `ai_cost_usd` | numeric | nullable |
| `payment_proof_url` | text | nullable — URL del comprobante |
| `payment_confirmed_at` | timestamptz | nullable |
| `payment_confirmed_by` | uuid FK → auth.users | nullable |
| `song_delivered_at` | timestamptz | nullable |
| `price_label` | text | nullable — precio asignado |
| `created_at` / `updated_at` | timestamptz | |

**Estados válidos** (flujo principal):
```
recopilando_historia → recopilando_estilo → aclarando_detalles → generando_letra
→ letra_generada → pago_pendiente → pago_confirmado → entregado
```
**Estados video** (bifurcación después de pago_confirmado):
```
→ recopilando_fotos → generando_video → video_listo → video_pago_enviado → entregado
   video_rechazado (cierre) | requiere_procesamiento_manual
```

**Referenciado por**: `songs`, `videos`, `order_photos`, `ai_usage`

---

### songs (CRITICAL — canción generada)
Letra e audio del pedido. Relacionada 1:1 con order.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `order_id` | uuid FK → orders.id | |
| `lyrics_text` | text | Letra generada por IA |
| `model_used` | varchar | nullable — modelo OpenRouter |
| `music_prompt` | text | nullable — prompt para Suno |
| `musicapi_task_id` | text | nullable — ID tarea MusicAPI |
| `audio_url` | text | nullable — preview (URL pública) |
| `audio_url_full` | text | nullable — canción completa |
| `submit_attempts` | int | default 0 — reintentos MusicAPI |
| `created_at` | timestamptz | |

---

### videos (CRITICAL — video personalizado)
Video ffmpeg con fotos del cliente. 1:1 con order.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `order_id` | uuid FK → orders.id UNIQUE | |
| `status` | varchar | `pendiente` → `recopilando_fotos` → `generando` → `listo` → `entregado` \| `fallido` |
| `payment_status` | varchar | `pendiente` → `comprobante_enviado` → `confirmado` |
| `price` | numeric | nullable |
| `payment_proof_url` | text | nullable |
| `replicate_id` | text | nullable — legado |
| `video_storage_path` | text | nullable — ruta en Storage |
| `youtube_url` | text | nullable — URL YouTube unlisted |
| `photo_count` | int | default 0 |
| `error_message` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

---

### order_photos
Fotos subidas por el cliente para el video. N por order.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `order_id` | uuid FK → orders.id | |
| `storage_path` | text | Ruta en Supabase Storage |
| `public_url` | text | URL pública |
| `sort_order` | int | default 0 |
| `meta_media_id` | text | nullable — ID media de WhatsApp |
| `created_at` | timestamptz | |

---

### conversations
Historial completo de mensajes WhatsApp por lead.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `lead_id` | uuid FK → leads.id | |
| `role` | varchar | `user` \| `assistant` |
| `content_text` | text | nullable |
| `content_audio_url` | text | nullable |
| `message_id_whatsapp` | varchar | nullable — ID mensaje Meta |
| `created_at` | timestamptz | |

---

### profiles (CRITICAL — usuarios internos)
Panel de control. Roles del equipo. 1:1 con auth.users.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK FK → auth.users.id | |
| `email` | text | |
| `full_name` | text | nullable |
| `avatar_url` | text | nullable |
| `role` | user_role ENUM | `creativo` \| `admin_pagos` \| `administrador` \| `agente_investigador` (default: `creativo`) |
| `created_at` / `updated_at` | timestamptz | |

---

### nurturing_list
Leads no calificados para seguimiento futuro.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `lead_id` | uuid FK → leads.id UNIQUE | |
| `reason` | text | nullable |
| `added_at` | timestamptz | |

---

## Dominio: Catálogos (Configurables)

### promotions_catalog
Promociones activas por ocasión especial.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `occasion` | text | Ej: "Día de las Madres" |
| `description` | text | nullable |
| `discount_percent` | numeric | nullable |
| `discount_fixed_mxn` | numeric | nullable |
| `valid_from` / `valid_to` | date | |
| `is_active` | boolean | default true |
| `whatsapp_template_name` | text | nullable — template Meta para > 24h |
| `created_at` / `updated_at` | timestamptz | |

**Referenciado por**: `rebuys.promotion_id`

---

### preferences_catalog
Directives de prompt por región musical y estilo.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `regions` | text[] | Países/regiones de origen (`'{}'::text[]`) |
| `styles` | text[] | Estilos musicales |
| `directives` | text | Instrucciones para el prompt de IA |
| `sort_order` | int | default 100 |
| `is_active` | boolean | default true |
| `created_at` / `updated_at` | timestamptz | |

---

### budgets
Presupuesto mensual por categoría.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `category` | text | `ai_tokens` \| `marketing` \| `suscripciones` \| `operacion` |
| `period_month` | date | Primer día del mes |
| `limit_usd` | numeric | nullable |
| `limit_mxn` | numeric | nullable |
| `notes` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

---

### expenses
Gastos reales registrados para el Agente Financiero.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `category` | text | `marketing` \| `suscripciones` \| `operacion` |
| `description` | text | |
| `amount_mxn` | numeric | |
| `expense_date` | date | default CURRENT_DATE |
| `created_by` | uuid FK → auth.users | nullable |
| `created_at` | timestamptz | |

---

### business_domain
Fórmulas y benchmarks de negocio para el Agente Financiero.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text UNIQUE | Ej: "CAC", "LTV", "ROI" |
| `formula` | text | Fórmula exacta en texto |
| `description` | text | nullable |
| `category` | text | `rentabilidad` \| `experiencia` \| `operacion` (default: `rentabilidad`) |
| `is_active` | boolean | default true |
| `created_at` / `updated_at` | timestamptz | |

---

## Dominio: IA y Agentes

### ai_usage
Log de cada llamada a IA para control de budget.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `lead_id` | uuid FK → leads.id | nullable |
| `order_id` | uuid FK → orders.id | nullable |
| `model` | varchar | Ej: `openai/gpt-4o` |
| `tokens_input` / `tokens_output` | int | nullable |
| `cost_usd` | numeric | nullable |
| `created_at` | timestamptz | |

**Referenciado por**: `agent_reports.ai_usage_id`

---

### agent_reports
Reportes generados por los agentes automáticos.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `agent_type` | text | `investigator` \| `financial` \| `promotions` |
| `report_json` | jsonb | Reporte completo |
| `ai_usage_id` | uuid FK → ai_usage.id | nullable |
| `generated_at` | timestamptz | |

---

### competitors
Datos de competidores para el Agente Investigador.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `price` | text | nullable |
| `proposal` | text | nullable |
| `advantages` / `disadvantages` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

---

### rebuys
Historial de campañas de recompra enviadas a un lead.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `lead_id` | uuid FK → leads.id | |
| `promotion_id` | uuid FK → promotions_catalog.id | nullable |
| `sent_at` | timestamptz | |
| `status` | text | `sent` \| `failed` |

> **Regla**: Para excluir leads con recompra reciente → `WHERE sent_at > now() - interval '30 days'`

---

## Dominio: Marketing

### facebook_campaigns
Campañas de Meta Ads con `source_key` único para atribución.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `campaign_id_meta` | text | nullable — ID en Meta |
| `source_key` | text UNIQUE | Ej: `fb_corridos_mayo`. Usado en `leads.source` como `fb_{source_key}` |
| `start_date` / `end_date` | date | |
| `budget_usd` | numeric | nullable |
| `is_active` | boolean | default true |
| `created_at` / `updated_at` | timestamptz | |

**Referenciado por**: `campaign_spend.campaign_id`

---

### campaign_spend
Gasto diario real por campaña.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK → facebook_campaigns.id | |
| `spend_date` | date | |
| `amount_usd` | numeric | |
| `notes` | text | nullable |
| `created_by` | uuid FK → auth.users | nullable |
| `created_at` | timestamptz | |

---

### pricing_campaigns
Precios asignados por campaña/segmento de lead.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `campaign_number` | int | |
| `campaign_name` | text | |
| `price_label` | text | Ej: `"$49 USD"` |
| `valid_from` | timestamptz | default now() |
| `valid_until` | timestamptz | nullable |
| `assignment` | text | `all` \| `new_leads` \| `specific` |
| `lead_ids` | uuid[] | Para `assignment = 'specific'` |
| `is_active` | boolean | default true |
| `created_by` | uuid FK → auth.users | nullable |
| `created_at` | timestamptz | |

---

## Dominio: Notificaciones PWA

### push_subscriptions
Subscripciones Web Push por usuario.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | nullable |
| `endpoint` / `p256dh` / `auth` | text | Credenciales VAPID |
| `device_name` / `browser` / `user_agent` | text | nullable |
| `created_at` / `last_used_at` | timestamptz | |

---

### notifications
Notificaciones enviadas a usuarios internos.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `type` / `title` | text | |
| `body` | text | nullable |
| `data` | jsonb | default `'{}'` |
| `read` | boolean | default false |
| `created_at` | timestamptz | |

---

## Dominio: Storage

### storage_config
Configuración de límites y limpieza por bucket.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `bucket_name` | text UNIQUE | |
| `limit_mb` | int | default 500 |
| `cleanup_after_days` | int | default 30 |
| `created_at` / `updated_at` | timestamptz | |

---

### storage_cleanup_log
Log de ejecuciones del cron `/api/storage/cleanup`.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `ran_at` | timestamptz | |
| `deleted_files` | int | default 0 |
| `freed_mb` | numeric | nullable |
| `triggered_by` | text | default `'cron'` |
| `details` | jsonb | nullable |

---

## Dominio: UI

### app_launcher_registry
Apps del App Launcher. Configurable sin tocar código.
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `key` | text UNIQUE | Identificador único de la app |
| `label` | text | Texto visible |
| `icon` | text | Emoji |
| `href` | text | URL interna o externa |
| `external` | boolean | default false — si true → `target="_blank"` |
| `category` | text | Grupo visual (`Dashboard`, `Catálogos`, `Herramientas`) |
| `category_order` | int | default 0 — orden de los grupos |
| `sort_order` | int | default 0 — orden dentro del grupo |
| `enabled` | boolean | default true |
| `created_at` | timestamptz | |

> Para agregar una app: `INSERT INTO app_launcher_registry (key, label, icon, href, category, category_order, sort_order) VALUES (...)`

---

## Dominio: Legacy

### pedidos *(tabla original, pre-refactor)*
Estructura anterior al flujo conversacional. Mantiene enum `product_type` y `order_status` propios.
No conectada al flujo activo — usar `orders` para todo lo nuevo.

### plantillas_prompts *(tabla original)*
Plantillas de prompts por género musical. Reemplazada por `preferences_catalog`.
No conectada al flujo activo.

---

## Relaciones Clave

```
auth.users
  └── profiles (1:1)
  └── push_subscriptions (1:N)
  └── notifications (1:N)

leads
  ├── orders (1:1) ──── songs (1:N)
  │                └── videos (1:1)
  │                └── order_photos (1:N)
  │                └── ai_usage (1:N)
  ├── conversations (1:N)
  ├── nurturing_list (1:1)
  ├── rebuys (1:N) ──── promotions_catalog
  └── ai_usage (1:N) ── agent_reports

facebook_campaigns
  └── campaign_spend (1:N)
```

## ENUMs Definidos

| ENUM | Valores |
|------|---------|
| `user_role` | `creativo`, `admin_pagos`, `administrador`, `agente_investigador` |
| `product_type` (legacy) | `corrido`, `balada`, `especial` |
| `tono_voz` (legacy) | `alegre`, `nostalgico`, `belico`, `romantico` |
