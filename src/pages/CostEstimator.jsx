import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Plus, Bot, ArrowLeft, Briefcase } from 'lucide-react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const TRADES = [
  { value: 'handyman', label: 'Handyman / General Repairs', defaultLabor: 150, defaultContingency: 10 },
  { value: 'plumbing', label: 'Plumbing', defaultLabor: 200, defaultContingency: 10 },
  { value: 'electrical', label: 'Electrical', defaultLabor: 220, defaultContingency: 10 },
  { value: 'masonry', label: 'Masonry / Concreting', defaultLabor: 180, defaultContingency: 15 },
  { value: 'carpentry', label: 'Carpentry / Joinery', defaultLabor: 200, defaultContingency: 10 },
  { value: 'painting', label: 'Painting & Decorating', defaultLabor: 160, defaultContingency: 10 },
  { value: 'heavy-haulage', label: 'Heavy Haulage / Freight', defaultLabor: 300, defaultContingency: 15 },
  { value: 'cleaning', label: 'Cleaning Services', defaultLabor: 120, defaultContingency: 5 },
  { value: 'custom', label: 'Custom / Other', defaultLabor: 150, defaultContingency: 10 },
];

const TRANSPORT_MODES = [
  { value: 'truck-light', label: 'Truck (Light)', ratePerKm: 25 },
  { value: 'truck-heavy', label: 'Truck (Heavy)', ratePerKm: 45 },
  { value: 'cargo-train', label: 'Cargo Train', ratePerKm: 15 },
  { value: 'boat-barge', label: 'Boat / Barge', ratePerKm: 20 },
  { value: 'air-freight', label: 'Air Freight', ratePerKm: 90 },
  { value: 'donkey-cart', label: 'Donkey Cart (Local)', ratePerKm: 10 },
];

const REGIONS = ['Addis Ababa', 'Oromia', 'Amhara', 'Tigray', 'SNNP', 'Sidama', 'Other'];

const money = (v) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(Number(v) || 0);

const CostEstimator = () => {
  const { jobId } = useParams();
  const ctx = useOutletContext();
  const user = ctx?.user;
  const [estimate, setEstimate] = useState(null);
  const [items, setItems] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [newItem, setNewItem] = useState({ item_name: '', quantity: '', unit: '', unit_price: '' });

  const [trade, setTrade] = useState('handyman');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('150');
  const [transportDistance, setTransportDistance] = useState('');
  const [transportMode, setTransportMode] = useState('truck-light');
  const [transportRate, setTransportRate] = useState('25');
  const [region, setRegion] = useState('Addis Ababa');
  const [contingencyPct, setContingencyPct] = useState('10');

  const standalone = !jobId;

  const tradeDefaults = TRADES.find(t => t.value === trade);

  useEffect(() => {
    const d = TRADES.find(t => t.value === trade);
    setContingencyPct(String(d?.defaultContingency || 10));
  }, [trade]);

  const load = useCallback(async () => {
    if (!jobId) return;
    setError('');
    const { data: estRows } = await supabase.from('cost_estimates').select('*, cost_estimate_items(*)').eq('job_id', jobId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!estRows) { setEstimate(null); setItems([]); } else { setEstimate(estRows); setItems(estRows.cost_estimate_items || []); }
  }, [jobId]);

  useEffect(() => { load() }, [jobId, load]);

  const handleAIGenerate = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gemini-cost-estimator', {
        body: {
          trade,
          materials: items.map(it => ({ name: it.item_name, quantity: it.quantity, unit: it.unit, unitPrice: it.unit_price })),
          transportKm: parseFloat(transportDistance) || 0,
          transportMode,
          laborHours: parseFloat(laborHours) || 0,
          region,
          contingencyPercent: parseInt(contingencyPct) || 10,
          photoUrl: photoUrl || undefined,
        },
      });

      if (fnError) throw fnError;
      const est = data?.estimate || data;
      if (est?.materials?.length) {
        setItems(est.materials.map(m => ({
          id: Date.now() + Math.random(),
          item_name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          unit_price: m.unitPriceETB || 0,
          subtotal: m.totalETB || (m.quantity * (m.unitPriceETB || 0)),
          _aiConfidence: m.confidence,
          _aiSource: m.source,
          _aiAlternative: m.cheaperAlternative
        })));
      }
      if (est?.labor?.hourlyRateETB) setLaborRate(String(est.labor.hourlyRateETB));
      if (est?.transport?.ratePerKmETB) setTransportRate(String(est.transport.ratePerKmETB));
      setEstimate(est);
    } catch (err) {
      setError(err.message || 'AI estimate failed');
    } finally {
      setAiLoading(false);
    }
  };

  const saveItems = async () => {
    if (!jobId) return;
    setError('');
    const mTotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
    const lTotal = (parseFloat(laborHours) || 0) * (tradeDefaults?.defaultLabor || 150);
    const tRate = TRANSPORT_MODES.find(t => t.value === transportMode)?.ratePerKm || 25;
    const tTotal = (parseFloat(transportDistance) || 0) * tRate;
    const cTotal = (mTotal + lTotal + tTotal) * (parseFloat(contingencyPct) || 0) / 100;
    const gTotal = mTotal + lTotal + tTotal + cTotal;

    try {
      const { error: estError } = await supabase.from('cost_estimates').upsert({
        job_id: jobId,
        materials_total: mTotal,
        labor_total: lTotal,
        transport_total: tTotal,
        contingency_total: cTotal,
        grand_total: gTotal,
        trade,
        labor_hours: parseFloat(laborHours) || 0,
        transport_distance_km: parseFloat(transportDistance) || 0,
        transport_mode: transportMode,
        region,
        contingency_pct: parseFloat(contingencyPct) || 0,
      }, { onConflict: 'job_id' });

      if (estError) throw estError;

      const { data: saved } = await supabase.from('cost_estimates').select('id').eq('job_id', jobId).single();
      if (!saved) throw new Error('Failed to retrieve saved estimate');

      await supabase.from('cost_estimate_items').delete().eq('estimate_id', saved.id);
      const itemsToInsert = items.map(it => ({
        estimate_id: saved.id,
        item_name: it.item_name,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        subtotal: it.quantity * it.unit_price,
      }));
      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('cost_estimate_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      setFlash('Estimate saved successfully.');
      load();
    } catch (err) {
      setError(err.message || 'Failed to save estimate');
    }
  };

  const addItem = () => {
    if (!newItem.item_name.trim() || !newItem.quantity || !newItem.unit_price) { setError('Item name, quantity, and unit price are required.'); return; }
    const item = { id: Date.now(), item_name: newItem.item_name.trim(), quantity: Number(newItem.quantity), unit: newItem.unit.trim(), unit_price: Number(newItem.unit_price) };
    item.subtotal = item.quantity * item.unit_price;
    setItems([...items, item]);
    setNewItem({ item_name: '', quantity: '', unit: '', unit_price: '' });
  };

  const removeItem = (index) => { setItems(items.filter((_, i) => i !== index)); };

  const materialsTotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const laborTotal = Number(laborHours) * Number(laborRate || 0);
  const transportTotal = Number(transportDistance) * Number(transportRate || 0);
  const subtotal = materialsTotal + laborTotal + transportTotal;
  const contingencyTotal = subtotal * (Number(contingencyPct || 0) / 100);
  const grandTotal = subtotal + contingencyTotal;

  return (
    <div className='mx-auto max-w-[1000px] space-y-8'>
      <Link to={standalone ? '/dashboard' : '/dashboard/jobs/' + jobId} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy'>
        <ArrowLeft className='h-4 w-4' /> {standalone ? 'Back to dashboard' : 'Back to job'}
      </Link>

      <section className='rounded-xl border border-slate-200 bg-white p-5 sm:p-7'>
        <h2 className='flex items-center gap-2 text-lg font-bold text-brand-navy'><Briefcase className='h-5 w-5' /> Job Details</h2>
        <p className='mt-2 text-sm text-slate-500'>{standalone ? 'Plan your budget before posting. Pick your trade for smart defaults, then adjust anything.' : 'Set up labor, transport and materials for this job.'}</p>

        <div className='mt-6 grid gap-4 sm:grid-cols-3'>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Trade / Job type</label><select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass}>{TRADES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Labor (hours)</label><input type='number' min='0' step='0.5' value={laborHours} onChange={(e) => setLaborHours(e.target.value)} placeholder='0' className={inputClass} /></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Labor rate (ETB/hr)</label><input type='number' min='0' step='100' value={laborRate} onChange={(e) => setLaborRate(e.target.value)} className={inputClass} /></div>
        </div>

        <div className='mt-6 grid gap-4 sm:grid-cols-3'>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Transport distance (km)</label><input type='number' min='0' step='1' value={transportDistance} onChange={(e) => setTransportDistance(e.target.value)} placeholder='0 km' className={inputClass} /></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Transport mode</label><select value={transportMode} onChange={(e) => setTransportMode(e.target.value)} className={inputClass}>{TRANSPORT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Rate per km (ETB)</label><input type='number' min='0' step='1' value={transportRate} onChange={(e) => setTransportRate(e.target.value)} className={inputClass} /></div>
        </div>

        <div className='mt-6 grid gap-4 sm:grid-cols-3'>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Contingency (%)</label><input type='number' min='0' step='1' value={contingencyPct} onChange={(e) => setContingencyPct(e.target.value)} placeholder='10' className={inputClass} /><p className='mt-1 text-xs text-slate-400'>Buffer for price changes & waste</p></div>
        </div>
      </section>

      <section aria-label='Line items' className='rounded-xl border border-slate-200 bg-white p-5 sm:p-7'>
        <h2 className='flex items-center gap-2 text-lg font-bold text-brand-navy'><Plus className='h-4 w-4' /> Materials & Supplies</h2>
        <p className='mt-2 text-sm text-slate-500'>Add each material or supply item with quantity and unit price.</p>

        <div className='mt-6 grid gap-3 sm:grid-cols-4'>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Item name</label><input type='text' maxLength={200} value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} placeholder='e.g. Cement bags' className={inputClass} /></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Qty</label><input type='number' min='0.01' step='0.01' value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} placeholder='0' className={inputClass} /></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Unit price (ETB)</label><input type='number' min='0' step='0.01' value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} placeholder='0.00' className={inputClass} /></div>
          <div><label className='block text-sm font-medium text-slate-700 mb-2'>Unit</label><input type='text' maxLength={50} value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder='bags' className={inputClass} /></div>
          <Button onClick={addItem} className='mt-2 gap-2 w-full'><Plus className='h-4 w-4' /> Add item</Button>
        </div>
      </section>

      <section aria-label='AI Cost Estimator Form' className='space-y-6'>
        <div className='flex items-center gap-3 mb-4'>
          <Bot className='w-5 h-5 text-brand-green' />
          <h2 className='text-xl font-bold text-slate-900'>Smart Cost Estimator</h2>
        </div>
        <p className='text-slate-600 mb-6'>
          AI-powered market pricing for Ethiopia. Gemini checks current prices via Google Search and builds a full breakdown: materials, labor, transport, contingency.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleAIGenerate(); }} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>Trade / Service</label>
              <select className={inputClass} value={trade} onChange={(e) => setTrade(e.target.value)}>
                {TRADES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>Region</label>
              <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>Transport distance (km)</label>
              <input type='number' min='0' step='1' value={transportDistance} onChange={(e) => setTransportDistance(e.target.value)} placeholder='0 km' className={inputClass} />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>Transport mode</label>
              <select className={inputClass} value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
                {TRANSPORT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className='flex items-end gap-2'>
            <Button type='submit' className='w-full bg-brand-green hover:bg-brand-green/90 text-white text-sm font-medium' disabled={aiLoading}>
              {aiLoading ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Get AI Estimate (Live Prices)'}
            </Button>
          </div>

          {error && <div className='bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700'>{error}</div>}
        </form>
      </section>

      {estimate && (
        <section aria-label='AI Estimate Results' className='space-y-6'>
          <h2 className='text-xl font-bold text-slate-900'>Estimate Results</h2>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='p-4 bg-slate-50 rounded-lg border border-slate-100'>
              <div className='text-xs font-medium text-slate-500 uppercase'>Grand Total</div>
              <div className='text-2xl font-bold text-brand-navy'>{grandTotal.toLocaleString()} ETB</div>
            </div>
            <div className='p-4 bg-slate-50 rounded-lg border border-slate-100'>
              <div className='text-xs font-medium text-slate-500 uppercase'>Materials</div>
              <div className='text-xl font-bold text-brand-navy'>{materialsTotal.toLocaleString()} ETB</div>
            </div>
            <div className='p-4 bg-slate-50 rounded-lg border border-slate-100'>
              <div className='text-xs font-medium text-slate-500 uppercase'>Labor + Transport</div>
              <div className='text-xl font-bold text-brand-navy'>{(laborTotal + transportTotal).toLocaleString()} ETB</div>
            </div>
            <div className='p-4 bg-slate-50 rounded-lg border border-slate-100'>
              <div className='text-xs font-medium text-slate-500 uppercase'>Contingency ({contingencyPct}%)</div>
              <div className='text-xl font-bold text-brand-navy'>{contingencyTotal.toLocaleString()} ETB</div>
            </div>
          </div>

          <div>
            <h3 className='text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2'>Materials</h3>
            <div className='p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3'>
              {items.length > 0 ? items.map((it, i) => (
                <div key={i} className='flex justify-between items-center text-sm'>
                  <span>{it.item_name} × {it.quantity} {it.unit}</span>
                  <span>{(it.quantity * it.unit_price).toLocaleString()} ETB</span>
                </div>
              )) : <p className='text-sm text-slate-400 italic'>No materials specified</p>}
            </div>
          </div>

          {estimate.notes && (
            <div className='bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800'>
              <p className='font-semibold mb-1'>AI Notes:</p>
              <p className='text-amber-700'>{estimate.notes}</p>
            </div>
          )}

          {estimate.tips?.length > 0 && (
            <div className='bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800'>
              <p className='font-semibold mb-2'>Money-Saving Tips:</p>
              <ul className='space-y-1 text-blue-700'>
                {estimate.tips.map((t, i) => <li key={i}>💡 {t}</li>)}
              </ul>
            </div>
          )}

          {estimate.exchangeRateUsed && (
            <p className='text-xs text-slate-500 italic'>Exchange rate: {estimate.exchangeRateUsed}</p>
          )}

          {estimate.sources?.length && (
            <div className='border-t pt-4 mt-4'>
              <p className='text-xs font-medium text-slate-500 mb-2'>Sources:</p>
              <ul className='text-xs text-slate-600 space-y-1'>
                {estimate.sources.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {jobId && items.length > 0 && estimate && (
        <section aria-label='Save Estimate' className='mt-8 rounded-lg border border-slate-200 bg-white p-5'>
          <Button onClick={saveItems} className='mt-4 gap-2 w-full bg-brand-green hover:bg-brand-green/90 text-white text-sm font-medium'>Save Line Items to Job</Button>
        </section>
      )}

      {flash && <p role='status' className='mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700'>{flash}</p>}
    </div>
  );
};

export default CostEstimator;
