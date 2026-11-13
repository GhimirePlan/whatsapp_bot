import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function auth(){const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:(items)=>{for(const i of items)jar.set(i.name,i.value,i.options);}}});}
export async function requireAdmin(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||!process.env.ADMIN_USER_ID)throw new Error('Unauthorized');const client=await auth();const {data:{user},error}=await client.auth.getUser();if(error||!user||!process.env.ADMIN_USER_ID||user.id!==process.env.ADMIN_USER_ID)throw new Error('Unauthorized');return user;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)throw new Error('Invalid origin');const parsed=new URL(origin);if(!['http:','https:'].includes(parsed.protocol)||parsed.host!==req.headers.get('host'))throw new Error('Invalid origin');}
export function failure(e:unknown){const unauthorized=e instanceof Error&&e.message==='Unauthorized';return Response.json({error:unauthorized?'Unauthorized':'Request could not be completed'},{status:unauthorized?401:400});}
