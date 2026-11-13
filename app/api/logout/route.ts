import {auth,sameOrigin,failure} from '@/lib/server';
export async function POST(req:Request){try{sameOrigin(req);await (await auth()).auth.signOut();return Response.json({ok:true});}catch(e){return failure(e);}}
