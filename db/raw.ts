import {env} from 'cloudflare:workers';
export function rawDb(){if(!env.DB)throw new Error('保存サービスが利用できません');return env.DB;}
