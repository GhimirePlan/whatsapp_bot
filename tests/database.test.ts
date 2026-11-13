import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('SQL migration, unique claims, advancement and database access controls',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role;');
 await db.exec(await readFile(new URL('../supabase/001_scheduler.sql',import.meta.url),'utf8'));
 const {rows:[r]}=await db.query<{id:string}>("insert into reminders(title,message,schedule_type,scheduled_at,next_run_at) values('Once','Hello','once',now()-interval '1 minute',now()-interval '1 minute') returning id");
 const results=await Promise.all(Array.from({length:8},()=>db.query('select * from claim_due()')));
 assert.equal(results.reduce((n,r)=>n+r.rows.length,0),1);
 assert.equal((await db.query<{enabled:boolean}>('select enabled from reminders where id=$1',[r.id])).rows[0].enabled,false);
 await db.exec("insert into reminders(title,message,schedule_type,time_of_day,next_run_at) values('Daily','Hi','daily','09:00',now()-interval '2 days');insert into reminders(title,message,schedule_type,time_of_day,day_of_week,next_run_at) values('Weekly','Hi','weekly','10:00',0,now()-interval '8 days');");
 await db.query('select * from claim_due()');await db.query('select * from claim_due()');
 const next=await db.query<{valid:boolean}>("select bool_and(next_run_at>now()) as valid from reminders where schedule_type<>'once'");assert.equal(next.rows[0].valid,true);
 assert.equal((await db.query<{valid:boolean}>("select extract(dow from next_run_at at time zone 'Asia/Kathmandu')=0 as valid from reminders where schedule_type='weekly'")).rows[0].valid,true);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from reminders'),/permission denied/);await assert.rejects(db.query('select * from claim_due()'),/permission denied/);
 }finally{await db.close();}
});
