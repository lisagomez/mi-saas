# Tipos de Eventos y Escala de Intención

## Jerarquía de señales (mayor a menor intención)

| Evento | Intención | Por qué |
|--------|-----------|---------|
| `dm` | ★★★★★ 100 pts | El usuario tomó acción — abrió WhatsApp y escribió |
| `share` | ★★★★ 40 pts | Amplificación voluntaria — el contenido resonó tanto que lo quiso difundir |
| `save` | ★★★ 30 pts | Guardó para después — considera comprar pero no ahora |
| `click` | ★★ 15 pts | Tuvo curiosidad suficiente para hacer clic |
| `view` | ★ 5 pts | Solo vio — base de datos de alcance |

## Cuándo no registrar vistas

Las vistas (`view`) tienen bajo valor como señal de intención. Registrarlas solo si:
- Se usan para calcular CTR (clicks / views)
- El volumen de otras métricas es muy bajo y se necesita base de comparación

## Metadata recomendada por tipo de evento

### `click`
```json
{
  "post_id": "Facebook post ID o URL del anuncio",
  "ad_id": "ID del anuncio en Meta Ads Manager",
  "referrer": "URL completa de donde vino el click"
}
```

### `dm`
```json
{
  "phone_last4": "Últimos 4 dígitos del teléfono (no datos completos)",
  "is_new_lead": true,
  "qualification_status": "pending"
}
```

### `save`
```json
{
  "post_id": "Facebook/Instagram post ID",
  "source": "Meta Insights API o manual"
}
```

## UTM para click-to-WhatsApp

Meta Ads no permite UTMs en links de WhatsApp (no hay landing page).
La solución es usar el `source_key` de la campaña como identificador:

```
facebook_campaigns.source_key = 'madres_may_2025'
leads.source = 'fb_madres_may_2025'

→ utm_source  = 'facebook'
→ utm_medium  = 'cpc'
→ utm_content = 'madres_may_2025'  (sin el prefijo 'fb_')
```

Esto permite filtrar eventos por campaña con:
```sql
SELECT * FROM events WHERE utm_content = 'madres_may_2025';
```
