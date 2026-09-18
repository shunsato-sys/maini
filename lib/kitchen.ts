import {z} from 'zod';

export const ingredient=z.object({name:z.string().trim().min(1).max(80),amount:z.string().max(80)});
export const recipe=z.object({
  id:z.string().max(80),
  name:z.string().trim().min(1).max(100),
  url:z.string().max(2000).refine(v=>!v||/^https?:\/\//.test(v),'URLはhttpまたはhttpsで入力してください'),
  notes:z.string().max(2000),
  minutes:z.number().int().min(1).max(300),
  kind:z.enum(['main','side','soup','rice','noodle','other']),
  favorite:z.boolean(),
  ingredients:z.array(ingredient).max(50),
  tags:z.string().max(200),
  rating:z.number().int().min(0).max(5).default(0),
  madeCount:z.number().int().min(0).max(10000).default(0),
  lastCooked:z.string().nullable().default(null),
});
export const meal=z.object({
  id:z.string().max(80),
  main:recipe,
  side:recipe.nullable(),
  soup:recipe.nullable(),
  reason:z.string().max(1000),
  source:z.enum(['saved','standard','ai']),
});
export const stateSchema=z.object({
  recipes:z.array(recipe).max(300),
  history:z.array(z.object({id:z.string(),date:z.string(),meal,liked:z.boolean()})).max(1000),
  shopping:z.array(z.object({id:z.string(),name:z.string().max(80),amount:z.string().max(500),checked:z.boolean()})).max(500),
  selected:meal.nullable(),
  selectedDate:z.string().nullable(),
});
export type Recipe=z.infer<typeof recipe>;
export type Meal=z.infer<typeof meal>;
export type State=z.infer<typeof stateSchema>;
export type Mood='normal'|'tired'|'hungry'|'thrifty'|'healthy'|'fridge';

export const emptyState:State={recipes:[],history:[],shopping:[],selected:null,selectedDate:null};
export const kindLabels={main:'主菜',side:'副菜',soup:'汁物',rice:'ご飯もの',noodle:'麺',other:'その他'} as const;

function r(id:string,name:string,kind:Recipe['kind'],minutes:number,items:string[],notes:string):Recipe{
  return {id,name,kind,minutes,url:'',notes,favorite:false,tags:'定番',ingredients:items.map(s=>{const [name,amount]=s.split('|');return {name,amount:amount||'適量'};}),rating:0,madeCount:0,lastCooked:null};
}

export const standards:Recipe[]=[
  r('std-chicken','鶏の照り焼き','main',25,['鶏もも肉|300g','しょうゆ|大さじ2','みりん|大さじ2','砂糖|大さじ1'],'2人分。鶏肉を食べやすく切り、フライパンで両面を焼く。中心まで十分に火を通し、調味料を加えて絡める。'),
  r('std-pork','豚肉のしょうが焼き','main',20,['豚肉|250g','玉ねぎ|1/2個','しょうが|1かけ','しょうゆ|大さじ2','みりん|大さじ2'],'2人分。玉ねぎと豚肉を炒め、肉に十分に火が通ったらすりおろしたしょうがと調味料を加える。'),
  r('std-salmon','鮭のホイル焼き','main',25,['鮭|2切れ','しめじ|1/2パック','玉ねぎ|1/2個','バター|10g'],'2人分。鮭と薄切りの玉ねぎ、しめじ、バターをホイルで包む。フライパンに並べ水を少量入れ、ふたをして蒸し焼きにし、中心まで十分に火を通す。'),
  r('std-tofu','豆腐と卵の炒めもの','main',15,['豆腐|1丁','卵|2個','ねぎ|1/2本','しょうゆ|小さじ2','ごま油|小さじ2'],'2人分。豆腐は水を切る。ごま油で豆腐とねぎを炒め、溶き卵を加えて十分に加熱し、しょうゆで調味する。'),
  r('std-pork-sprouts','豚肉ともやしの炒めもの','main',15,['豚こま肉|200g','もやし|1袋','しょうゆ|大さじ1','ごま油|小さじ2'],'2人分。ごま油で豚肉を炒め、十分に火が通ったらもやしを加えて炒め、しょうゆで調味する。'),
  r('std-tomato-eggs','卵とトマトの炒めもの','main',10,['卵|3個','トマト|1個','油|小さじ2','塩|少々'],'2人分。油で切ったトマトを炒め、溶き卵を加えてしっかり火を通し、塩で調味する。'),
  r('std-cucumber','きゅうりの酢の物','side',10,['きゅうり|1本','酢|大さじ1','砂糖|小さじ1','塩|少々'],'2人分。きゅうりを薄く切り、塩をふって水気を絞る。酢と砂糖で和える。'),
  r('std-spinach','ほうれん草のごま和え','side',10,['ほうれん草|1/2束','すりごま|大さじ1','しょうゆ|小さじ1','砂糖|小さじ1/2'],'2人分。ほうれん草をゆでて冷まし、水気を絞って切る。調味料とごまで和える。'),
  r('std-tomato','トマトの冷やしサラダ','side',5,['トマト|1個','オリーブ油|小さじ2','塩|少々'],'2人分。トマトを切り、オリーブ油と塩で和える。'),
  r('std-miso','豆腐の味噌汁','soup',10,['豆腐|1/2丁','わかめ|2g','だし|400ml','味噌|大さじ1.5'],'2人分。だしを温めて豆腐とわかめを加える。火を止めて味噌を溶く。'),
  r('std-egg','卵のスープ','soup',10,['卵|1個','ねぎ|1/2本','鶏ガラスープ|400ml','しょうゆ|小さじ1'],'2人分。スープにねぎを入れ、溶き卵を回し入れ十分に加熱する。しょうゆで調味する。'),
];

export function isCatalog(r:Recipe){return r.id.startsWith('kikkoman-');}

function proteinOf(r:Recipe){
  const text=`${r.name} ${r.ingredients.map(i=>i.name).join(' ')}`;
  if(/鮭|さけ|サケ|魚|いわし|サバ|さば|あじ|ツナ|まぐろ|マグロ|エビ|えび|イカ|いか/.test(text))return 'fish';
  if(/豚|ぶた|豚肉/.test(text))return 'pork';
  if(/牛|ビーフ/.test(text))return 'beef';
  if(/鶏|とり|チキン/.test(text))return 'chicken';
  if(/豆腐|納豆|厚揚げ|油揚げ/.test(text))return 'soy';
  if(/卵|たまご/.test(text))return 'egg';
  return 'other';
}

function withDefaults(r:Recipe):Recipe{
  return {...r,rating:r.rating??0,madeCount:r.madeCount??0,lastCooked:r.lastCooked??null};
}

export function suggest(state:State,mood:Mood|string,food:string,max:number,offset=0,extra:Recipe[]=[]):Meal[]{
  const pool=[...state.recipes,...standards,...extra]
    .map(withDefaults)
    .filter((r,i,all)=>all.findIndex(x=>x.name.trim()===r.name.trim()&&x.kind===r.kind)===i);
  const recentNames=state.history.slice(0,5).map(h=>h.meal.main.name);
  const recentProteins=state.history.slice(0,3).map(h=>proteinOf(h.meal.main));
  const terms=food.split(/[,、\s]+/).filter(Boolean);
  const thrifty=mood==='thrifty';
  const healthy=mood==='healthy';
  const fridge=mood==='fridge';
  const score=(r:Recipe)=>{
    const saved=state.recipes.some(x=>x.id===r.id);
    const text=`${r.name} ${r.ingredients.map(i=>i.name).join(' ')} ${r.tags}`;
    let s=0;
    if(saved)s+=12;
    if(r.favorite)s+=5;
    if(r.rating>=4)s+=r.rating;
    if(state.history.some(h=>h.liked&&h.meal.main.name===r.name))s+=4;
    if(terms.some(t=>text.includes(t)))s+=22;
    if(recentNames.includes(r.name))s-=24;
    if(recentProteins.includes(proteinOf(r))&&r.kind==='main')s-=8;
    if(mood==='tired')s-=r.minutes/8;
    if(mood==='hungry'&&r.ingredients.some(i=>/肉|魚|豚|鶏|牛/.test(i.name)))s+=3;
    if(thrifty&&(/もやし|卵|豆腐|キャベツ|鶏むね|豚こま/.test(text)||r.minutes<=20))s+=4;
    if(healthy&&(/サラダ|野菜|豆腐|魚|きのこ|トマト|ほうれん草/.test(text)))s+=4;
    if(fridge&&terms.length===0)s+=Math.min(3,r.ingredients.length>0?1:0);
    if(r.madeCount===0&&r.favorite)s+=3;
    if(r.madeCount>6)s-=2;
    return s;
  };
  const mains=pool.filter(r=>(r.kind==='main'||r.kind==='rice'||r.kind==='noodle')&&r.minutes<=max).sort((a,b)=>score(b)-score(a));
  if(!mains.length)return [];
  const start=offset%mains.length;
  return [...mains.slice(start),...mains.slice(0,start)].slice(0,3).map((main,i)=>{
    const sides=pool.filter(r=>r.kind==='side'&&r.minutes<=max);
    const soups=pool.filter(r=>r.kind==='soup'&&r.minutes<=max);
    const side=sides[(i+offset)%Math.max(sides.length,1)]||null;
    const soup=mood==='tired'?null:soups[(i+offset*2)%Math.max(soups.length,1)]||null;
    const saved=state.recipes.some(r=>r.id===main.id);
    let reason='まずは定番の献立から。レシピを保存すると、あなたの料理を優先します。';
    if(recentNames.includes(main.name))reason='最近も作った定番。気分に合わなければ入れ替えよう。';
    else if(saved)reason='レシピ帳から選びました。最近の主菜や食材の偏りを抑えています。';
    else if(isCatalog(main))reason='参考レシピから選びました。作り方は元ページで確認できます。';
    return {id:crypto.randomUUID(),main,side,soup,reason,source:saved?'saved':'standard'} as Meal;
  });
}

export function shoppingFor(m:Meal){
  const map=new Map<string,string[]>();
  [m.main,m.side,m.soup].filter(Boolean).forEach(r=>r!.ingredients.forEach(i=>map.set(i.name,[...(map.get(i.name)||[]),i.amount])));
  return [...map].map(([name,amounts])=>({id:crypto.randomUUID(),name,amount:amounts.join(' ＋ '),checked:false}));
}

export function bumpCooked(state:State,meal:Meal,day:string):State{
  const names=new Set([meal.main,meal.side,meal.soup].filter(Boolean).map(r=>r!.name));
  const recipes=state.recipes.map(r=>names.has(r.name)?{...withDefaults(r),madeCount:(r.madeCount??0)+1,lastCooked:day}:withDefaults(r));
  return {...state,recipes};
}

export function aiContext(state:State){
  return {
    saved:state.recipes.slice(0,80).map(r=>({
      name:r.name,kind:r.kind,minutes:r.minutes,favorite:r.favorite,rating:r.rating??0,madeCount:r.madeCount??0,lastCooked:r.lastCooked,ingredients:r.ingredients,tags:r.tags,notes:r.notes.slice(0,120),
    })),
    recent:state.history.slice(0,10).map(h=>({date:h.date,main:h.meal.main.name,protein:proteinOf(h.meal.main),liked:h.liked})),
    favorites:state.recipes.filter(r=>r.favorite).map(r=>r.name).slice(0,20),
  };
}
