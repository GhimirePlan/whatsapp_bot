export type Schedule = {schedule_type:'once'|'daily'|'weekly';scheduled_at?:string|null;time_of_day?:string|null;day_of_week?:number|null};
const OFFSET=345*60000;
export function nextRun(s:Schedule,after=new Date()):string {
 if(s.schedule_type==='once') {const d=new Date(s.scheduled_at||'');if(!Number.isFinite(+d)||+d<=+after)throw new Error('Choose a future date');return d.toISOString();}
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time_of_day||''))throw new Error('Invalid time');
 if(s.schedule_type==='weekly'&&(!Number.isInteger(s.day_of_week)||s.day_of_week!<0||s.day_of_week!>6))throw new Error('Invalid weekday');
 const local=new Date(+after+OFFSET);const [h,m]=s.time_of_day!.split(':').map(Number);
 let candidate=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),h,m)-OFFSET;
 for(let i=0;i<8;i++,candidate+=86400000)if(candidate>+after&&(s.schedule_type==='daily'||new Date(candidate+OFFSET).getUTCDay()===s.day_of_week))return new Date(candidate).toISOString();
 throw new Error('Invalid schedule');
}
export const nepal=(v:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kathmandu',dateStyle:'medium',timeStyle:'short'}).format(new Date(v));
