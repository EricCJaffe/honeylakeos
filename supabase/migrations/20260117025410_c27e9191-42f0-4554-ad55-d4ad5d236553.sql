-- Health Scoring v2 - Add weight and threshold configuration

-- Add weight_percent to framework_health_metrics
ALTER TABLE public.framework_health_metrics
ADD COLUMN IF NOT EXISTS weight_percent integer DEFAULT 0 CHECK (weight_percent >= 0 AND weight_percent <= 100);

-- Add overall health thresholds to frameworks
ALTER TABLE public.frameworks
ADD COLUMN IF NOT EXISTS health_thresholds jsonb DEFAULT '{"green": 80, "yellow": 50}'::jsonb;

-- Create index for enabled metrics lookup
CREATE INDEX IF NOT EXISTS idx_health_metrics_enabled 
ON public.framework_health_metrics(framework_id, enabled) 
WHERE enabled = true;

-- Comment for documentation
COMMENT ON COLUMN public.framework_health_metrics.weight_percent IS 'Weight of this metric in overall health score (0-100). Total enabled weights should sum to <= 100.';
COMMENT ON COLUMN public.frameworks.health_thresholds IS 'Overall health score thresholds: {green: number, yellow: number}. Score >= green = green, >= yellow = yellow, else red.';