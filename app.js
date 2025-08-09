const byId = (id) => document.getElementById(id);
const show = (id) => {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  byId(id).classList.add('active');
};

const state = { user:null, intake:null, plan:null, checkins:[] };

function saveState(){ localStorage.setItem('firstrep_state', JSON.stringify(state)); }
function loadState(){ try{ Object.assign(state, JSON.parse(localStorage.getItem('firstrep_state')||'{}')); }catch(e){} }

function init(){
  byId('year').innerText = new Date().getFullYear();

  // Onboarding
  byId('send-otp').addEventListener('click', ()=>{
    const phone = byId('phone').value.trim();
    if(!phone){ alert('Enter a valid mobile number'); return; }
    state.user = { phone }; saveState();
    byId('otp-block').classList.remove('hidden');
  });
  byId('verify-otp').addEventListener('click', ()=>{
    const otp = byId('otp').value.trim();
    if(otp.length!==4){ alert('Enter the 4-digit code'); return; }
    show('step-intake');
  });

  // Intake
  const painSlider = byId('pain-level'), painReadout = byId('pain-readout');
  painSlider.addEventListener('input', ()=> painReadout.textContent = painSlider.value);

  byId('generate-plan').addEventListener('click', ()=>{
    const area = byId('body-area').value;
    const outcome = byId('priority-outcome').value;
    const pain = parseInt(byId('pain-level').value, 10);
    if(!area || !outcome){ alert('Select body area and outcome'); return; }
    state.intake = { area, outcome, pain, createdAt: Date.now() };
    const list = (WORKOUT_LIBRARY[area]||[]).filter(w=>w.focus===outcome);
    const pool = list.length>=3 ? list : (WORKOUT_LIBRARY[area]||[]);
    const workouts = pool.slice(0,5);
    state.plan = { workouts, area, outcome, startDate:new Date().toISOString(), targetDays:21 };
    saveState(); renderPlan(); show('step-plan');
  });

  byId('skip-to-consult').addEventListener('click', ()=>{ renderPhysios(); show('step-consult'); });
  byId('start-checkins').addEventListener('click', ()=> show('step-checkins'));
  byId('not-improving').addEventListener('click', ()=>{ renderPhysios(); show('step-consult'); });

  // Check-ins
  const ciPain = byId('ci-pain'), ciPainReadout = byId('ci-pain-readout');
  ciPain.addEventListener('input', ()=> ciPainReadout.textContent = ciPain.value);
  byId('log-checkin').addEventListener('click', ()=>{
    const e = { ts:Date.now(), pain:parseInt(byId('ci-pain').value,10),
      mobility:byId('ci-mobility').value, adherence:parseInt(byId('ci-adherence').value,10) };
    state.checkins.push(e); saveState(); renderProgress(); renderHistory(); alert('Check-in logged.');
  });

  byId('view-physios').addEventListener('click', ()=>{ renderPhysios(); show('step-consult'); });
  byId('back-to-plan').addEventListener('click', ()=> show('step-plan'));

  // Restore
  loadState();
  if(state.plan){ renderPlan(); show('step-plan'); renderProgress(); renderHistory(); }
}

function renderPlan(){
  const sub = byId('plan-subtitle'); const {area,outcome} = state.plan;
  sub.textContent = `Focus: ${pretty(outcome)} • Area: ${prettyArea(area)} • 3-week ramp`;
  const list = byId('workout-list'); list.innerHTML='';
  state.plan.workouts.forEach(w=>{
    const el = document.createElement('div'); el.className='workout';
    el.innerHTML = `
      <div class="badges">
        <span class="badge">${pretty(state.plan.outcome)}</span>
        <span class="badge">${prettyArea(state.plan.area)}</span>
      </div>
      <h3>${w.name}</h3>
      <div class="meta">Sets x Reps: <b>${w.sets} x ${w.reps}</b> • Hold: <b>${w.hold}</b></div>
      <div class="meta">${w.note||''}</div>`;
    list.appendChild(el);
  });
}

function renderPhysios(){
  const c = document.getElementById('physio-list'); c.innerHTML='';
  PHYSIOS.forEach(p=>{
    const el = document.createElement('div'); el.className='physio';
    el.innerHTML = `
      <h3>${p.name}</h3>
      <div class="row"><div>Experience</div><div><b>${p.exp}</b></div></div>
      <div class="row"><div>Rating</div><div><b>${p.rating}★</b></div></div>
      <div class="row"><div>15-min Price</div><div><b>₹${p.price}</b></div></div>
      <div class="cta-row"><a class="btn" href="${p.link}" target="_blank"><button>Start 15-min consult</button></a></div>`;
    c.appendChild(el);
  });
}

function renderProgress(){
  const streak = computeStreak(state.checkins);
  byId('streak').textContent = `${streak} day${streak===1?'':'s'}`;
  if(state.checkins.length){
    const avg = (state.checkins.reduce((s,c)=>s+c.pain,0)/state.checkins.length).toFixed(1);
    byId('avg-pain').textContent = `${avg}/10`;
    const target = state.plan?.targetDays || 21;
    const completion = Math.min(100, Math.round((state.checkins.length/target)*100));
    byId('completion').textContent = `${completion}%`;
  } else { byId('avg-pain').textContent='–'; byId('completion').textContent='0%'; }
}

function renderHistory(){
  const container = byId('checkin-history'); container.innerHTML='';
  [...state.checkins].reverse().forEach(c=>{
    const d = new Date(c.ts);
    const el = document.createElement('div'); el.className='history-item';
    el.innerHTML = `<div>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</div>
      <div>Pain ${c.pain}/10 • ${c.mobility} • ${c.adherence}%</div>`;
    container.appendChild(el);
  });
}

function computeStreak(list){
  if(!list.length) return 0;
  const days = new Set(list.map(c=> new Date(c.ts).toDateString()));
  let streak=0, today=new Date();
  for(let i=0;i<1000;i++){ const d=new Date(today); d.setDate(today.getDate()-i);
    if(days.has(d.toDateString())) streak++; else break; }
  return streak;
}

function prettyArea(a){ return {knee:'Knee',lower_back:'Lower Back',shoulder:'Shoulder',neck:'Neck',elbow:'Elbow',ankle:'Ankle'}[a]||a; }
function pretty(o){ return {reduce_pain:'Reduce Pain',increase_mobility:'Increase Mobility',return_to_sport:'Return to Sport',posture_correction:'Posture Correction'}[o]||o; }

document.addEventListener('DOMContentLoaded', init);
