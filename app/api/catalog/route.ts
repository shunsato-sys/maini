import {getChatGPTUser} from '@/app/chatgpt-auth';
import {catalog} from '@/lib/catalog';
import {recipe} from '@/lib/kitchen';
export async function GET(req:Request){
 try{
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'ログインしてください'},{status:401});
  const url=new URL(req.url);
  const q=url.searchParams.get('q')||'';
  const kind=url.searchParams.get('kind')||'';
  const limit=Math.min(60,Math.max(1,Number(url.searchParams.get('limit')||60)||60));
  const id=url.searchParams.get('id');
  if(id){const hit=catalog.find(r=>r.id===id);return Response.json({total:catalog.length,recipes:hit?[recipe.parse(hit)]:[]},{headers:{'Cache-Control':'public, max-age=3600'}});}
  const terms=q.normalize('NFKC').trim().toLowerCase().split(/[\s、,]+/).filter(Boolean);
  const found=catalog.filter(r=>(!kind||r.kind===kind)&&terms.every(t=>(r.name+' '+r.ingredients.map(i=>i.name).join(' ')+' '+r.tags).normalize('NFKC').toLowerCase().includes(t)));
  return Response.json({total:catalog.length,matched:found.length,recipes:found.slice(0,limit)},{headers:{'Cache-Control':'public, max-age=300'}});
 }catch{return Response.json({error:'参考レシピを読み込めませんでした'},{status:503});}
}
