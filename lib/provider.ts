export function providerConfigured(){return !!(process.env.GREEN_API_TOKEN&&process.env.GREEN_API_INSTANCE_ID&&process.env.GREEN_API_BASE_URL&&/^\d{7,15}$/.test(process.env.WHATSAPP_RECIPIENT||''));}
export async function greenRequest(method:'sendMessage'|'getStateInstance',message?:string,fetcher:typeof fetch=fetch){
 const {GREEN_API_BASE_URL:base,GREEN_API_INSTANCE_ID:id,GREEN_API_TOKEN:token,WHATSAPP_RECIPIENT:recipient}=process.env;
 if(!base||!id||!token||(message!==undefined&&!/^\d{7,15}$/.test(recipient||'')))throw new Error('Provider configuration missing');
 const url=new URL(base);if(url.protocol!=='https:'||!/^\d+\.api\.greenapi\.com$/.test(url.hostname)||!/^\d+$/.test(id))throw new Error('Invalid provider configuration');
 try{
 const res=await fetcher(`${url.origin}/waInstance${id}/${method}/${token}`,{method:message===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:message===undefined?undefined:JSON.stringify({chatId:`${recipient}@c.us`,message}),signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!res.ok)throw new Error('Provider did not confirm acceptance');
 const data=await res.json();if(method==='sendMessage'){if(typeof data.idMessage!=='string'||!data.idMessage)throw new Error('Invalid provider response');return data.idMessage;}
 if(typeof data.stateInstance!=='string')throw new Error('Invalid provider response');return data.stateInstance;
 }catch{throw new Error('Provider outcome unconfirmed; automatic retry disabled');}
}
