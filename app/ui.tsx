'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {nepal, nextRun} from '@/lib/schedule';

type Reminder = {id:string; title:string; message:string; schedule_type:'once'|'daily'|'weekly'; scheduled_at:string|null; time_of_day:string|null; day_of_week:number|null; next_run_at:string; enabled:boolean};
type Delivery = {id:string; status:string; scheduled_for:string; error_message:string|null; provider_message_id:string|null};
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const templates = [
 {title:'Daily check-in',message:'Hey! Just checking in. How is your day going?',schedule_type:'daily' as const,time:'18:00'},
 {title:'Take a break',message:'A little reminder to pause, drink some water, and take care of yourself.',schedule_type:'daily' as const,time:'14:00'},
 {title:'Weekly catch-up',message:'Time for our weekly catch-up. What was the highlight of your week?',schedule_type:'weekly' as const,time:'19:00'},
];
const empty = {title:'',message:'',schedule_type:'once' as Reminder['schedule_type'],date:'',time:'09:00',day:0,enabled:true};
function localParts(value:string){return new Date(+new Date(value)+345*60000).toISOString();}

export default function Dashboard({loggedIn,reminders,deliveries,loadError=false}:{loggedIn:boolean;reminders:Reminder[];deliveries:Delivery[];loadError?:boolean}){
 const router=useRouter();
 const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);const [draft,setDraft]=useState(empty);
 const [query,setQuery]=useState('');const [filter,setFilter]=useState('all');const [historyFilter,setHistoryFilter]=useState('all');
 const [connection,setConnection]=useState('Not checked');
 async function request(path:string,method='POST',body?:unknown){
  setBusy(true);setNotice('');
  try{const res=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed');router.refresh();return data;}
  catch(e){setNotice(e instanceof Error?e.message:'Request failed');return null;}finally{setBusy(false);}
 }
 let preview='Choose a future date and time';let valid=false;
 try{preview=nepal(nextRun({schedule_type:draft.schedule_type,scheduled_at:draft.date?`${draft.date}T${draft.time}:00+05:45`:null,time_of_day:draft.time,day_of_week:draft.day}));valid=true;}catch{}
 async function save(){
  if(!valid){setNotice('Choose a valid future schedule.');return;}
  const result=await request(editing?`/api/reminders/${editing}`:'/api/reminders',editing?'PATCH':'POST',{
   title:draft.title,message:draft.message,schedule_type:draft.schedule_type,scheduled_at:draft.schedule_type==='once'?new Date(`${draft.date}T${draft.time}:00+05:45`).toISOString():null,
   time_of_day:draft.schedule_type==='once'?null:draft.time,day_of_week:draft.schedule_type==='weekly'?draft.day:null,enabled:draft.enabled,
  });
  if(result){setEditing(null);setDraft(empty);setNotice('Reminder saved. Your next message is scheduled.');}
 }
 function openReminder(r:Reminder,duplicate=false){
  setEditing(duplicate?null:r.id);
  setDraft({title:duplicate?`${r.title.slice(0,113)} (copy)`:r.title,message:r.message,schedule_type:r.schedule_type,date:r.scheduled_at?localParts(r.scheduled_at).slice(0,10):'',time:r.time_of_day?.slice(0,5)||(r.scheduled_at?localParts(r.scheduled_at).slice(11,16):'09:00'),day:r.day_of_week??0,enabled:duplicate?true:r.enabled});
  document.getElementById('composer')?.scrollIntoView({behavior:'smooth',block:'start'});
  if(duplicate)setNotice('Copy ready. Review the schedule and save to create it.');
 }
 const visible=reminders.filter(r=>(`${r.title} ${r.message}`).toLowerCase().includes(query.toLowerCase())&&(filter==='all'||(filter==='active'?r.enabled:filter==='paused'?!r.enabled:r.schedule_type===filter)));
 const history=deliveries.filter(d=>historyFilter==='all'||d.status===historyFilter);
 const active=reminders.filter(r=>r.enabled);
 const upcoming=[...active].sort((a,b)=>a.next_run_at.localeCompare(b.next_run_at))[0];
 const attention=deliveries.filter(d=>d.status!=='accepted').length;
 return <main>
  <header className="header"><div><div className="eyebrow"><span className="brand-dot"/> YOUR PERSONAL MESSAGING SPACE</div><h1>Thoughtful messages.<br/><span>Perfect timing.</span></h1><p>Plan a little today. Stay connected every day.</p></div><div className="timezone"><span className="badge">NEPAL TIME</span><strong>Asia/Kathmandu</strong><small>UTC +05:45 · All schedules use local time</small></div></header>
  {notice&&<div role="status" className="notice">{notice}<button className="text-button" onClick={()=>setNotice('')} aria-label="Dismiss notification">Dismiss</button></div>}
  {loadError&&<div role="alert" className="notice error">Database unavailable. Apply the SQL migration and check server configuration.</div>}
  {!loggedIn?<section className="login"><span className="badge">PRIVATE WORKSPACE</span><h2>Welcome back</h2><p>Your reminders, all in one place.</p><form action={async f=>{await request('/api/login','POST',Object.fromEntries(f));}}><label>Email<input name="email" type="email" required autoComplete="username" placeholder="you@example.com"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label><button disabled={busy} className="wide">{busy?'Signing in…':'Sign in to your workspace →'}</button></form></section>:<>
   <div className="toolbar"><div className="row"><span className="connection-dot"/><small>WhatsApp: {connection}</small><button disabled={busy} className="text-button" onClick={async()=>{const d=await request('/api/status','GET');if(d)setConnection(d.state);}}>Check connection</button></div><div className="row"><button disabled={busy} className="secondary" onClick={async()=>{if(confirm('Send a test message to your configured recipient?')){const d=await request('/api/test-message');if(d)setNotice('Test message accepted by provider. Handset delivery is not yet confirmed.');}}}>Send test message ↗</button><button disabled={busy} className="text-button" onClick={()=>request('/api/logout')}>Sign out</button></div></div>
   <div className="stats"><div><small>ACTIVE REMINDERS</small><strong>{active.length.toString().padStart(2,'0')}</strong><p>Ready for the right moment</p></div><div><small>NEXT SCHEDULED MESSAGE</small><strong className="stat-title">{upcoming?.title||'A clear schedule'}</strong><p>{upcoming?`${nepal(upcoming.next_run_at)} NPT`:'Create a reminder to get started'}</p></div><div><small>RECENT ATTEMPTS TO REVIEW</small><strong>{attention.toString().padStart(2,'0')}</strong><p>From the latest {deliveries.length} attempts</p></div></div>
   <div className="grid"><section id="composer"><div className="section-heading"><div><small className="eyebrow">MAKE TIME FOR WHAT MATTERS</small><h2>{editing?'Edit your reminder':'Compose a reminder'}</h2></div><span className="badge">✎</span></div>
    <label>Start with a template<select value="" onChange={e=>{const t=templates[Number(e.target.value)];if(t){setEditing(null);setDraft({...empty,...t});}}}><option value="" disabled>Choose a starting point</option>{templates.map((t,i)=><option key={t.title} value={i}>{t.title}</option>)}</select></label>
    <form action={save}><label>Reminder title<input name="title" required maxLength={120} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Something worth remembering"/></label><label>Message<textarea name="message" required maxLength={4000} value={draft.message} onChange={e=>setDraft({...draft,message:e.target.value})} placeholder="Write something thoughtful…"/></label><div className="message-meta"><small>Sent to your configured recipient</small><small>{draft.message.length} / 4000</small></div>
     <label>Repeat<select value={draft.schedule_type} onChange={e=>setDraft({...draft,schedule_type:e.target.value as Reminder['schedule_type']})}><option value="once">Once · one special moment</option><option value="daily">Daily · build a routine</option><option value="weekly">Weekly · stay in touch</option></select></label>
     <div className="form-row">{draft.schedule_type==='once'&&<label>Date in Nepal<input name="date" type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>}<label>Time in Nepal<input name="time" type="time" required value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></label></div>
     {draft.schedule_type==='weekly'&&<label>Day of the week<select value={draft.day} onChange={e=>setDraft({...draft,day:Number(e.target.value)})}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>}
     <div className="preview"><small>NEXT SCHEDULED OCCURRENCE</small><strong>{preview}{valid?' NPT':''}</strong>{draft.message&&<p className="bubble">{draft.message}</p>}</div>
     <div className="row"><button disabled={busy||!valid}>{busy?'Working…':editing?'Save changes':'Schedule message →'}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setDraft(empty);}}>Cancel</button>}</div>
    </form>
   </section><section><div className="section-heading"><div><small className="eyebrow">YOUR UPCOMING MOMENTS</small><h2>Reminder collection</h2></div><span className="badge">{visible.length} reminders</span></div>
    <label className="sr-only" htmlFor="search">Search reminders</label><input id="search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles or messages…"/>
    <div className="filters" aria-label="Filter reminders">{[['all','All'],['active','Active'],['paused','Paused / completed'],['daily','Daily'],['weekly','Weekly']].map(([value,label])=><button key={value} className={filter===value?'selected':'text-button'} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
    {!visible.length&&<div className="empty"><span>✧</span><h3>{reminders.length?'No matching reminders':'Make your first moment'}</h3><p>{reminders.length?'Try a different search or filter.':'Write a message or pick a template to get started.'}</p></div>}
    {visible.map(r=><article key={r.id}><div className="row spread"><strong>{r.title}</strong><span className={`badge ${r.enabled?'active':''}`}>{r.enabled?r.schedule_type:r.schedule_type==='once'?'Completed':'Paused'}</span></div><p className="message">{r.message}</p><div className="schedule-line">◷ {nepal(r.next_run_at)} NPT{r.schedule_type==='weekly'&&r.day_of_week!==null?` · ${days[r.day_of_week]}`:''}</div><div className="row actions"><button disabled={busy} className="secondary" onClick={()=>openReminder(r)}>Edit</button><button disabled={busy} className="secondary" onClick={()=>openReminder(r,true)}>Duplicate</button>{r.schedule_type!=='once'&&<button disabled={busy} className="secondary" onClick={()=>request(`/api/reminders/${r.id}`,'PATCH',{enabled:!r.enabled})}>{r.enabled?'Pause':'Resume'}</button>}<button disabled={busy} className="text-button danger" onClick={()=>{if(confirm(`Delete “${r.title}”? Delivery history will be preserved.`))request(`/api/reminders/${r.id}`,'DELETE');}}>Delete</button></div></article>)}
   </section></div>
   <section><div className="section-heading"><div><small className="eyebrow">EVERY ATTEMPT, ACCOUNTED FOR</small><h2>Delivery activity</h2></div><label className="history-select">Show attempts<select value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)}><option value="all">All statuses</option><option value="accepted">Accepted</option><option value="uncertain">Uncertain</option><option value="sending">In progress / unconfirmed</option></select></label></div><p className="history-note">Latest 50 attempts. Accepted means provider acceptance, not confirmed handset delivery. Uncertain attempts are never retried automatically.</p>
    {!history.length&&<div className="empty"><h3>{deliveries.length?'No attempts with this status':'Your story starts here'}</h3><p>Delivery attempts will appear here when messages are sent.</p></div>}
    {history.map(d=><article key={d.id}><div className="row spread"><div className="row"><span className={`badge ${d.status==='accepted'?'active':'review'}`}>{d.status==='sending'?'In progress / outcome unconfirmed':d.status}</span><small>{nepal(d.scheduled_for)} NPT</small></div>{d.provider_message_id&&<small className="provider-id">Provider ID: {d.provider_message_id}</small>}</div>{d.error_message&&<p>{d.error_message}</p>}{d.status==='uncertain'&&<small>Check GREEN-API before manually scheduling a replacement.</small>}</article>)}
   </section><footer>Made for meaningful connections. Scheduled in Nepal time.</footer>
  </>}
 </main>;
}
