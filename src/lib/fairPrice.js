import { supabase } from './supabase';

// FR-19 — Dynamic (surge) pricing & fair-price index.
// The multiplier reacts to open demand in a service category and is
// bounded to [SURGE_MIN, SURGE_MAX] per the SRS pricing rules.
export const SURGE_MIN = 0.8;
export const SURGE_MAX = 1.5;
const BASELINE_OPEN_JOBS = 3;

// Each open job above the baseline adds +0.15; each job below the
// baseline gives a -0.10 discount. Result is rounded to 2 decimals and
// clamped to the allowed bounds.
export const computeSurgeMultiplier = (openJobs) => {
  const demand = Number(openJobs) || 0;
  const step = demand > BASELINE_OPEN_JOBS ? 0.15 : 0.1;
  const raw = 1 + (demand - BASELINE_OPEN_JOBS) * step;
  const clamped = Math.min(SURGE_MAX, Math.max(SURGE_MIN, raw));
  return Math.round(clamped * 100) / 100;
};

// Fair-price band around the surged midpoint (±10%).
export const computeFairBand = (basePrice, surgeMultiplier) => {
  const base = Number(basePrice) || 0;
  const mid = base * (Number(surgeMultiplier) || 1);
  return {
    fairMid: Math.round(mid),
    fairMin: Math.round(mid * 0.9),
    fairMax: Math.round(mid * 1.1),
  };
};

export const surgeLabel = (surge) => {
  if (surge > 1.05) return 'High demand';
  if (surge < 0.95) return 'Off-peak discount';
  return 'Standard pricing';
};

// Open demand for a category over the last 7 days.
export const fetchOpenDemand = async (categoryId) => {
  if (!categoryId) return 0;
  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .in('status', ['posted', 'matching', 'offered'])
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  if (error) return 0;
  return count || 0;
};

// Recent agreed prices in a category give the reference base price when
// no AI estimate is available.
export const fetchRecentBasePrice = async (categoryId) => {
  if (!categoryId) return null;
  const { data } = await supabase
    .from('jobs')
    .select('agreed_price')
    .eq('category_id', categoryId)
    .not('agreed_price', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  const prices = (data || []).map((row) => Number(row.agreed_price)).filter((p) => p > 0);
  if (!prices.length) return null;
  return Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
};

// Best-effort snapshot log for admin pricing analytics (FR-19 evidence).
export const logFairPriceSnapshot = async ({
  jobId = null,
  categoryId = null,
  origin = null,
  destination = null,
  basePrice,
  surge,
  fairMin = null,
  fairMax = null,
}) => {
  try {
    const { error } = await supabase.rpc('log_pricing_snapshot', {
      target_job_id: jobId,
      target_category_id: categoryId,
      origin_area: origin,
      destination_area: destination,
      base_price: Number(basePrice) || 0,
      surge_value: Number(surge) || 1,
      fair_min: fairMin,
      fair_max: fairMax,
    });
    return error ? null : true;
  } catch {
    return null;
  }
};

// One-call helper: demand + surge + fair band for a category.
export const computeMarketPrice = async (categoryId, basePriceOverride = null) => {
  const [openJobs, recentBase] = await Promise.all([
    fetchOpenDemand(categoryId),
    basePriceOverride ? Promise.resolve(null) : fetchRecentBasePrice(categoryId),
  ]);
  const surge = computeSurgeMultiplier(openJobs);
  const base = Number(basePriceOverride) || Number(recentBase) || 0;
  const band = computeFairBand(base, surge);
  return { openJobs, surge, basePrice: base, ...band };
};
