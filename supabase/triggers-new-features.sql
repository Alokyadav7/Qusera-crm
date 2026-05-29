-- Trigger to automatically calculate AI lead score in database
CREATE OR REPLACE FUNCTION calculate_ai_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  v_enabled boolean;
  v_score integer := 10;
  v_val numeric;
BEGIN
  -- Check if feature flag is active
  SELECT COALESCE(
    (SELECT plan_limits.limit_value = 1 OR plan_limits.limit_value = -1
     FROM subscriptions
     JOIN plan_limits ON plan_limits.plan_id = subscriptions.plan_id
     WHERE subscriptions.company_id = NEW.company_id AND plan_limits.feature_key = 'ai_scoring_enabled'
     LIMIT 1),
    false
  ) INTO v_enabled;

  IF NOT v_enabled THEN
    NEW.ai_score := 0;
    RETURN NEW;
  END IF;

  -- 1. Intent Score
  IF NEW.buying_intent = 'high' THEN
    v_score := v_score + 30;
  ELSIF NEW.buying_intent = 'medium' THEN
    v_score := v_score + 15;
  ELSE
    v_score := v_score + 5;
  END IF;

  -- 2. Budget Score
  v_val := COALESCE(NEW.deal_value, NEW.estimated_budget, 0);
  IF v_val >= 500000 THEN
    v_score := v_score + 25;
  ELSIF v_val >= 100000 THEN
    v_score := v_score + 15;
  END IF;

  -- 3. Source Score
  IF NEW.source = 'referral' THEN
    v_score := v_score + 25;
  ELSIF NEW.source = 'website' THEN
    v_score := v_score + 15;
  ELSE
    v_score := v_score + 10;
  END IF;

  -- 4. Sentiment Score
  IF NEW.sentiment_score >= 0.3 THEN
    v_score := v_score + 10;
  ELSIF NEW.sentiment_score <= -0.3 THEN
    v_score := v_score - 10;
  END IF;

  -- Clamp score
  IF v_score > 100 THEN
    v_score := 100;
  ELSIF v_score < 0 THEN
    v_score := 0;
  END IF;

  NEW.ai_score := v_score;
  NEW.ai_score_updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_ai_lead_score ON leads;
CREATE TRIGGER trg_calculate_ai_lead_score
  BEFORE INSERT OR UPDATE OF buying_intent, deal_value, estimated_budget, source, sentiment_score
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ai_lead_score();
