import {requireAdmin,failure} from '@/lib/server';import {greenRequest} from '@/lib/provider';
export async function GET(){try{await requireAdmin();return Response.json({state:await greenRequest('getStateInstance')});}catch(e){return failure(e);}}
