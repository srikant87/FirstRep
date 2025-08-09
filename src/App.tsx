import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  HeartPulse, ArrowRight, ShieldCheck, Clock, TrendingUp, Phone, Stethoscope,
  Upload, LineChart as LineChartIcon, CheckCircle2, XCircle, CalendarDays, PlayCircle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

/** FirstRep – production-ready single-file React app **/
// Config
const APP_KEY_PREFIX = "firstrep";
const JSONBIN_MASTER_KEY = "$2a$10$8AI1P1rXZzRftjDaN8IlLutsn9gYXw/MWSAptBt4A2kKF8xpquCUm";
const JSONBIN_API = "https://api.jsonbin.io/v3";
const ANALYTICS_ENABLED = true;

// Storage
function resolveStorageBackend() {
  try {
    const ls = typeof window !== "undefined" ? window.localStorage : null;
    if (!ls) throw new Error("no localStorage");
    const t = "__firstrep_probe__";
    ls.setItem(t, "1"); ls.removeItem(t);
    return {
      type: "localStorage" as const,
      getItem: (k: string) => ls.getItem(k),
      setItem: (k: string, v: string) => ls.setItem(k, v),
      removeItem: (k: string) => ls.removeItem(k),
    };
  } catch {
    const mem = new Map<string,string>();
    return {
      type: "memory" as const,
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
}
const STORAGE_BACKEND = resolveStorageBackend();
const storage = {
  get<T=any>(key: string, fallback: T|null=null): T|null {
    try { const raw = STORAGE_BACKEND.getItem(`${APP_KEY_PREFIX}:${key}`); return raw ? (JSON.parse(raw) as T) : fallback; }
    catch { return fallback; }
  },
  set(key: string, value: any) { try { STORAGE_BACKEND.setItem(`${APP_KEY_PREFIX}:${key}`, JSON.stringify(value)); } catch {} },
  remove(key: string) { try { STORAGE_BACKEND.removeItem(`${APP_KEY_PREFIX}:${key}`); } catch {} },
  backendType: STORAGE_BACKEND.type,
};

// JSONBin
async function jsonbinCreate(initial:any){const r=await fetch(`${JSONBIN_API}/b`,{method:"POST",headers:{"Content-Type":"application/json","X-Master-Key":JSONBIN_MASTER_KEY},body:JSON.stringify(initial)});if(!r.ok)throw new Error("create fail");return r.json();}
async function jsonbinRead(id:string){const r=await fetch(`${JSONBIN_API}/b/${id}/latest`,{headers:{"X-Master-Key":JSONBIN_MASTER_KEY}});if(!r.ok)throw new Error("read fail");return r.json();}
async function jsonbinUpdate(id:string,data:any){const r=await fetch(`${JSONBIN_API}/b/${id}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":JSONBIN_MASTER_KEY},body:JSON.stringify(data)});if(!r.ok)throw new Error("update fail");return r.json();}
function useEventLogger(){
  const [binId,setBinId]=useState<string|null>(()=>storage.get("binId",null));
  const buf=useRef<any[]>([]); const flushing=useRef(false); const disabled=useRef(false);
  const flush=async()=>{ if(!ANALYTICS_ENABLED||disabled.current||flushing.current) return;
    if(typeof navigator!=="undefined" && !navigator.onLine) return;
    try{flushing.current=true; if(!buf.current.length) return;
      if(!binId){ const created=await jsonbinCreate({events:buf.current}); const id=created?.metadata?.id||created?.id; if(id){ setBinId(id); storage.set("binId",id);} buf.current=[]; }
      else{ const current=await jsonbinRead(binId); const existing=current?.record?.events||[]; const merged=existing.concat(buf.current); await jsonbinUpdate(binId,{events:merged}); buf.current=[]; }
    } catch(e){ disabled.current=true; console.warn("Analytics disabled:", (e as Error)?.message||e); }
    finally{flushing.current=false;}
  };
  useEffect(()=>{ const t=setInterval(flush,5000); return ()=>clearInterval(t); },[binId]);
  const log=(name:string,data:any={})=>{ const evt={ts:new Date().toISOString(),name,data,ua:typeof navigator!=="undefined"?navigator.userAgent:""}; buf.current.push(evt);
    try{ const prev=storage.get<any[]>("eventsBuffer",[])||[]; storage.set("eventsBuffer", prev.concat(evt)); }catch{}
    if(name==="signup_submitted"||name==="plan_generated") void flush();
  };
  return {log, binId, flush};
}

// Types & helpers
/** @typedef {{exercise:string,youtubeQuery:string,sets:number,reps:number,notes?:string}} PlanItem */
/** @typedef {{id:string,area:string,severity:number,estimatedDays:number,createdAt:string,items:PlanItem[]}} RecoveryPlan */
/** @typedef {{date:string,items:{exercise:string,completed:boolean}[],painScore:number}} CheckIn */
const todayStr=()=>new Date().toISOString().slice(0,10);
const fmtDate=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(d:Date,n:number)=>{const c=new Date(d); c.setDate(c.getDate()+n); return c;};
const uid=()=>Math.random().toString(36).slice(2,10);
const sanitizeDigits=(s:string)=>(s||"").replace(/\D+/g,"");
const isAllSameDigits=(s:string)=>/^(\d)\1{9}$/.test(s);
const isValidIndianMobile=(s:string)=>{const d=sanitizeDigits(s); if(d.length!==10) return false; if(isAllSameDigits(d)) return false; if(!/^[6-9]/.test(d)) return false; return true;};
const formatHourLabel=(h:number)=>{const start=h%12===0?12:h%12; const endH=h+1; const end=endH%12===0?12:endH%12; const sm=h<12?"AM":"PM"; const em=endH<12?"AM":"PM"; return `${start}:00 ${sm} - ${end}:00 ${em}`;};
const hourlySlots=Array.from({length:9},(_,i)=>{const startH=10+i; const endH=startH+1; const start=`${String(startH).padStart(2,"0")}:00`; const end=`${String(endH).padStart(2,"0")}:00`; const label=formatHourLabel(startH); return {start,end,label};});
const EXERCISE_LIBRARY:Record<string,string[]>={
  "Lower Back":["Pelvic Tilt","Cat-Cow Stretch","Bird Dog","Hamstring Stretch","Glute Bridge"],
  Knee:["Quad Set","Straight Leg Raise","Hamstring Curl","Terminal Knee Extension","Step-Ups"],
  Neck:["Chin Tucks","Upper Trapezius Stretch","Scapular Retraction","Isometric Neck Hold"],
  Shoulder:["Pendulum Exercise","Wall Slides","External Rotation Band","Sleeper Stretch"],
  "Tennis Elbow":["Eccentric Wrist Extension","Forearm Stretch","Grip Strengthening","Pronation/Supination"],
  "Plantar Fasciitis":["Calf Stretch","Plantar Fascia Stretch","Towel Curls","Toe Raises"],
};
const ytSearchEmbed=(q:string)=>`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(q+" physiotherapy exercise")}`;
function makePlan(area:string,severity:number):RecoveryPlan{
  const pool=EXERCISE_LIBRARY[area]||[]; const selected=pool.slice(0,4);
  const items=selected.map(e=>({exercise:e,youtubeQuery:`${e} ${area}`,sets:2+Math.min(2,Math.floor(severity/3)),reps:8+Math.min(8,severity*2)}));
  const estimatedDays=Math.min(56,Math.max(7,Math.round(10+severity*3)));
  return {id:uid(),area,severity,estimatedDays,createdAt:new Date().toISOString(),items} as RecoveryPlan;
}

// UI atoms
function Badge({children}:{children:React.ReactNode}){return <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium rounded bg-slate-100 text-slate-700 border">{children}</span>}
function SafeEmbed({src,title,cta="Load Video"}:{src:string;title:string;cta?:string}){
  const [armed,setArmed]=useState(false);
  return <div className="aspect-video rounded-2xl overflow-hidden border bg-slate-100 flex items-center justify-center">
    {armed?<iframe className="w-full h-full" src={src} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="no-referrer" />:<button onClick={()=>setArmed(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">{cta}</button>}
  </div>;
}
function Stat({icon:Icon,label,value}:any){
  return <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/70 shadow-sm border">
    <div className="p-2 rounded-xl bg-indigo-50"><Icon className="w-5 h-5 text-indigo-600" /></div>
    <div><div className="text-xs text-slate-500">{label}</div><div className="text-base font-semibold text-slate-900">{value}</div></div>
  </div>;
}
function Nav({current,onNavigate,hideCTA=false}:{current:string;onNavigate:(v:string)=>void;hideCTA?:boolean}){
  return <header className="sticky top-0 z-20 backdrop-blur bg-slate-50/70 border-b">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3"><HeartPulse className="w-6 h-6 text-indigo-600" /><span className="font-semibold">FirstRep</span></div>
      <nav className="hidden md:flex items-center gap-6 text-sm">
        {[{id:"landing",label:"Home"},{id:"assessment",label:"Assessment"},{id:"plan",label:"My Plan"},{id:"progress",label:"Progress"},{id:"consult",label:"Consult"},{id:"import",label:"Import Plan"}].map(t=>(
          <button key={t.id} onClick={()=>onNavigate(t.id)} className={`hover:text-indigo-700 ${current===t.id?"text-indigo-700 font-medium":"text-slate-700"}`}>{t.label}</button>
        ))}
      </nav>
      {!hideCTA && <button onClick={()=>onNavigate("signup")} className="md:inline-flex hidden items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-xl shadow hover:bg-indigo-700">Start Free <ArrowRight className="w-4 h-4" /></button>}
    </div>
  </header>;
}

// Pages
function Landing({onStart,log}:{onStart:()=>void;log:(n:string,d?:any)=>void}){
  useEffect(()=>log("landing_viewed"),[log]);
  return <div className="min-h-[70vh] bg-gradient-to-b from-slate-50 to-white">
    <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-slate-900">Recover faster with physiotherapist‑recommended workouts.</h1>
        <p className="mt-3 text-slate-600">FirstRep gives you a personalised plan, daily check‑ins, and on‑demand consults—so you get back to training safely.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat icon={ShieldCheck} label="Expert‑backed" value="Physio protocols" />
          <Stat icon={Clock} label="Time to recover" value="7–56 days (est.)" />
          <Stat icon={TrendingUp} label="Adherence" value=">80% with nudges" />
          <Stat icon={Phone} label="No OTP" value="Name + Mobile only" />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onStart} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow hover:bg-indigo-700">Start Free <ArrowRight className="w-5 h-5" /></button>
          <a href="#testimonials" className="px-4 py-3 rounded-2xl border">See Testimonials</a>
        </div>
      </div>
      <div className="bg-white border rounded-3xl p-4 shadow-sm">
        <SafeEmbed src={ytSearchEmbed("physiotherapy back pain daily routine india")} title="Intro" cta="Load Intro Video" />
        <div className="mt-3 text-xs text-slate-500">Videos are lazy‑loaded to avoid sandbox blocking.</div>
      </div>
    </section>
  </div>;
}

function Signup({ onNext, log }:{ onNext:(u:{name:string;mobile:string})=>void; log:(n:string,d?:any)=>void }){
  const [name,setName]=useState(""); const [mobile,setMobile]=useState(""); const [err,setErr]=useState<string|null>(null);
  const onSubmit=(e:React.FormEvent)=>{ e.preventDefault(); const clean=sanitizeDigits(mobile);
    if(!name.trim()) return setErr("Please enter your name.");
    if(!isValidIndianMobile(clean)) return setErr("Enter a valid 10‑digit Indian mobile (no repeated digits).");
    setErr(null); const profile={name:name.trim(),mobile:clean}; storage.set("user",profile); log("signup_submitted",profile); onNext(profile);
  };
  return <div className="max-w-md mx-auto p-6">
    <h2 className="text-2xl font-semibold mb-2">Create your recovery workspace</h2>
    <p className="text-sm text-slate-600 mb-6">No OTP required. You can update details later.</p>
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="text-sm text-slate-700">Full Name</label><input className="mt-1 w-full border rounded-xl px-3 py-2" placeholder="e.g., Srikant Rao" value={name} onChange={e=>setName(e.target.value)} required/></div>
      <div><label className="text-sm text-slate-700">Mobile Number</label><input className="mt-1 w-full border rounded-xl px-3 py-2 tracking-widest" placeholder="10‑digit mobile" inputMode="numeric" pattern="[0-9]*" value={mobile} onChange={e=>setMobile(sanitizeDigits(e.target.value))} maxLength={10} required/><div className="text-xs text-slate-500 mt-1">Numeric‑only; blocks 0000000000/9999999999 etc.</div></div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button className="w-full bg-indigo-600 text-white py-3 rounded-2xl">Continue</button>
    </form>
  </div>;
}

function Assessment({ onPlan, log }:{ onPlan:(p:RecoveryPlan)=>void; log:(n:string,d?:any)=>void }){
  const [area,setArea]=useState<string>(Object.keys(EXERCISE_LIBRARY)[0]);
  const [severity,setSeverity]=useState<number>(5);
  const [time,setTime]=useState<string>("15–20 min/day");
  const submit=()=>{
    const plan=makePlan(area,severity); storage.set("plan",plan);
    const existing=storage.get<CheckIn[]>("progress",[])||[];
    if(!existing.find(p=>p.date===todayStr())){
      existing.unshift({date:todayStr(), items: plan.items.map(i=>({exercise:i.exercise, completed:false})), painScore: severity});
      storage.set("progress", existing);
    }
    log("assessment_completed",{area,severity,time}); log("plan_generated",{planId:plan.id,area,estimatedDays:plan.estimatedDays}); onPlan(plan);
  };
  return <div className="max-w-2xl mx-auto p-6">
    <h2 className="text-2xl font-semibold mb-1">Tell us where it hurts</h2>
    <p className="text-sm text-slate-600 mb-6">We’ll craft a focused plan with 3–5 movements and daily check‑ins.</p>
    <div className="space-y-5 bg-white border rounded-2xl p-5">
      <div><label className="text-sm text-slate-700">Pain Area</label>
        <select className="mt-1 w-full border rounded-xl px-3 py-2 bg-white" value={area} onChange={e=>setArea(e.target.value)}>
          {Object.keys(EXERCISE_LIBRARY).map(k=>(<option key={k} value={k}>{k}</option>))}
        </select>
      </div>
      <div><label className="text-sm text-slate-700 flex items-center justify-between"><span>Current Pain (0–10)</span><span className="text-slate-500 text-xs">{severity}</span></label>
        <input type="range" min={0} max={10} value={severity} onChange={e=>setSeverity(parseInt(e.target.value))} className="w-full" />
      </div>
      <div><label className="text-sm text-slate-700">Time you can commit daily</label>
        <select className="mt-1 w-full border rounded-xl px-3 py-2 bg-white" value={time} onChange={e=>setTime(e.target.value)}>
          {["10–15 min/day","15–20 min/day","20–30 min/day",">30 min/day"].map(t=>(<option key={t} value={t}>{t}</option>))}
        </select>
      </div>
      <button onClick={submit} className="w-full bg-indigo-600 text-white py-3 rounded-2xl">Generate My Recovery Plan</button>
    </div>
  </div>;
}

function ProgressView({ plan, refresh=0 }:{ plan:RecoveryPlan; refresh?:number }){
  const data=useMemo(()=>{
    const arr=(storage.get<CheckIn[]>("progress",[])||[]).slice().reverse();
    return arr.map(c=>({date:c.date.slice(5), pain:c.painScore, done:c.items.filter(i=>i.completed).length, total:c.items.length}));
  },[plan?.id,refresh]);
  const adherence=useMemo(()=>{
    if(!data.length) return 0; const sumDone=data.reduce((a,b)=>a+b.done,0); const sumTotal=data.reduce((a,b)=>a+b.total,0);
    return Math.round((sumDone/Math.max(1,sumTotal))*100);
  },[data]);
  return <div className="bg-white border rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-2"><LineChartIcon className="w-4 h-4 text-indigo-700" /><div className="text-sm font-medium">Progress Overview</div></div>
    <div className="grid gap-4">
      <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:10,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0,10]} /><Tooltip /><Line type="monotone" dataKey="pain" stroke="#4f46e5" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
      <div className="h-40"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="done" fill="#6366f1" /></BarChart></ResponsiveContainer></div>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-3">
      <Stat icon={CheckCircle2} label="Adherence" value={`${adherence}%`} />
      <Stat icon={CalendarDays} label="Days logged" value={`${data.length}`} />
      <Stat icon={XCircle} label="Remaining (est.)" value={`${Math.max(0,plan.estimatedDays - data.length)}`} />
    </div>
  </div>;
}

// Scheduler
function ConsultScheduler({ source="consult", log, flush }:{ source?:string; log:(n:string,d?:any)=>void; flush:()=>Promise<void> }){
  const user = storage.get<{name:string;mobile:string}>("user",{name:"",mobile:""}) || {name:"",mobile:""};
  const [date,setDate]=useState<string>("");
  const [slotIdx,setSlotIdx]=useState<number>(0);
  const [err,setErr]=useState<string|null>(null);
  const [ok,setOk]=useState<string|null>(null);
  const [confirmed,setConfirmed]=useState<boolean>(false);
  const minDate=fmtDate(new Date()); const maxDate=fmtDate(addDays(new Date(),2));
  const submit=async()=>{
    setErr(null); setOk(null);
    const chosen=hourlySlots[slotIdx];
    if(!date) return setErr("Select a date within the next 3 days.");
    if(date<minDate || date>maxDate) return setErr("Select dates within the next 3 days.");
    if(!chosen) return setErr("Pick a time slot.");
    const record={id:uid(), user, slot:{date,start:chosen.start,end:chosen.end,label:chosen.label}, source, ts:new Date().toISOString()};
    const existing=storage.get<any[]>("callbacks",[])||[]; storage.set("callbacks",[record,...existing].slice(0,100));
    log("callback_slots_submitted",{user,slot:record.slot,source}); try{await flush();}catch{}
    setOk(`Our expert will call you at ${date}, ${chosen.label}.`); setConfirmed(true);
  };
  const change=()=>{ setConfirmed(false); setOk(null); };
  return <div className="bg-white border rounded-2xl p-4">
    {!confirmed? <>
      <div className="text-sm text-slate-700 mb-2">Pick one slot for the next 3 days. We’ll call you between the selected hour.</div>
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        <input type="date" value={date} min={minDate} max={maxDate} onChange={e=>setDate(e.target.value)} className="border rounded-xl px-3 py-2 w-full md:max-w-xs" />
        <select className="border rounded-xl px-3 py-2 w-full md:max-w-xs" value={slotIdx} onChange={e=>setSlotIdx(parseInt(e.target.value))}>
          {hourlySlots.map((s,i)=>(<option key={s.label} value={i}>{s.label}</option>))}
        </select>
        <button type="button" onClick={submit} className="px-3 py-2 rounded-xl bg-indigo-600 text-white w-full md:w-auto">Schedule Callback</button>
      </div>
      {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
      {ok && <div className="text-sm text-green-700 mt-2">{ok}</div>}
    </> : <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div className="text-sm text-green-700">{ok}</div>
      <button type="button" onClick={change} className="px-3 py-2 rounded-xl border w-full md:w-auto">Change Slot</button>
    </div>}
  </div>;
}

// Copilot
/** @typedef {{id:string, role:'user'|'assistant', text:string, ts:string}} CopilotMessage */
function buildCopilotContext(plan:RecoveryPlan|null){
  const progress=storage.get<CheckIn[]>("progress",[])||[]; const latest=progress.find(p=>p.date===todayStr());
  return { plan, latestPain: latest?.painScore ?? null, todayLogged: !!latest, exercises: plan?.items?.map(i=>i.exercise)||[] };
}
function copilotAnswer(q:string, ctx: ReturnType<typeof buildCopilotContext>){
  const text=q.trim().toLowerCase(); const replies:string[]=[];
  if(/numb|tingl|swelling|bruis|give way|locking|fever/.test(text)) replies.push("Potential red flags. Reduce load and schedule a physio callback.");
  if(/my plan|what.*exercis|which moves/.test(text)) replies.push(ctx.plan?`Focus: ${ctx.plan.area}. Today: ${ctx.exercises.join(", ")}.`:"No plan yet—run Assessment.");
  if(/(pain|sore|ache).*\\b(\\d|10)\\b/.test(text)){ const n=parseInt(text.match(/(\\d{1,2})/i)?.[1]||"-1");
    if(n>=7) replies.push("Pain ≥7/10: skip loaded moves; do mobility/isos; consider ice/elevate; book a physio.");
    else if(n>=4) replies.push("Pain 4–6/10: cut volume 30–50%, slow tempo, stay pain‑limited.");
    else if(n>=0) replies.push("Pain 0–3/10: proceed; you may progress ~10% if form solid.");
  }
  if(/form|how to|technique|posture|cue/.test(text)) replies.push("Move slow, neutral spine, exhale on exertion, stop sharp pain.");
  if(!replies.length) replies.push("Ask about pain scaling, swaps, or escalation.");
  return replies.join("\\n\\n");
}
function ChatCopilot({ plan, onNavigate, log }:{ plan:RecoveryPlan|null; onNavigate:(r:string)=>void; log:(n:string,d?:any)=>void }){
  const [open,setOpen]=useState(false); const [input,setInput]=useState("");
  const [messages,setMessages]=useState<CopilotMessage[]>(()=>storage.get("copilot_msgs",[])||[]);
  const push=(m:CopilotMessage)=>{ const next=[...messages,m].slice(-50); setMessages(next); storage.set("copilot_msgs",next); };
  const send=()=>{ const q=input.trim(); if(!q) return; push({id:uid(),role:"user",text:q,ts:new Date().toISOString()}); setInput("");
    const ctx=buildCopilotContext(plan); const a=copilotAnswer(q,ctx); push({id:uid(),role:"assistant",text:a,ts:new Date().toISOString()}); log("copilot_answered",{q,ctx}); };
  const quick=[{label:"Is 7/10 pain ok?",q:"My pain is 7/10—what should I do?"},{label:"Swap exercise",q:"The knee extension hurts—what can I swap it with?"},{label:"Form cues",q:"Form cues for squats?"},{label:"Talk to physio",q:"When should I escalate to a physio?"}];
  return <>
    <button onClick={()=>setOpen(v=>!v)} className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg bg-indigo-600 text-white px-4 py-3 flex items-center gap-2" aria-label="Open recovery copilot"><Stethoscope className="w-4 h-4" /> Copilot</button>
    {open && <div className="fixed bottom-20 right-5 z-40 w-[min(420px,94vw)] max-h-[70vh] bg-white border rounded-2xl shadow-xl flex flex-col">
      <div className="p-3 border-b flex items-center justify-between"><div className="text-sm font-medium">Physio Recovery Assistant</div>{plan?<Badge>Plan: {plan.area}</Badge>:<Badge>No plan</Badge>}</div>
      <div className="p-3 overflow-y-auto flex-1 space-y-2">
        {messages.length===0 && <div className="text-xs text-slate-500">Ask me about pain scaling, swaps, or escalation.</div>}
        {messages.map(m=>(<div key={m.id} className={`${m.role==="user"?"justify-end":"justify-start"} flex`}><div className={`${m.role==="user"?"bg-indigo-600 text-white":"bg-slate-100 text-slate-800"} rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-line`}>{m.text}</div></div>))}
      </div>
      <div className="p-3 border-t space-y-2">
        <div className="flex gap-2 flex-wrap">{quick.map(q=>(<button key={q.label} onClick={()=>setInput(q.q)} className="text-xs px-2 py-1 rounded-xl border hover:bg-slate-50">{q.label}</button>))}<button onClick={()=>onNavigate("consult")} className="text-xs px-2 py-1 rounded-xl border hover:bg-slate-50">Book a physio</button></div>
        <div className="flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") send();}} placeholder="Type your question..." className="flex-1 border rounded-xl px-3 py-2" /><button onClick={send} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Send</button></div>
      </div>
    </div>}
  </>;
}

// Import plan
function ImportPlan({ onImport }:{ onImport:(p:RecoveryPlan)=>void }){
  const [raw,setRaw]=useState(""); const [err,setErr]=useState<string|null>(null);
  const parse=()=>{ try{
      const obj=JSON.parse(raw); if(!obj.area || !Array.isArray(obj.items)) throw new Error("Invalid shape");
      const plan:RecoveryPlan={ id:obj.id||uid(), area:obj.area, severity:obj.severity||5, estimatedDays:obj.estimatedDays||21, createdAt:new Date().toISOString(),
        items: obj.items.map((i:any)=>({exercise:i.exercise, youtubeQuery:i.youtubeQuery||`${i.exercise} ${obj.area}`, sets:i.sets||2, reps:i.reps||10, notes:i.notes||""})) };
      storage.set("plan",plan); setErr(null); onImport(plan);
    } catch{ setErr("Could not parse JSON. Ensure valid structure."); } };
  const downloadTemplate=()=>{ const template={area:"Knee",severity:6,estimatedDays:28,items:[{exercise:"Quad Set",sets:3,reps:12},{exercise:"Straight Leg Raise",sets:3,reps:10}]}; const blob=new Blob([JSON.stringify(template,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="firstrep-plan-template.json"; a.click(); URL.revokeObjectURL(url); };
  return <div className="max-w-2xl mx-auto p-6">
    <h2 className="text-2xl font-semibold mb-2">Import a physiotherapist’s plan</h2>
    <p className="text-sm text-slate-600 mb-4">Paste JSON below or use the template.</p>
    <div className="mb-2 flex gap-2"><button onClick={downloadTemplate} className="px-3 py-2 rounded-xl border inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Download Template</button></div>
    <textarea className="w-full h-56 border rounded-2xl p-3 font-mono text-sm" placeholder='{"area":"Knee","items":[{"exercise":"Quad Set","sets":3,"reps":12}]}' value={raw} onChange={e=>setRaw(e.target.value)} />
    {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
    <button onClick={parse} className="mt-3 w-full bg-indigo-600 text-white py-3 rounded-2xl">Import Plan</button>
  </div>;
}

// Plan view
function PlanView({ plan, onCheckIn, log, flush }:{ plan:RecoveryPlan; onCheckIn:()=>void; log:(n:string,d?:any)=>void; flush:()=>Promise<void> }){
  const todayProgress=(storage.get<CheckIn[]>("progress",[])||[]).find(p=>p.date===todayStr());
  const [pain,setPain]=useState<number>(todayProgress?.painScore ?? plan.severity);
  const [completed,setCompleted]=useState<Record<string,boolean>>(()=>{ const init:Record<string,boolean>={}; plan.items.forEach(i=>{ init[i.exercise]=todayProgress ? !!todayProgress.items.find(it=>it.exercise===i.exercise)?.completed : false; }); return init; });
  const [saved,setSaved]=useState(false);
  const submit=()=>{
    const ci:CheckIn={date:todayStr(), items: plan.items.map(i=>({exercise:i.exercise, completed:!!completed[i.exercise]})), painScore: pain};
    const prev=(storage.get<CheckIn[]>("progress",[])||[]).filter(x=>x.date!==ci.date);
    const updated=[ci, ...prev].slice(0,30); storage.set("progress",updated);
    setSaved(true); setTimeout(()=>setSaved(false),1200);
    log("check_in_submitted",{planId:plan.id,pain,done:ci.items.filter(i=>i.completed).length}); onCheckIn();
  };
  return <div className="max-w-6xl mx-auto p-4 md:p-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      <div><h2 className="text-2xl font-semibold">Your Recovery Plan</h2><div className="text-slate-600 text-sm">Area: {plan.area} • Estimated {plan.estimatedDays} days</div></div>
      <div className="px-3 py-2 rounded-xl bg-white border text-sm">Created {new Date(plan.createdAt).toLocaleDateString()}</div>
    </div>
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-4">
        {plan.items.map(it=>(
          <div key={it.exercise} className="bg-white border rounded-2xl p-4">
            <div className="flex items-center justify-between"><div><div className="font-medium">{it.exercise}</div><div className="text-xs text-slate-500">{it.sets} sets × {it.reps} reps</div></div>
              <a className="text-indigo-600 text-sm inline-flex items-center gap-1" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(it.youtubeQuery+" physiotherapy")}`} target="_blank" rel="noreferrer">Watch <PlayCircle className="w-4 h-4" /></a>
            </div>
            <div className="mt-3"><SafeEmbed src={ytSearchEmbed(it.youtubeQuery)} title={it.exercise} cta="Load Exercise Video" /></div>
            <div className="mt-3 flex items-center gap-2"><input id={`chk-${it.exercise}`} type="checkbox" className="w-4 h-4" checked={!!completed[it.exercise]} onChange={e=>setCompleted({...completed,[it.exercise]:e.target.checked})} /><label htmlFor={`chk-${it.exercise}`} className="text-sm">Mark completed</label></div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-slate-700 mb-2">How was your pain today?</div>
          <div className="flex items-center gap-3"><input type="range" min={0} max={10} value={pain} onChange={e=>setPain(parseInt(e.target.value))} className="w-full" /><div className="w-10 text-right font-semibold">{pain}</div></div>
          <button onClick={submit} className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-2xl">Save Daily Check‑in</button>
          {saved && <div className="mt-2 text-sm text-green-700">Saved ✓</div>}
        </div>
        <ProgressView plan={plan} />
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Stethoscope className="w-4 h-4 text-indigo-700" /><div className="text-sm font-medium">Not improving?</div></div>
          <div className="text-sm text-slate-700 mb-3">Share your available slot and we’ll call you.</div>
          <ConsultScheduler source="plan" log={(n:string,d?:any)=>{}} flush={async()=>{}} />
        </div>
      </div>
    </div>
  </div>;
}

// Root
export default function App(){
  const {log, flush}=useEventLogger();
  const [route,setRoute]=useState<string>(()=>storage.get("route","landing") as string);
  const [user,setUser]=useState<{name:string;mobile:string}|null>(()=>storage.get("user",null));
  const [plan,setPlan]=useState<RecoveryPlan|null>(()=>storage.get("plan",null));
  const [refresh,setRefresh]=useState(0);
  const navigate=(r:string)=>{ setRoute(r); storage.set("route",r); };
  useEffect(()=>{ if(!user && route!=="landing" && route!=="signup") setRoute("landing"); },[route,user]);
  const onSignupNext=(u:{name:string;mobile:string})=>{ setUser(u); navigate("assessment"); };
  const onPlanReady=(p:RecoveryPlan)=>{ setPlan(p); navigate("plan"); };
  const onCheckInSaved=()=>{ setRefresh(v=>v+1); navigate("progress"); };
  return <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
    <Nav current={route} onNavigate={navigate} hideCTA={route!=="landing"} />
    {route==="landing" && <Landing onStart={()=>navigate("signup")} log={log} />}
    {route==="signup" && <Signup onNext={onSignupNext} log={log} />}
    {route==="assessment" && <Assessment onPlan={onPlanReady} log={log} />}
    {route==="plan" && plan && <PlanView plan={plan} onCheckIn={onCheckInSaved} log={log} flush={flush} />}
    {route==="progress" && plan && <div className="max-w-3xl mx-auto p-6"><ProgressView key={refresh} plan={plan} refresh={refresh} /></div>}
    {route==="consult" && <div className="max-w-2xl mx-auto p-6"><h2 className="text-2xl font-semibold mb-2">Consult a Physiotherapist</h2><p className="text-sm text-slate-600 mb-4">Select a single preferred slot in the next 3 days between 10:00 and 19:00; we’ll schedule a callback.</p><ConsultScheduler source="consult" log={log} flush={flush} /></div>}
    {route==="import" && <ImportPlan onImport={onPlanReady} />}
    <ChatCopilot plan={plan} onNavigate={navigate} log={log} />
    <footer className="mt-14 border-t"><div className="max-w-6xl mx-auto px-4 py-6 text-xs text-slate-500 grid md:grid-cols-2 gap-3">
      <div>© {new Date().getFullYear()} FirstRep. Guidance only; not a substitute for medical advice.</div>
      <div className="md:text-right">Plans & check‑ins stay in your browser. Analytics degrade gracefully if blocked.</div>
    </div></footer>
  </div>;
}
