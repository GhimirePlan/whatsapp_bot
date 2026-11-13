import {db,requireAdmin} from '@/lib/server';import Dashboard from './ui';
export const dynamic='force-dynamic';
export default async function Page(){let loggedIn=false;try{await requireAdmin();loggedIn=true;}catch{}
 if(!loggedIn)return <Dashboard loggedIn={false} reminders={[]} deliveries={[]}/>;
 const client=db();const [r,d]=await Promise.all([client.from('reminders').select('*').order('next_run_at'),client.from('deliveries').select('*').order('created_at',{ascending:false}).limit(50)]);
 return <Dashboard loggedIn reminders={r.data||[]} deliveries={d.data||[]} loadError={!!(r.error||d.error)}/>;
}
