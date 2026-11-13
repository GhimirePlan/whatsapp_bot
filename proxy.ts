import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return response;
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll:items=>{for(const i of items)request.cookies.set(i.name,i.value);response=NextResponse.next({request});for(const i of items)response.cookies.set(i.name,i.value,i.options);}}});
 await client.auth.getUser();return response;
}
export const config={matcher:['/']};
