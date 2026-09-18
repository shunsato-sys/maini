import {getChatGPTUser} from '@/app/chatgpt-auth';
import {z} from 'zod';

const input=z.object({url:z.string().url().max(2000)});

function decode(html:string){
  return html
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&nbsp;/g,' ')
    .trim();
}

function meta(html:string,keys:string[]){
  for(const key of keys){
    const patterns=[
      new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`,`i`),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`,`i`),
      new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`,`i`),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`,`i`),
    ];
    for(const re of patterns){
      const m=html.match(re);
      if(m?.[1])return decode(m[1]);
    }
  }
  return '';
}

function titleFrom(html:string){
  return meta(html,['og:title','twitter:title'])||decode((html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]||'').replace(/\s+/g,' '));
}

function ingredientsFrom(html:string){
  const items:string[]=[];
  const li=/itemprop=["']recipeIngredient["'][^>]*>([^<]+)</gi;
  let m:RegExpExecArray|null;
  while((m=li.exec(html))&&items.length<30){
    const text=decode(m[1]).replace(/\s+/g,' ').trim();
    if(text)items.push(text);
  }
  if(items.length)return items.map(line=>{
    const parts=line.split(/[\s　]+/);
    if(parts.length>=2)return {name:parts.slice(0,-1).join(' '),amount:parts.at(-1)||'適量'};
    return {name:line,amount:'適量'};
  });
  return [] as {name:string;amount:string}[];
}

function minutesFrom(html:string){
  const total=meta(html,['og:totalTime','cookTime'])||html.match(/itemprop=["']totalTime["'][^>]*content=["']([^"']+)["']/i)?.[1]||'';
  const m=total.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i)||html.match(/(\d+)\s*分/);
  if(!m)return 20;
  if(m[0].startsWith('PT')||total.startsWith('PT')){
    const h=Number(m[1]||0);const min=Number(m[2]||0);return Math.min(300,Math.max(1,h*60+min||20));
  }
  return Math.min(300,Math.max(1,Number(m[1])||20));
}

export async function POST(req:Request){
  try{
    const user=await getChatGPTUser();
    if(!user)return Response.json({error:'ログインしてください'},{status:401});
    if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'不正なリクエストです'},{status:403});
    const parsed=input.safeParse(await req.json());
    if(!parsed.success)return Response.json({error:'URLを確認してください'},{status:400});
    const target=parsed.data.url;
    const host=new URL(target).hostname;
    if(!/^https?:$/.test(new URL(target).protocol))return Response.json({error:'httpまたはhttpsのURLにしてください'},{status:400});
    const response=await fetch(target,{
      redirect:'follow',
      signal:AbortSignal.timeout(12000),
      headers:{'User-Agent':'MainichiKondateBot/1.0 (+https://github.com/shunsato-sys/maini)','Accept':'text/html'},
    });
    if(!response.ok)return Response.json({url:target,name:'',minutes:20,ingredients:[],notes:`${host} から取得できませんでした。手入力で補完してください。`,fetched:false});
    const html=(await response.text()).slice(0,500000);
    const name=titleFrom(html).slice(0,100);
    const ingredients=ingredientsFrom(html);
    const minutes=minutesFrom(html);
    return Response.json({
      url:target,
      name,
      minutes,
      ingredients,
      notes:name?`${host} から読み取りました。足りない項目は手で直してください。`:`${host} からタイトルを取得できませんでした。手入力で補完してください。`,
      fetched:Boolean(name||ingredients.length),
    });
  }catch{
    return Response.json({error:'URLの読み取りに失敗しました。手入力で保存できます。'},{status:503});
  }
}
