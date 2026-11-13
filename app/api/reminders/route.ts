import {db,requireAdmin,sameOrigin,failure} from '@/lib/server';
import {reminder} from '@/lib/reminders';
export async function POST(req:Request){try{sameOrigin(req);await requireAdmin();const {error}=await db().from('reminders').insert(reminder(await req.json()));if(error)throw error;return Response.json({ok:true});}catch(e){return failure(e);}}
