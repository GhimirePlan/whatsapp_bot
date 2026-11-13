import {timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/server';import {greenRequest,providerConfigured} from '@/lib/provider';
export const maxDuration=60;
export async function POST(req:Request){const expected=process.env.CRON_SECRET;const got=req.headers.get('authorization')||'';if(!expected||Buffer.byteLength(got)!==Buffer.byteLength(`Bearer ${expected}`)||!timingSafeEqual(Buffer.from(got),Buffer.from(`Bearer ${expected}`)))return Response.json({error:'Unauthorized'},{status:401});
 if(!providerConfigured()||!process.env.SUPABASE_SECRET_KEY||!process.env.NEXT_PUBLIC_SUPABASE_URL)return Response.json({error:'Server configuration incomplete'},{status:503});
 const client=db();let accepted=0,uncertain=0;
 for(let i=0;i<3;i++){const {data,error}=await client.rpc('claim_due');if(error)return Response.json({error:'Dispatch database error'},{status:500});if(!data?.length)break;const item=data[0];
 let result;try{result={status:'accepted',provider_message_id:await greenRequest('sendMessage',item.message)};accepted++;}catch{result={status:'uncertain',error_message:'Provider outcome unconfirmed; inspect GREEN-API before resending'};uncertain++;}
 const {error:saveError}=await client.from('deliveries').update(result).eq('id',item.delivery_id);if(saveError)return Response.json({error:'Result persistence failed; do not retry this occurrence'},{status:500});}
 return Response.json({accepted,uncertain});}
