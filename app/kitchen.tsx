"use client";
import {useEffect,useRef,useState,FormEvent} from 'react';
import {BookOpen,CalendarDays,ShoppingBasket,History,Sparkles,Clock,Utensils,Plus,Heart,Check,RefreshCw,ExternalLink,Link2,Star} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Toaster,toast} from 'sonner';
import {emptyState,Recipe,Meal,State,Mood,suggest,recipe,shoppingFor,isCatalog,bumpCooked,kindLabels} from '@/lib/kitchen';

const date=()=>new Date().toLocaleDateString('sv-SE');
const newRecipe=():Recipe=>({id:crypto.randomUUID(),name:'',url:'',notes:'',minutes:20,kind:'main',favorite:false,ingredients:[],tags:'',rating:0,madeCount:0,lastCooked:null});
const sourceLabel=(m:Meal)=>m.source==='ai'?'AIの提案':m.source==='saved'?'レシピ帳から':isCatalog(m.main)?'参考レシピ':'おうちの定番';
const moods:[Mood,string][]=[['normal','いつもどおり'],['tired','今日は疲れた'],['hungry','がっつり'],['thrifty','節約したい'],['healthy','ヘルシー'],['fridge','冷蔵庫を使いたい']];

async function jsonFetch<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,init);
  const data=await response.json() as T & {error?:string};
  if(!response.ok)throw new Error(data.error||'通信できませんでした');
  return data;
}

function Stars({value,onChange,disabled}:{value:number;onChange?:(n:number)=>void;disabled?:boolean}){
  return <span className="stars" aria-label={`評価 ${value}`}>
    {[1,2,3,4,5].map(n=><button key={n} type="button" className="star-btn" disabled={disabled||!onChange} aria-label={`${n}点`} onClick={()=>onChange?.(value===n?0:n)}><Star size={16} fill={n<=value?'#9a7a4a':'none'} color={n<=value?'#9a7a4a':'#9ca9b7'}/></button>)}
  </span>;
}

export default function Kitchen(){
  const [tab,setTab]=useState('today');
  const [state,setState]=useState<State>(emptyState);
  const [version,setVersion]=useState(0);
  const [loaded,setLoaded]=useState(false);
  const [signedIn,setSignedIn]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const [mood,setMood]=useState<Mood>('normal');
  const [food,setFood]=useState('');
  const [max,setMax]=useState('30');
  const [offset,setOffset]=useState(0);
  const [meals,setMeals]=useState<Meal[]>(()=>suggest(emptyState,'normal','',30));
  const [mode,setMode]=useState('rules');
  const [message,setMessage]=useState('いまは定番と参考レシピから提案します。');
  const [draft,setDraft]=useState<Recipe|null>(null);
  const [formKind,setFormKind]=useState<Recipe['kind']>('main');
  const [detail,setDetail]=useState<Meal|null>(null);
  const [catalogQuery,setCatalogQuery]=useState('');
  const [catalogKind,setCatalogKind]=useState('');
  const [catalogHits,setCatalogHits]=useState<Recipe[]>([]);
  const [catalogTotal,setCatalogTotal]=useState(0);
  const [catalogMatched,setCatalogMatched]=useState(0);
  const [importing,setImporting]=useState(false);
  const nav=[{id:'today',label:'今日の献立',Icon:CalendarDays},{id:'recipes',label:'レシピ帳',Icon:BookOpen},{id:'history',label:'記録',Icon:History},{id:'shopping',label:'買い物',Icon:ShoppingBasket}];

  async function load(){
    setLoaded(false);setError('');
    try{
      const response=await fetch('/api/state',{cache:'no-store'});
      const data=await response.json() as {state:State;version:number;error?:string};
      if(response.status===401){setSignedIn(false);return;}
      if(!response.ok)throw new Error(data.error);
      setState(data.state);setVersion(data.version);setLoaded(true);setSignedIn(true);
      setMeals(suggest(data.state,'normal','',30));
    }catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{void load();},[]);

  async function persist(next:State){
    if(busyRef.current||!loaded)return false;
    busyRef.current=true;setBusy(true);setError('');
    try{
      const data=await jsonFetch<{version:number}>('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:next,version})});
      setState(next);setVersion(data.version);return true;
    }catch(e){setError((e as Error).message);return false;}
    finally{busyRef.current=false;setBusy(false);}
  }

  async function generate(){
    if(busyRef.current||!loaded)return;
    busyRef.current=true;setBusy(true);setError('');
    try{
      const data=await jsonFetch<{meals:Meal[];mode:string;message:string}>('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mood,food,max:Number(max),offset})});
      setMeals(data.meals);setMode(data.mode);setMessage(data.message);setOffset((offset+1)%10000);
    }catch(e){setError((e as Error).message);}
    finally{busyRef.current=false;setBusy(false);}
  }

  async function choose(m:Meal){
    if(await persist({...state,selected:m,selectedDate:date(),shopping:shoppingFor(m)}))toast.success('今日の献立が決まりました');
  }

  async function cooked(){
    if(!state.selected)return;
    const day=date();
    const next=bumpCooked({
      ...state,
      history:[{id:crypto.randomUUID(),date:day,meal:state.selected,liked:false},...state.history],
      selected:null,
      selectedDate:null,
    },state.selected,day);
    if(await persist(next)){toast.success('作った記録に残しました');setTab('history');}
  }

  function edit(r?:Recipe){
    const value=r||newRecipe();
    setFormKind(value.kind);setDraft(value);setError('');
  }

  async function importUrl(){
    if(!draft?.url){setError('先にレシピURLを入れてください');return;}
    setImporting(true);setError('');
    try{
      const data=await jsonFetch<{url:string;name:string;minutes:number;ingredients:{name:string;amount:string}[];notes:string;fetched:boolean}>('/api/import-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:draft.url})});
      setDraft({...draft,url:data.url,name:data.name||draft.name,minutes:data.minutes||draft.minutes,ingredients:data.ingredients.length?data.ingredients:draft.ingredients,notes:data.notes||draft.notes});
      toast.success(data.fetched?'URLから情報を読み取りました':'URLは保存できます。足りない項目を手入力してください');
    }catch(e){setError((e as Error).message);}
    finally{setImporting(false);}
  }

  async function saveRecipe(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!draft)return;
    const f=new FormData(e.currentTarget);
    const ingredients=String(f.get('ingredients')||'').split('\n').filter(s=>s.trim()).map(s=>{const [name,...amount]=s.split('|');return {name:name.trim(),amount:amount.join('|').trim()||'適量'};});
    const p=recipe.safeParse({...draft,name:String(f.get('name')),url:String(f.get('url')).trim(),notes:String(f.get('notes')),minutes:Number(f.get('minutes')),kind:formKind,tags:String(f.get('tags')),ingredients,rating:draft.rating??0,madeCount:draft.madeCount??0,lastCooked:draft.lastCooked??null});
    if(!p.success){setError(p.error.issues[0].message);return;}
    const recipes=state.recipes.some(r=>r.id===draft.id)?state.recipes.map(r=>r.id===draft.id?p.data:r):[p.data,...state.recipes];
    if(await persist({...state,recipes})){setDraft(null);toast.success('レシピを保存しました');}
  }

  async function saveCatalog(r:Recipe){
    if(state.recipes.some(x=>x.id===r.id)){toast.message('すでにレシピ帳にあります');return;}
    if(state.recipes.length>=300){setError('レシピ帳がいっぱいです。不要なレシピを削除してから追加してください。');return;}
    if(await persist({...state,recipes:[{...r,favorite:false,rating:0,madeCount:0,lastCooked:null},...state.recipes]}))toast.success('レシピ帳に残しました');
  }

  useEffect(()=>{if(!loaded||!signedIn)return;void generate();},[loaded,signedIn]);
  useEffect(()=>{if(!loaded||!signedIn)return;void jsonFetch<{total:number}>(`/api/catalog?limit=1`).then(d=>setCatalogTotal(d.total)).catch(()=>{});},[loaded,signedIn]);
  useEffect(()=>{
    if(!loaded||tab!=='recipes')return;
    const timer=setTimeout(()=>{
      void jsonFetch<{total:number;matched:number;recipes:Recipe[]}>(`/api/catalog?q=${encodeURIComponent(catalogQuery)}&kind=${encodeURIComponent(catalogKind)}&limit=60`)
        .then(data=>{setCatalogHits(data.recipes);setCatalogTotal(data.total);setCatalogMatched(data.matched);})
        .catch(e=>setError((e as Error).message));
    },250);
    return()=>clearTimeout(timer);
  },[catalogQuery,catalogKind,loaded,tab]);

  const ready=loaded&&!busy;
  return <div className="kitchen"><Toaster position="top-center" richColors/>
    <header className="top"><a className="brand" href="/">まいにち<span>献立</span><Utensils size={19}/></a><span className="private-label">わたしの台所</span></header>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="navigation">{nav.map(({id,label,Icon})=><TabsTrigger key={id} value={id}><Icon size={20}/><span>{label}</span></TabsTrigger>)}</TabsList>
      <main>
        {!signedIn&&<div className="notice">レシピと記録を保存するため、ログインしてください。<div className="actions"><a className="primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">ChatGPTでログイン</a></div></div>}
        {signedIn&&!loaded&&!error&&<p className="muted" role="status">レシピ帳を読み込んでいます…</p>}
        {error&&<div className="notice error" role="alert">{error}{!loaded&&<div className="actions"><button className="secondary" onClick={load}>もう一度読み込む</button></div>}</div>}

        <TabsContent value="today">
          <div className="title-row"><div><p className="eyebrow">今日の晩ごはん</p><h1>今日は、何にしよう？</h1></div><span className="round-icon"><Utensils/></span></div>
          {state.selected&&<section className="banner"><p className="muted" style={{color:'#c6dfeb'}}>{state.selectedDate}の献立</p><h2>{state.selected.main.name}</h2><p>{[state.selected.side?.name,state.selected.soup?.name].filter(Boolean).join(' · ')}</p><div className="actions"><button className="secondary" onClick={()=>setDetail(state.selected)}>作り方を見る</button><button className="secondary" disabled={!ready} onClick={cooked}><Check size={17}/>作った！記録する</button><button className="secondary" onClick={()=>setTab('shopping')}>買い物リスト</button></div></section>}
          <section className="planner">
            <h2><Sparkles size={20}/>今の気分で選ぼう</h2>
            <div className="chips">{moods.map(([id,label])=><button key={id} className={mood===id?'active':''} aria-pressed={mood===id} onClick={()=>setMood(id)}>{label}</button>)}</div>
            <label>使いたい食材・ひとこと<input value={food} onChange={e=>setFood(e.target.value)} maxLength={200} placeholder="鶏肉、キャベツ余ってる、簡単に など"/></label>
            <label>主菜の調理時間の目安
              <Select value={max} onValueChange={setMax}><SelectTrigger className="w-full min-h-12 text-base"><SelectValue/></SelectTrigger>
                <SelectContent>{['15','20','30','45','60'].map(n=><SelectItem key={n} value={n}>{n}分以内</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <button className="primary" disabled={!ready} onClick={generate}><Sparkles size={18}/>{busy?'考えています…':mode==='ai'?'AIに献立を考えてもらう':'献立を考える'}</button>
          </section>
          <p className="notice" role="status">{message}{catalogTotal?` 参考レシピは${catalogTotal}件あります。`:''}</p>
          <div className="section-heading"><h2>こんな献立はどう？</h2><button className="secondary" onClick={generate} disabled={!ready} aria-label="献立候補を入れ替える"><RefreshCw size={17}/></button></div>
          <div className="cards">{meals.map((m,i)=><section className="meal-card" key={m.id} style={m.main.id==='std-chicken'?undefined:{gridTemplateColumns:'1fr'}}>
            {m.main.id==='std-chicken'&&<div className="meal-photo"><img src="/dinner.png" alt="鶏の照り焼きと副菜、味噌汁の盛り付け例"/><span className="photo-tag">盛り付けのイメージ</span></div>}
            <div className="meal-body">
              <div className="row"><p className="eyebrow">0{i+1} / {sourceLabel(m)}</p><Heart size={18} color={m.main.favorite?'#b42336':'#9ca9b7'}/></div>
              <h2>{m.main.name}</h2>
              <p>{[m.side?.name,m.soup?.name].filter(Boolean).join(' · ')||'主菜だけで気軽に'}</p>
              <div className="meal-meta"><span><Clock size={16}/>主菜 {m.main.minutes}分</span></div>
              <p className="muted">{m.reason}</p>
              <div className="actions"><button className="secondary" onClick={()=>setDetail(m)}>作り方</button><button className="primary" disabled={!ready} onClick={()=>choose(m)}>{state.selected?.id===m.id?'選んだ献立':'今日はこれにする'}</button></div>
            </div>
          </section>)}</div>
          <p className="installation">iPhoneではSafariの共有メニューから「ホーム画面に追加」で、アプリのように開けます。</p>
        </TabsContent>

        <TabsContent value="recipes">
          <div className="title-row"><div><p className="eyebrow">お気に入りを、少しずつ</p><h1>わたしのレシピ帳</h1><p className="muted">{state.recipes.length}品 保存済み</p></div><button className="primary" disabled={!ready} onClick={()=>edit()}><Plus size={18}/>追加</button></div>
          <p className="muted">URLを貼るだけでも保存できます。材料も残すと、買い物リストに使えます。</p>
          <div className="cards recipe-grid">
            {!state.recipes.length&&<div className="empty"><BookOpen size={32} className="mx-auto mb-3"/><h2>いつもの一品を残そう</h2><p className="muted">下の参考レシピから選ぶか、<br/>自分の料理名とURLを追加できます。</p><button className="secondary" onClick={()=>document.getElementById('catalog-search')?.scrollIntoView({behavior:'smooth'})}>参考レシピを見る</button></div>}
            {state.recipes.map(r=><article className="simple-card" key={r.id}>
              <div className="row"><span className="badge">{kindLabels[r.kind]}</span>
                <button className="secondary" aria-label={r.favorite?'お気に入りから外す':'お気に入りにする'} disabled={!ready} onClick={()=>persist({...state,recipes:state.recipes.map(x=>x.id===r.id?{...x,favorite:!x.favorite}:x)})}><Heart size={18} fill={r.favorite?'#b42336':'none'} color={r.favorite?'#b42336':'#5e6b7e'}/></button>
              </div>
              <h2>{r.name}</h2>
              <p className="muted">{r.minutes}分 {r.tags&&` · ${r.tags}`}{(r.madeCount??0)>0&&` · ${r.madeCount}回`}{r.lastCooked&&` · 最近 ${r.lastCooked}`}</p>
              <Stars value={r.rating??0} disabled={!ready} onChange={n=>persist({...state,recipes:state.recipes.map(x=>x.id===r.id?{...x,rating:n}:x)})}/>
              {r.url&&<a className="link" href={r.url} target="_blank" rel="noopener noreferrer">レシピを開く <ExternalLink size={14} className="inline"/></a>}
              {r.notes&&<p className="muted" style={{whiteSpace:'pre-wrap'}}>{r.notes}</p>}
              <div className="actions"><button className="secondary" disabled={!ready} onClick={()=>edit(r)}>編集する</button><button className="secondary" onClick={()=>setDetail({id:r.id,main:r,side:null,soup:null,reason:'',source:'saved'})}>材料を見る</button></div>
            </article>)}
          </div>
          <section id="catalog-search" className="planner" style={{marginTop:28}}>
            <h2><BookOpen size={20}/>参考レシピから探す</h2>
            <p className="muted">キッコーマン ホームクッキングの公開データから集めた{catalogTotal||'…'}件。献立提案にも使われます。</p>
            <label>料理名・食材で検索<input value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)} maxLength={80} placeholder="鶏肉、豆腐 など"/></label>
            <label>種類
              <Select value={catalogKind||'all'} onValueChange={v=>setCatalogKind(v==='all'?'':v)}>
                <SelectTrigger className="w-full min-h-12 text-base"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="all">すべての区分</SelectItem>{Object.entries(kindLabels).map(([value,label])=><SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <p className="muted">{catalogMatched}件中 {catalogHits.length}件表示（最大60件）</p>
            <div className="cards recipe-grid">{catalogHits.map(r=>{const saved=state.recipes.some(x=>x.id===r.id);return <article className="simple-card" key={r.id}><div className="row"><span className="badge">{kindLabels[r.kind]}</span><span className="muted">{r.minutes}分</span></div><h2>{r.name}</h2><p className="muted">{r.tags}</p>{r.url&&<a className="link" href={r.url} target="_blank" rel="noopener noreferrer">元ページを開く <ExternalLink size={14} className="inline"/></a>}<div className="actions"><button className="secondary" onClick={()=>setDetail({id:r.id,main:r,side:null,soup:null,reason:'',source:'standard'})}>材料を見る</button><button className="primary" disabled={!ready||saved} onClick={()=>saveCatalog(r)}>{saved?'追加済み':'レシピ帳に残す'}</button></div></article>;})}</div>
          </section>
        </TabsContent>

        <TabsContent value="history">
          <p className="eyebrow">おいしかった、を忘れずに</p><h1>作った記録</h1><p className="muted">また食べたい献立にハートを付けよう。</p>
          <div className="cards">
            {!state.history.length&&<div className="empty"><History size={32} className="mx-auto mb-3"/><h2>最初の晩ごはんから</h2><p className="muted">献立を決めて「作った！」を押すと、<br/>ここに記録が残ります。</p></div>}
            {state.history.map(h=><article className="simple-card" key={h.id}>
              <div className="row"><p className="eyebrow">{h.date}</p>
                <button className="secondary" disabled={!ready} aria-label={h.liked?'また食べたいを取り消す':'また食べたい'} onClick={()=>persist({...state,history:state.history.map(x=>x.id===h.id?{...x,liked:!x.liked}:x)})}><Heart size={18} fill={h.liked?'#b42336':'none'} color={h.liked?'#b42336':'#5e6b7e'}/></button>
              </div>
              <h2>{h.meal.main.name}</h2>
              <p className="muted">{[h.meal.side?.name,h.meal.soup?.name].filter(Boolean).join(' · ')}</p>
              <div className="actions"><button className="secondary" onClick={()=>setDetail(h.meal)}>作り方</button><button className="secondary" disabled={!ready} onClick={()=>{void choose(h.meal).then(()=>setTab('today'));}}>もう一度作る</button></div>
            </article>)}
          </div>
        </TabsContent>

        <TabsContent value="shopping">
          <p className="eyebrow">帰り道に、ひと目で</p><h1>買い物リスト</h1>
          <p className="muted">{state.shopping.filter(x=>!x.checked).length}点 未購入 · 材料は保存した分量のまま</p>
          {!state.shopping.length?<div className="empty"><ShoppingBasket size={32} className="mx-auto mb-3"/><h2>献立から、必要なものだけ</h2><p className="muted">今日の献立を選ぶと材料がまとまります。</p><button className="secondary" onClick={()=>setTab('today')}>献立を選ぶ</button></div>
            :<div className="simple-card">{state.shopping.map(item=><div className="shopping-item" key={item.id}><Checkbox id={`shopping-${item.id}`} checked={item.checked} disabled={!ready} className="size-6" onCheckedChange={v=>persist({...state,shopping:state.shopping.map(x=>x.id===item.id?{...x,checked:v===true}:x)})}/><label htmlFor={`shopping-${item.id}`} style={{fontSize:16,textDecoration:item.checked?'line-through':'none',opacity:item.checked?.5:1}}>{item.name}<span className="muted" style={{display:'block'}}>{item.amount}</span></label></div>)}</div>}
          <p className="muted">新しい献立を選ぶと、買い物リストもその献立に切り替わります。</p>
        </TabsContent>
      </main>
    </Tabs>

    <Dialog open={!!draft} onOpenChange={open=>{if(!open&&!busy&&!importing)setDraft(null);}}>
      <DialogContent>
        <DialogTitle>{state.recipes.some(r=>r.id===draft?.id)?'レシピを編集':'レシピを保存'}</DialogTitle>
        <DialogDescription>URLを貼ると、取れる範囲で料理名や材料を自動入力します。</DialogDescription>
        {draft&&<form className="dialog-form" key={`${draft.id}-${draft.name}-${draft.minutes}-${draft.ingredients.length}-${draft.notes.length}`} onSubmit={saveRecipe}>
          {error&&<p className="notice error" role="alert">{error}</p>}
          <label>レシピURL（任意）
            <input name="url" type="url" defaultValue={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})} maxLength={2000} placeholder="https://…"/>
          </label>
          <button type="button" className="secondary w-full" disabled={!ready||importing||!draft.url} onClick={importUrl}><Link2 size={16}/>{importing?'読み取り中…':'URLから読み取る'}</button>
          <label>料理名<input name="name" defaultValue={draft.name} maxLength={100} required placeholder="例：鶏の照り焼き"/></label>
          <div className="form-grid">
            <label>種類
              <Select value={formKind} onValueChange={v=>setFormKind(v as Recipe['kind'])}>
                <SelectTrigger className="w-full min-h-12 text-base"><SelectValue/></SelectTrigger>
                <SelectContent>{Object.entries(kindLabels).map(([value,label])=><SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label>調理時間（分）<input name="minutes" type="number" min={1} max={300} defaultValue={draft.minutes} required/></label>
          </div>
          <label>材料と分量（任意）<textarea name="ingredients" defaultValue={draft.ingredients.map(i=>`${i.name}|${i.amount}`).join('\n')} placeholder={'鶏もも肉|300g\nしょうゆ|大さじ2'}/></label>
          <p className="muted">1行に1つ。「材料名|分量」で入力してください。</p>
          <label>作り方・メモ（任意）<textarea name="notes" defaultValue={draft.notes} maxLength={2000} placeholder="手順、家族の好み、分量など"/></label>
          <label>タグ（任意）<input name="tags" defaultValue={draft.tags} maxLength={200} placeholder="簡単、家族に人気 など"/></label>
          <div><p className="muted" style={{marginBottom:6}}>評価</p><Stars value={draft.rating??0} onChange={n=>setDraft({...draft,rating:n})}/></div>
          <button className="primary w-full" disabled={!ready||importing}>{busy?'保存しています…':'保存する'}</button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null);}}>
      <DialogContent>
        <DialogTitle>材料と作り方</DialogTitle>
        <DialogDescription>{detail?.source==='saved'?'レシピ帳に保存した内容です。':detail&&isCatalog(detail.main)?'参考レシピです。分量は掲載元の表記のままです。':'新しい料理・定番の材料は2人分の目安です。'}</DialogDescription>
        <div className="dialog-form">{detail&&[detail.main,detail.side,detail.soup].filter(Boolean).map(r=><section key={r!.id} className="subheading"><span className="badge">{kindLabels[r!.kind]}</span><h2 className="mt-3">{r!.name}</h2>{r!.ingredients.length?<ul className="ingredients">{r!.ingredients.map((i,n)=><li key={n} className="row"><span>{i.name}</span><span className="muted">{i.amount}</span></li>)}</ul>:<p className="muted">材料はまだ登録されていません。</p>}<p style={{whiteSpace:'pre-wrap'}}>{r!.notes||'作り方はレシピURLをご覧ください。'}</p>{r!.url&&<a className="link" href={r!.url} target="_blank" rel="noopener noreferrer">元のレシピを開く</a>}{!state.recipes.some(x=>x.id===r!.id)&&<button className="secondary mt-3" disabled={!ready} onClick={async()=>{if(await persist({...state,recipes:[{...r!,id:crypto.randomUUID(),rating:0,madeCount:0,lastCooked:null},...state.recipes]}))toast.success('レシピ帳に保存しました');}}>レシピ帳に残す</button>}</section>)}</div>
      </DialogContent>
    </Dialog>
  </div>;
}
