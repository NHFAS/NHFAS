import React, { useEffect, useState } from 'react';
import { Check, FileText, LoaderCircle, Plus, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('client');
  const [profile, setProfile] = useState({ full_name: '', phone: '', preferred_language: 'en', low_literacy_mode: false });
  const [verification, setVerification] = useState(null);
  const [kycStatus, setKycStatus] = useState('pending');
  const [vehicles, setVehicles] = useState([]);
  const [vehicleClasses, setVehicleClasses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', make: '', model: '', vehicle_class_id: '', rated_payload_kg: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicle_id: '', maintenance_type: '', description: '', scheduled_at: '', cost: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFleet = async (currentUser) => {
    const { data: vehicleData } = await supabase.from('vehicles')
      .select('id, plate_number, make, model, rated_payload_kg, status, vehicle_classes(name, rated_payload_kg)')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: false });
    const list = vehicleData || [];
    setVehicles(list);
    if (list.length) {
      const { data: records } = await supabase.from('vehicle_maintenance_records')
        .select('*').in('vehicle_id', list.map((vehicle) => vehicle.id)).order('scheduled_at', { ascending: true });
      setMaintenance(records || []);
    } else {
      setMaintenance([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      const [{ data: profileData }, { data: classData }] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, preferred_language, low_literacy_mode, role').eq('id', currentUser.id).single(),
        supabase.from('vehicle_classes').select('id, name, rated_payload_kg, max_gvw_kg').order('rated_payload_kg'),
      ]);
      if (!mounted) return;
      setUser(currentUser);
      setRole(profileData?.role || 'client');
      setProfile({
        full_name: profileData?.full_name || '',
        phone: profileData?.phone || '',
        preferred_language: profileData?.preferred_language || 'en',
        low_literacy_mode: profileData?.low_literacy_mode || false,
      });
      setVehicleClasses(classData || []);

      if (['service_provider', 'heavy_operator'].includes(profileData?.role)) {
        const [{ data: verificationData }, { data: providerData }] = await Promise.all([
          supabase.from('provider_verifications').select('status, document_url, created_at, notes, expires_at')
            .eq('provider_id', currentUser.id).eq('verification_type', 'identity').maybeSingle(),
          supabase.from('provider_profiles').select('kyc_status').eq('user_id', currentUser.id).maybeSingle(),
        ]);
        if (mounted) {
          setVerification(verificationData);
          setKycStatus(providerData?.kyc_status || 'pending');
        }
      }
      if (profileData?.role === 'heavy_operator' && mounted) await loadFleet(currentUser);
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const { error: saveError } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone || null,
      preferred_language: profile.preferred_language,
      low_literacy_mode: profile.low_literacy_mode,
    }).eq('id', user.id);
    if (saveError) setError(saveError.message);
    else setMessage('Profile updated.');
    setSaving(false);
  };

  const submitVerification = async (event) => {
    event.preventDefault();
    if (!file || !user) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a PDF, JPG, or PNG file under 10 MB.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const documentPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('provider-verification').upload(documentPath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }
    const { data, error: submitError } = await supabase.from('provider_verifications').insert({
      provider_id: user.id,
      verification_type: 'identity',
      document_url: documentPath,
      status: 'pending',
    }).select('status, document_url, created_at, notes, expires_at').single();
    if (submitError) setError(submitError.message);
    else {
      setVerification(data);
      setMessage('Identity document submitted for review.');
      setFile(null);
    }
    setSaving(false);
  };

  const addVehicle = async (event) => {
    event.preventDefault();
    const selectedClass = vehicleClasses.find((item) => item.id === vehicleForm.vehicle_class_id);
    const payload = Number(vehicleForm.rated_payload_kg || selectedClass?.rated_payload_kg);
    if (!selectedClass || payload > selectedClass.rated_payload_kg) {
      setError('Rated payload cannot exceed the vehicle class payload limit.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: addError } = await supabase.from('vehicles').insert({
      owner_id: user.id,
      vehicle_class_id: selectedClass.id,
      plate_number: vehicleForm.plate_number.trim().toUpperCase(),
      make: vehicleForm.make || null,
      model: vehicleForm.model || null,
      rated_payload_kg: payload,
      status: 'active',
    });
    if (addError) setError(addError.message);
    else {
      setVehicleForm({ plate_number: '', make: '', model: '', vehicle_class_id: '', rated_payload_kg: '' });
      setMessage('Vehicle added to your fleet.');
      await loadFleet(user);
    }
    setSaving(false);
  };

  const addMaintenance = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const { error: addError } = await supabase.from('vehicle_maintenance_records').insert({
      vehicle_id: maintenanceForm.vehicle_id,
      maintenance_type: maintenanceForm.maintenance_type,
      description: maintenanceForm.description || null,
      scheduled_at: maintenanceForm.scheduled_at || null,
      cost: maintenanceForm.cost ? Number(maintenanceForm.cost) : null,
      status: 'scheduled',
    });
    if (addError) setError(addError.message);
    else {
      setMaintenanceForm({ vehicle_id: '', maintenance_type: '', description: '', scheduled_at: '', cost: '' });
      setMessage('Maintenance scheduled.');
      await loadFleet(user);
    }
    setSaving(false);
  };

  const completeMaintenance = async (record) => {
    const { error: updateError } = await supabase.rpc('complete_vehicle_maintenance', { target_record_id: record.id });
    if (updateError) setError(updateError.message);
    else await loadFleet(user);
  };

  if (loading) return <div className="py-16 text-sm text-slate-500">Loading your profile...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">ACCOUNT</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy">Profile & settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage account details, provider verification, and fleet records.</p>
      </header>

      {error && <p className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {message && <p className="border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{message}</p>}

      <section className="border-b border-slate-200 pb-8">
        <h2 className="text-lg font-bold text-brand-navy">Personal details</h2>
        <form onSubmit={saveProfile} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Full name<input required maxLength={120} value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-brand-green focus:outline-none" /></label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Phone<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-brand-green focus:outline-none" /></label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Preferred language<select value={profile.preferred_language} onChange={(event) => setProfile({ ...profile, preferred_language: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-brand-green focus:outline-none"><option value="en">English</option><option value="am">Amharic</option><option value="om">Afaan Oromo</option><option value="sw">Swahili</option></select></label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700"><input type="checkbox" checked={profile.low_literacy_mode} onChange={(event) => setProfile({ ...profile, low_literacy_mode: event.target.checked })} />Enable read-aloud support where available</label>
          <Button type="submit" disabled={saving} className="gap-2 self-start"><Check size={16} />Save profile</Button>
        </form>
      </section>

      {['service_provider', 'heavy_operator'].includes(role) && (
        <section className="border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">Identity verification</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Providers must be approved before accepting jobs. Documents stay in private storage and are visible only to you and platform administrators.</p>
            </div>
            <span className="inline-flex items-center gap-2 bg-slate-100 px-3 py-2 text-sm font-semibold capitalize text-slate-700"><ShieldCheck size={17} />{verification?.status || kycStatus}</span>
          </div>
          {verification ? (
            <div className="mt-4 flex items-start gap-3 border-l-2 border-slate-300 py-1 pl-4 text-sm text-slate-600">
              <FileText size={18} className="mt-0.5 shrink-0" />
              <div><p>Document submitted {new Date(verification.created_at).toLocaleDateString()}</p>{verification.notes && <p className="mt-1">Review note: {verification.notes}</p>}{verification.expires_at && <p className="mt-1">Expires: {new Date(verification.expires_at).toLocaleDateString()}</p>}</div>
            </div>
          ) : (
            <form onSubmit={submitVerification} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium text-slate-700">Identity document (PDF, JPG, PNG; max 10 MB)<input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-semibold" /></label>
              <Button type="submit" disabled={saving || !file} className="gap-2 self-start"><FileText size={16} />Submit for review</Button>
            </form>
          )}
        </section>
      )}

      {role === 'heavy_operator' && (
        <section className="space-y-6 border-b border-slate-200 pb-8">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy"><Truck size={19} />Fleet</h2>
            <p className="mt-1 text-sm text-slate-600">Only active vehicles without a maintenance block can be assigned.</p>
          </div>
          <form onSubmit={addVehicle} className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">Vehicle class<select required value={vehicleForm.vehicle_class_id} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicle_class_id: event.target.value, rated_payload_kg: '' })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="">Choose a class</option>{vehicleClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.rated_payload_kg.toLocaleString()} kg payload</option>)}</select></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Plate number<input required value={vehicleForm.plate_number} onChange={(event) => setVehicleForm({ ...vehicleForm, plate_number: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Make<input value={vehicleForm.make} onChange={(event) => setVehicleForm({ ...vehicleForm, make: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Model<input value={vehicleForm.model} onChange={(event) => setVehicleForm({ ...vehicleForm, model: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Rated payload (kg)<input type="number" min="1" value={vehicleForm.rated_payload_kg} onChange={(event) => setVehicleForm({ ...vehicleForm, rated_payload_kg: event.target.value })} placeholder="Use class rating" className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <Button type="submit" disabled={saving} className="gap-2 self-end"><Plus size={16} />Add vehicle</Button>
          </form>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {vehicles.map((vehicle) => <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-semibold text-brand-navy">{vehicle.plate_number} · {vehicle.make} {vehicle.model}</span><span className="text-slate-600">{vehicle.vehicle_classes?.name} · {Number(vehicle.rated_payload_kg || vehicle.vehicle_classes?.rated_payload_kg).toLocaleString()} kg · {vehicle.status}</span></div>)}
            {!vehicles.length && <p className="py-4 text-sm text-slate-500">No vehicles registered yet.</p>}
          </div>

          <div>
            <h3 className="text-base font-bold text-brand-navy">Maintenance schedule</h3>
            <form onSubmit={addMaintenance} className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">Vehicle<select required value={maintenanceForm.vehicle_id} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="">Choose a vehicle</option>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.plate_number}</option>)}</select></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Maintenance type<input required value={maintenanceForm.maintenance_type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" placeholder="Inspection, tires, engine service" /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Scheduled for<input type="date" value={maintenanceForm.scheduled_at} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, scheduled_at: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Estimated cost (ETB)<input type="number" min="0" value={maintenanceForm.cost} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">Notes<input value={maintenanceForm.description} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              <Button type="submit" disabled={saving || !vehicles.length} className="gap-2 self-start"><Plus size={16} />Schedule maintenance</Button>
            </form>
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {maintenance.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold text-brand-navy">{vehicles.find((vehicle) => vehicle.id === record.vehicle_id)?.plate_number} · {record.maintenance_type}</p><p className="mt-1 text-slate-500">{record.scheduled_at ? new Date(record.scheduled_at).toLocaleDateString() : 'Date not set'} · {record.status}</p></div>{record.status !== 'completed' && <Button variant="outline" onClick={() => completeMaintenance(record)} className="h-9 gap-2 px-3 text-xs"><Check size={14} />Mark complete</Button>}</div>)}
              {!maintenance.length && <p className="py-4 text-sm text-slate-500">No maintenance records yet.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Settings;