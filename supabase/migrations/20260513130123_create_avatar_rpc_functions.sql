
-- Centroide de la biblioteca (excluyendo un avatar específico)
CREATE OR REPLACE FUNCTION get_avatars_centroid(exclude_id uuid DEFAULT NULL)
RETURNS vector(1536)
LANGUAGE sql STABLE AS $$
  SELECT avg(embedding)::vector(1536)
  FROM avatars
  WHERE embedding IS NOT NULL
    AND (exclude_id IS NULL OR id != exclude_id);
$$;

-- Insights más divergentes respecto a un vector negado
CREATE OR REPLACE FUNCTION find_divergent_insights(
  negated_centroid vector(1536),
  limit_count      int DEFAULT 5
)
RETURNS TABLE (
  insight_type    text,
  content         text,
  evidence_url    text,
  from_avatar     text,
  divergence_score double precision
)
LANGUAGE sql STABLE AS $$
  SELECT
    ai.insight_type,
    ai.content,
    ai.evidence_url,
    a.name                              AS from_avatar,
    (ai.embedding <=> negated_centroid) AS divergence_score
  FROM avatar_insights ai
  JOIN avatars a ON a.id = ai.avatar_id
  WHERE ai.embedding IS NOT NULL
    AND ai.id NOT IN (
      SELECT parent_insight_id
      FROM avatar_insights
      WHERE parent_insight_id IS NOT NULL
    )
  ORDER BY ai.embedding <=> negated_centroid
  LIMIT limit_count;
$$;

-- Contradicciones: pares de insights del mismo tipo con distancia > 0.7
CREATE OR REPLACE FUNCTION find_contradictions(limit_count int DEFAULT 3)
RETURNS TABLE (
  insight_a text,
  insight_b text,
  avatar_a  text,
  avatar_b  text,
  distance  double precision
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.content       AS insight_a,
    b.content       AS insight_b,
    av_a.name       AS avatar_a,
    av_b.name       AS avatar_b,
    (a.embedding <=> b.embedding) AS distance
  FROM avatar_insights a
  JOIN avatar_insights b
    ON a.insight_type = b.insight_type AND a.id < b.id
  JOIN avatars av_a ON av_a.id = a.avatar_id
  JOIN avatars av_b ON av_b.id = b.avatar_id
  WHERE a.embedding IS NOT NULL
    AND b.embedding IS NOT NULL
    AND (a.embedding <=> b.embedding) > 0.7
  ORDER BY distance DESC
  LIMIT limit_count;
$$;
