import {z} from 'zod';
import {nextRun} from './schedule';
export const schema=z.object({title:z.string().trim().min(1).max(120),message:z.string().trim().min(1).max(4000),schedule_type:z.enum(['once','daily','weekly']),scheduled_at:z.string().nullable().optional(),time_of_day:z.string().nullable().optional(),day_of_week:z.number().int().min(0).max(6).nullable().optional(),enabled:z.boolean().default(true)});
export function reminder(input:unknown){const s=schema.parse(input);return {...s,next_run_at:nextRun(s)};}
