
ALTER TABLE content_outcomes
  ADD CONSTRAINT fk_content_outcomes_insight
    FOREIGN KEY (proactive_insight_id)
    REFERENCES proactive_insights(id)
    ON DELETE SET NULL;

ALTER TABLE content_outcomes
  ADD CONSTRAINT fk_content_outcomes_avatar
    FOREIGN KEY (avatar_id)
    REFERENCES avatars(id)
    ON DELETE SET NULL;
