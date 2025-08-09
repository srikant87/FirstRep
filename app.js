const { useEffect, useMemo, useRef, useState } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } = Recharts;

const { JSONBIN_MASTER_KEY, JSONBIN_BIN_ID } = window.FIRSTREP_CONFIG;
const { STORAGE_KEY, EVENT_LOG_KEY, JSONBIN_ID_KEY, JSONBIN_KEY_KEY } = window.FIRSTREP_CONST;
const { todayStr, fmtDate, uid, isValidIndianMobile } = window.FIRSTREP_UTILS;

/* ---------------- Analytics (local only) ---------------- */
const Analytics = {
  log(evt, payload = {}) {
    try {
      const rec = { t: new Date().toISOString(), evt, payload };
      const arr = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]");
      arr.push(rec);
      localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(arr));
    } catch {}
  },
  export() {
    const arr = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]");
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(arr, null, 2));
    a.download = `firstrep-events-${todayStr()}.json`;
    a.click();
  },
};

/* ---------------- JSONBin helpers ---------------- */
const JSONBin = {
  getKey() { return localStorage.getItem(JSONBIN_KEY_KEY) || JSONBIN_MASTER_KEY || ""; },
  setKey(k) { localStorage.setItem(JSONBIN_KEY_KEY, k || ""); },
  getBinId() { return localStorage.getItem(JSONBIN_ID_KEY) || JSONBIN_BIN_ID || ""; },
  setBinId(id) { localStorage.setItem(JSONBIN_ID_KEY, id || ""); },

  async ensureBin(masterKey) {
    let id = this.getBinId();
    if (id) return id;
    const res = await fetch("https://api.jsonbin.io/v3/bins", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Master-Key": masterKey },
      body: JSON.stringify({ users: {} }),
    });
    if (!res.ok) throw new Error("JSONBin create failed");
    const data = await res.json();
    id = data?.metadata?.id || data?.id;
    if (!id) throw new Error("No Bin ID returned");
    this.setBinId(id);
    return id;
  },

  async read(masterKey, binId) {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { "X-Master-Key": masterKey },
    });
    if (!res.ok) throw new Error("JSONBin read failed");
    const json = await res.json();
    return json?.record || {};
  },

  async write(masterKey, binId, record) {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": masterKey },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error("JSONBin update failed");
    return await res.json();
  },
};

/* ---------------- Domain data ---------------- */
const EXERCISE_LIBRARY = {
  "Lower Back Pain": [
    { name: "McGill Curl-Up", query: "McGill curl up tutorial" },
    { name: "Bird Dog", query: "Bird dog exercise form" },
    { name: "Side Plank (Modified)", query: "Side plank modified for beginners" },
    { name: "Hip Hinge Practice", query: "Hip hinge drill with dowel" },
  ],
  "Knee Pain": [
    { name: "Terminal Knee Extension (TKE)", query: "Terminal knee extension exercise" },
    { name: "Wall Sit (Short Hold)", query: "Wall sit proper form beginner" },
    { name: "Step-Downs (Low)", query: "Step down exercise knee" },
    { name: "Quad Sets", query: "Quad sets knee rehab" },
  ],
  "Shoulder Pain": [
    { name: "Scapular Retractions", query: "Scapular retraction exercise band" },
    { name: "External Rotation (Band)", query: "Shoulder external rotation band" },
    { name: "Wall Slides", query: "Wall slide shoulder mobility" },
    { name: "Sleeper Stretch (Gentle)", query: "Sleeper stretch correct form" },
  ],
  "Neck Pain": [
    { name: "Chin Tucks", query: "Chin tucks neck pain" },
    { name: "Scapular Setting", query: "Scapular setting exercise" },
    { name: "Levator Stretch (Gentle)", query: "Levator scapulae stretch gentle" },
    { name: "Thoracic Extension on Wall", query: "Thoracic extension wall exercise" },
  ],
  "Tennis Elbow": [
    { name: "Isometric Wrist Extension", query: "Isometric wrist extension tennis elbow" },
    { name: "Eccentric Wrist Extension", query: "Eccentric wrist extension dumbbell" },
    { name: "Forearm Pronation/Supination", query: "Forearm pronation supination rehab" },
    { name: "Grip Strength (Putty)", query: "Grip putty exercise elbow" },
  ],
  "Plantar Fasciitis": [
    { name: "Calf Raises (Bent & Straight)", query: "Calf raise bent knee plantar fasciitis" },
    { name: "Plantar Fascia Stretch", query: "Plantar fascia stretch towel" },
    { name: "Toe Yoga", query: "Toe yoga exercise" },
    { name: "Foot Rolling (Ball)", query: "Foot rolling ball plantar fasciitis" },
  ],
  "Hamstring Strain": [
    { name: "Isometric Hamstring Bridge", query: "Isometric hamstring bridge" },
    { name: "Nordic Curl (Assisted)", query: "Nordic curl assisted beginner" },
    { name: "RDL (PVC/Dowel)", query: "Romanian deadlift dowel hip hinge" },
    { name: "Hamstring Slides", query: "Hamstring sliders exercise" },
  ],
};
const CONDITION_BASE_DAYS = { "Lower Back Pain": 28, "Knee Pain": 35, "Shoulder Pain": 28, "Neck Pain": 21, "Tennis Elbow": 42, "Plantar Fasciitis": 45, "Hamstring Strain": 28 };
const estimateDays = (condition, severity) => Math.round((CONDITION_BASE_DAYS[condition] || 28) * (0.65 + 0.06 * severity));

/* ---------------- State helpers ---------------- */
const defaultState = {
  name: "",
  phone: "",
  profile: { condition: "", severity: 5 },
  plan: null,           // { id, name, startDate, days, exercises[] }
  logs: {},             // dateStr -> { pain, completions: { [exerciseId]: boolean }, saved: true }
  remote: { masterKey: "", binId: "" },
};
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}
function saveState(st) { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }

/* ---------------- App root ---------------- */
function App() {
  const [state, setState] = useState(loadState);
  const [step, setStep] = useState(0); // 0 landing, 1 identity, 2 assess, 3 plan, 4 consult
  const [busyRemote, setBusyRemote] = useState(false);
  const [remoteMsg, setRemoteMsg] = useState("");

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => {
    // prime JSONBin values from config or previous session
    const k = JSONBin.getKey();
    const id = JSONBin.getBinId();
    setState(s => ({ ...s, remote: { ...s.remote, masterKey: k, binId: id } }));
  }, []);

  const progressData = useMemo(() => buildProgressData(state), [state]);
  const adherence = useMemo(() => buildAdherenceData(state), [state]);

  const startAfterIdentity = () => {
    Analytics.log("identity_submit", { name: state.name });
    setStep(2);
  };

  const generatePlan = async () => {
    const { condition, severity } = state.profile;
    const exercises = (EXERCISE_LIBRARY[condition] || []).map(e => ({
      id: uid("ex"), name: e.name, query: e.query, sets: 2, reps: 10, frequency: "Daily",
    }));
    const plan = { id: uid("plan"), name: `${condition} – Recovery Plan`, startDate: todayStr(), days: estimateDays(condition, severity), exercises };
    setState(s => ({ ...s, plan }));
    Analytics.log("plan_generated", { condition, severity, days: plan.days });
    setStep(3);
    void syncUpstream("plan_generated");
  };

  async function syncUpstream(reason) {
    const { name, phone, profile, plan, logs, remote } = state;
    const masterKey = remote.masterKey || JSONBIN_MASTER_KEY;
    if (!masterKey || !name || !isValidIndianMobile(phone)) return; // guardrails
    try {
      setBusyRemote(true); setRemoteMsg("Syncing…");
      let binId = remote.binId || JSONBIN_BIN_ID || "";
      if (!binId) binId = await JSONBin.ensureBin(masterKey);
      if (binId && binId !== remote.binId) {
        JSONBin.setBinId(binId);
        setState(s => ({ ...s, remote: { ...s.remote, binId } }));
      }
      const record = await JSONBin.read(masterKey, binId).catch(() => ({ users: {} }));
      const users = record.users || {};
      const key = `${String(name).trim().toLowerCase()}|${String(phone).trim()}`;
      users[key] = { name, phone, profile, plan, logs, updatedAt: new Date().toISOString(), reason };
      await JSONBin.write(masterKey, binId, { users });
      setRemoteMsg("Synced");
      setTimeout(() => setRemoteMsg(""), 1500);
    } catch (e) {
      setRemoteMsg("Sync failed");
      setTimeout(() => setRemoteMsg(""), 2000);
    } finally {
      setBusyRemote(false);
    }
  }

  const clearAll = () => {
    if (confirm("Reset local plan and logs?")) {
      setState(defaultState);
      Analytics.log("reset_app");
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar onExportEvents={() => Analytics.export()} onReset={clearAll} remoteMsg={remoteMsg} />
      {step === 0 && <Landing onGetStarted={() => setStep(1)} />}

      {step === 1 && (
        <Identity
          name={state.name}
          phone={state.phone}
          setName={(name) => setState(s => ({ ...s, name }))}
          setPhone={(phone) => setState(s => ({ ...s, phone }))}
          onNext={startAfterIdentity}
        />
      )}

      {step === 2 && (
        <Assessment
          state={state}
          setState={setState}
          onBack={() => setStep(1)}
          onGenerate={generatePlan}
        />
      )}

      {step === 3 && (
        <Planner
          state={state}
          setState={setState}
          onBack={() => setStep(2)}
          progressData={progressData}
          adherence={adherence}
          onGoConsult={() => setStep(4)}
          onExportPlan={() => {
            if (!state.plan) return;
            const a = document.createElement("a");
            a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(state.plan, null, 2));
            a.download = `firstrep-plan-${state.plan.id}.json`;
            a.click();
            Analytics.log("plan_exported");
          }}
          onImportPlan={(json) => {
            try {
              const p = JSON.parse(json);
              if (!p || !p.exercises) throw new Error("Invalid plan");
              setState(s => ({ ...s, plan: p }));
              Analytics.log("plan_imported", { exercises: p.exercises.length });
              void syncUpstream("plan_imported");
            } catch {
              alert("Could not parse plan JSON.");
            }
          }}
          onSync={() => syncUpstream("manual_sync")}
          busyRemote={busyRemote}
        />
      )}

      {step === 4 && <Consult onBack={() => setStep(3)} />}

      <Footer />
    </div>
  );
}

/* ---------------- UI components ---------------- */
function NavBar({ onExportEvents, onReset, remoteMsg }) {
  return (
    <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-2xl bg-sky-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 4v5c0 5-3.5 9-8 9s-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <span className="font-semibold text-lg tracking-tight">FirstRep</span>
          <span className="ml-2 text-slate-500 text-sm">Physio-guided recovery</span>
        </div>
        <div className="flex items-center gap-2">
          {remoteMsg && <span className="text-xs text-slate-600">{remoteMsg}</span>}
          <button onClick={onExportEvents} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50 text-sm">Export events</button>
          <button onClick={onReset} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-rose-50 text-rose-600 border-rose-200 text-sm">Reset</button>
        </div>
      </div>
    </div>
  );
}

function Landing({ onGetStarted }) {
  const USPs = [
    { title: "Physio-backed protocols", desc: "Exercise plans grounded in best-practice rehab principles." },
    { title: "No login, no friction", desc: "Your plan stays on your device. Private by default." },
    { title: "Daily adherence tracking", desc: "Simple check-ins, visible progress, faster recovery." },
    { title: "Talk to a physiotherapist", desc: "Book a virtual consult if you need 1:1 guidance." },
  ];
  const TESTIMONIALS = [
    { name: "Rohit, Bengaluru", text: "Lower back pain to 0/10 in 5 weeks. The daily check-ins kept me honest.", tag: "Back Pain" },
    { name: "Anushka, Mumbai", text: "Tennis elbow rehab finally clicked. Simple videos + routine = progress.", tag: "Tennis Elbow" },
    { name: "Karthik, Chennai", text: "Neck pain from WFH fixed. Loved the clean, no-signup flow.", tag: "Neck Pain" },
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 pt-12 pb-16">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bounce back from injury with your <span className="text-sky-700">First Rep</span>.</h1>
          <p className="mt-3 text-slate-600">A structured, physiotherapist-informed routine with daily check-ins, clean visuals, and optional 1:1 virtual consults.</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {USPs.map((u, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow transition">
                <div className="font-semibold">{u.title}</div>
                <div className="text-sm text-slate-600">{u.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={onGetStarted} className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 shadow">
            Get started
          </button>
        </div>
        <div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">What users say</div>
            <div className="mt-3 grid gap-3">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="text-sm text-slate-700">“{t.text}”</div>
                  <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">{t.name}<span className="px-2 py-0.5 bg-white border rounded-full text-[10px] ml-auto">{t.tag}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Identity({ name, phone, setName, setPhone, onNext }) {
  const [error, setError] = useState("");
  const submit = () => {
    if (!name || name.trim().length < 2) { setError("Enter your name."); return; }
    if (!isValidIndianMobile(phone)) { setError("Enter a valid 10-digit Indian mobile starting 6–9 (no repeated digits like 9999999999)."); return; }
    setError(""); onNext();
  };
  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-16">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="font-semibold">Let’s personalise this</div>
        <div className="text-sm text-slate-600 mt-1">Your name and mobile help us save progress remotely (optional) and tailor your plan.</div>
        <div className="mt-4 space-y-3">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded-2xl border" />
          <input value={phone} onChange={(e)=>setPhone(e.target.value.replace(/[^0-9]/g,"").slice(0,10))} placeholder="10-digit mobile" className="w-full px-3 py-2 rounded-2xl border" />
          <button onClick={submit} className="w-full px-4 py-2 rounded-2xl bg-sky-600 text-white hover:bg-sky-700">Continue</button>
          {error && <div className="text-rose-600 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}

function Assessment({ state, setState, onBack, onGenerate }) {
  const conditions = Object.keys(EXERCISE_LIBRARY);
  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-16">
      <div className="flex items-center justify-between mb-4"><button onClick={onBack} className="text-slate-600 text-sm hover:underline">← Back</button></div>
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Tell us about your pain</div>
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div>
            <label className="text-sm text-slate-600">Primary area</label>
            <select value={state.profile.condition} onChange={(e)=>setState(s=>({...s, profile:{...s.profile, condition:e.target.value}}))} className="mt-1 w-full px-3 py-2 rounded-2xl border bg-white">
              <option value="">Select…</option>
              {conditions.map((c)=>(<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Current pain level (1–10)</label>
            <input type="range" min={1} max={10} value={state.profile.severity} onChange={(e)=>setState(s=>({...s, profile:{...s.profile, severity:Number(e.target.value)}}))} className="mt-3 w-full"/>
            <div className="text-sm text-slate-700 mt-1">{state.profile.severity}/10</div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button onClick={onGenerate} disabled={!state.profile.condition} className={`px-4 py-2 rounded-2xl text-white ${state.profile.condition?"bg-sky-600 hover:bg-sky-700":"bg-slate-300 cursor-not-allowed"}`}>Generate plan</button>
          <div className="text-xs text-slate-500">Daily routine with YouTube guides and recovery timeline.</div>
        </div>
      </div>
    </div>
  );
}

function Planner({ state, setState, onBack, progressData, adherence, onGoConsult, onExportPlan, onImportPlan, onSync, busyRemote }) {
  const plan = state.plan; const [importText, setImportText] = useState("");
  const [todayDraft, setTodayDraft] = useState(()=>{ const d=todayStr(); const log=state.logs[d]; return { pain: log?.pain ?? 5, completions: { ...(log?.completions||{}) }, saved: !!log?.saved }; });
  const [justSaved,setJustSaved]=useState(false);
  useEffect(()=>{ const d=todayStr(); const log=state.logs[d]; setTodayDraft({ pain: log?.pain ?? 5, completions: { ...(log?.completions||{}) }, saved: !!log?.saved }); }, [state.logs, state.plan?.id]);
  if(!plan) return null;
  const daysPassed = Math.max(0, Math.ceil((new Date(todayStr()) - new Date(plan.startDate))/86400000));
  const daysLeft = Math.max(0, plan.days - daysPassed);

  const saveToday = async () => {
    const d=todayStr();
    setState(s=>({ ...s, logs:{ ...s.logs, [d]: { pain: todayDraft.pain, completions:{ ...(todayDraft.completions||{}) }, saved:true } } }));
    Analytics.log("save_progress", { pain: todayDraft.pain, completed: Object.values(todayDraft.completions||{}).filter(Boolean).length });
    setJustSaved(true); setTimeout(()=>setJustSaved(false), 1500);
    // remote sync (idempotent upsert by name|phone)
    const masterKey = state.remote.masterKey || JSONBin_MASTER_KEY;
    if (masterKey && state.name && isValidIndianMobile(state.phone)) { await onSync(); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-20">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-slate-600 text-sm hover:underline">← Back</button>
        <div className="text-sm text-slate-600">Plan ID: <span className="font-mono">{plan.id}</span></div>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Estimated recovery</div>
            <div className="text-2xl font-semibold mt-0.5">~{plan.days} days <span className="text-slate-500 text-base">(≈{daysLeft} remaining)</span></div>
            <div className="text-sm text-slate-600 mt-1">{state.name || "—"} · {state.phone || "—"} · {state.profile.condition || "—"} · Pain now: {state.profile.severity}/10</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExportPlan} className="px-3 py-1.5 rounded-xl border text-sm bg-white hover:bg-slate-50">Export Plan</button>
            <ImportPlan importText={importText} setImportText={setImportText} onImport={()=>onImportPlan(importText)} />
            <button onClick={onGoConsult} className="px-3 py-1.5 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700">Consult Physio</button>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-semibold mb-2">Today’s routine</div>
            <div className="space-y-3">
              {plan.exercises.map((e)=> (
                <div key={e.id} className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-slate-500">{e.sets} sets × {e.reps} reps · {e.frequency}</div>
                    <button
                      onClick={()=>{ window.open(`https://www.youtube.com/results?${new URLSearchParams({ search_query: `${e.name} ${e.query}` }).toString()}` , "_blank"); }}
                      className="mt-2 inline-flex items-center gap-1 text-sky-700 hover:underline text-sm"
                    >Open guide on YouTube</button>
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!(todayDraft.completions?.[e.id])}
                      onChange={(ev)=>setTodayDraft(d=>({ ...d, completions: { ...(d.completions||{}), [e.id]: ev.target.checked } }))}
                    />
                    <span className="text-sm">Done</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 border p-4">
              <div className="text-sm text-slate-600">How’s your pain <span className="font-medium">after</span> today’s session?</div>
              <PainSelector value={todayDraft.pain} onChange={(v)=>setTodayDraft(d=>({ ...d, pain:v }))} />
              <div className="mt-3 flex items-center gap-2">
                <button onClick={saveToday} className="px-4 py-2 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-2" disabled={!state.name || !isValidIndianMobile(state.phone)}>
                  Save Progress
                </button>
                {justSaved && <span className="text-emerald-700 text-sm">Saved ✓ Now reflected in charts.</span>}
                {!todayDraft.saved && <span className="text-xs text-slate-500">(Not saved yet)</span>}
                <button onClick={onSync} disabled={busyRemote} className="ml-auto px-3 py-1.5 rounded-xl border text-sm bg-white hover:bg-slate-50">{busyRemote?"Syncing…":"Sync now"}</button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Note: Remote sync requires JSONBin key (pre-filled via data.js).</div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">Progress overview</div>
            <div className="rounded-2xl border p-3 bg-white">
              <div className="text-xs text-slate-500 mb-1">Pain trend</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0,10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="pain" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border p-3 bg-white mt-4">
              <div className="text-xs text-slate-500 mb-1">Adherence (last 14 days)</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adherence}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
        <div className="font-semibold mb-2">Tips for success</div>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          <li>Hit “Save Progress” daily to lock in logs that feed the graphs.</li>
          <li>Quality over quantity. Stop if sharp pain; resume when symptoms settle.</li>
          <li>Consistency compounds. Small daily wins.</li>
        </ul>
      </div>
    </div>
  );
}

function ImportPlan({ importText, setImportText, onImport }) {
  const fileRef = useRef(null);
  const handleFile = (f) => { const reader=new FileReader(); reader.onload=(e)=>setImportText(String(e.target.result||"")); reader.readAsText(f); };
  return (
    <div className="relative">
      <button className="px-3 py-1.5 rounded-xl border text-sm bg-white hover:bg-slate-50" onClick={()=>fileRef.current?.click()}>Import Plan</button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files?.[0] && handleFile(e.target.files[0])} />
      {importText && (
        <div className="absolute right-0 mt-2 w-[22rem] bg-white border rounded-2xl shadow p-3 z-10">
          <div className="text-xs text-slate-500 mb-2">Preview / Edit JSON</div>
          <textarea value={importText} onChange={(e)=>setImportText(e.target.value)} className="w-full h-32 border rounded-xl p-2 text-xs font-mono" />
          <div className="mt-2 flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded-xl border text-sm" onClick={()=>setImportText("")}>Cancel</button>
            <button className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-sm" onClick={onImport}>Import</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PainSelector({ value, onChange }) {
  return (
    <div className="mt-2">
      <input type="range" min={0} max={10} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full" />
      <div className="text-sm text-slate-700 mt-1">{value}/10</div>
    </div>
  );
}

function Consult({ onBack }) {
  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [slot,setSlot]=useState("10:00");
  const [meetLink,setMeetLink]=useState("");
  const slots=["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
  const startDT = useMemo(()=> new Date(`${date}T${slot}:00+05:30`), [date,slot]);
  const endDT = useMemo(()=> new Date(startDT.getTime()+45*60*1000), [startDT]);

  function toGoogleCalendarLink({ title, description, start, end, location }) {
    const pad=(n)=>String(n).padStart(2,"0");
    const f=(d)=>{ const x=new Date(d); return `${x.getFullYear()}${pad(x.getMonth()+1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}${pad(x.getSeconds())}`; };
    const params = new URLSearchParams({ action:"TEMPLATE", text:title, details:description, location:location||"Virtual (Google Meet)", dates:`${f(start)}/${f(end)}`, ctz:"Asia/Kolkata" });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  function makeICS({ title, description, start, end, location }) {
    const dt=(x)=>{ const d=new Date(x); const pad=(n)=>String(n).padStart(2,"0"); return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
    return [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FirstRep//Physio Consult//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
      `UID:${uid("ics")}@firstrep.app`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(start)}`,`DTEND:${dt(end)}`,
      `SUMMARY:${title}`,`DESCRIPTION:${(description||"").replace(/\n/g,"\\n")}`,`LOCATION:${(location||"Virtual (Google Meet)").replace(/\n/g,"\\n")}`,
      "END:VEVENT","END:VCALENDAR"
    ].join("\n");
  }

  const ics = useMemo(()=> makeICS({
    title:"FirstRep Physio Consult (45 mins)",
    description:`Virtual consult. Meet link: ${meetLink||"(add after opening meet.new)"}`,
    start:startDT, end:endDT, location: meetLink||"Virtual (Google Meet)"
  }), [startDT,endDT,meetLink]);
  const gcal = useMemo(()=> toGoogleCalendarLink({
    title:"FirstRep Physio Consult (45 mins)",
    description:`Virtual consult. Meet link: ${meetLink||"(add after opening meet.new)"}`,
    start:startDT, end:endDT, location: meetLink||"Virtual (Google Meet)"
  }), [startDT,endDT,meetLink]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-20">
      <button onClick={onBack} className="text-slate-600 text-sm hover:underline">← Back</button>
      <div className="mt-4 rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-lg">Consult with a Physiotherapist</div>
            <div className="text-sm text-slate-600">Schedule a 45-minute video call between 10:00–18:00 IST.</div>
          </div>
          <svg className="h-6 w-6 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5h18M3 12h18M3 19h18"/></svg>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-5">
          <div><label className="text-sm text-slate-600">Date</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border" /></div>
          <div><label className="text-sm text-slate-600">Time slot (IST)</label><select value={slot} onChange={(e)=>setSlot(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border bg-white">{slots.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="text-sm text-slate-600">Google Meet link (optional now)</label><input type="url" placeholder="Paste Meet link (open meet.new)" value={meetLink} onChange={(e)=>setMeetLink(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border" /><a href="https://meet.new" target="_blank" className="mt-2 inline-block text-sky-700 text-sm hover:underline">Open meet.new</a></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={`data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`} download={`FirstRep-Physio-${date}-${slot.replace(":","")}.ics`} className="px-4 py-2 rounded-2xl bg-slate-900 text-white hover:bg-black inline-flex items-center gap-2">Download .ics</a>
          <a href={gcal} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-2">Add to Google Calendar</a>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="border-t bg-white/60">
      <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-slate-500 flex items-center justify-between">
        <div>© {new Date().getFullYear()} FirstRep – Browser-first recovery tracker.</div>
        <div className="flex items-center gap-2">
          <a className="hover:underline" href="#" onClick={(e)=>{e.preventDefault(); alert("Privacy: Your plan + logs stay in your browser. Remote sync only if JSONBin is enabled.");}}>Privacy</a>
          <span>·</span>
          <a className="hover:underline" href="#" onClick={(e)=>{e.preventDefault(); alert("Terms: This is not medical advice. Consult a licensed physiotherapist when in doubt.");}}>Terms</a>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers for charts ---------------- */
function buildProgressData(state) {
  return Object.keys(state.logs).sort()
    .map(d => ({ dateKey:d, date: fmtDate(d), pain: state.logs[d]?.pain ?? null, saved: !!state.logs[d]?.saved }))
    .filter(x => x.saved && x.pain !== null);
}
function buildAdherenceData(state) {
  const today = new Date();
  return [...Array(14)].map((_, i) => {
    const d = new Date(today.getTime() - (13 - i)*86400000);
    const ds = d.toISOString().slice(0,10);
    const log = state.logs[ds];
    const completed = log?.saved && log?.completions ? Object.values(log.completions).filter(Boolean).length : 0;
    return { date: fmtDate(ds), completed };
  });
}

/* ---------------- Mount ---------------- */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
