// Servidor de clasificación y salas públicas de Isla Pino Royale. Node 14+, sin dependencias.
// Uso: node server.js   (PORT y LB_FILE son opcionales)
const http=require('http'),fs=require('fs');
const FILE=process.env.LB_FILE||'lb.json';
let db={};try{db=JSON.parse(fs.readFileSync(FILE,'utf8'));}catch(e){}
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db));
const ROOMS={};                    // código -> {code,host,count,mode,ts}
const ROOM_TTL=45000;              // una sala desaparece si el anfitrión no la renueva en 45 s
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
const send=(r,code,obj)=>{r.writeHead(code,{...CORS,'Content-Type':'application/json'});r.end(JSON.stringify(obj));};
const body=(q,cb,max=4096)=>{let b='';q.on('data',c=>{b+=c;if(b.length>max)q.destroy();});q.on('end',()=>{try{cb(JSON.parse(b||'{}'));}catch(e){cb(null);}});};
const activeRooms=()=>{const now=Date.now();return Object.values(ROOMS).filter(x=>now-x.ts<ROOM_TTL).sort((a,b)=>b.count-a.count).slice(0,50).map(({code,host,count,mode})=>({code,host,count,mode}));};
http.createServer((q,r)=>{
 const path=q.url.split('?')[0];
 if(q.method==='OPTIONS'){r.writeHead(204,CORS);return r.end();}
 if(q.method==='GET'&&path==='/leaderboard'){
  return send(r,200,Object.values(db).sort((a,b)=>b.coins-a.coins).slice(0,100));}
 if(q.method==='POST'&&path==='/stats'){
  return body(q,d=>{
    if(!d)return send(r,400,{ok:0,error:'datos no válidos'});
    const name=String(d.name||'').trim();
    if(!/^[\w\- ]{2,16}$/.test(name))return send(r,400,{ok:0,error:'nombre no válido'});
    const k=name.toLowerCase(),o=db[k]||{name,coins:0,kills:0,deaths:0,wins:0};
    for(const f of['coins','kills','deaths','wins'])o[f]=Math.max(o[f],Math.floor(Math.max(0,+d[f]||0)));
    o.name=name;if(typeof d.t==='string')o.t=d.t.replace(/[<>]/g,'').slice(0,24);if(typeof d.c==='string')o.c=d.c.replace(/[<>]/g,'').slice(0,24);db[k]=o;save();send(r,200,{ok:1});});}
 if(q.method==='GET'&&path==='/rooms'){return send(r,200,activeRooms());}
 if(q.method==='POST'&&path==='/rooms'){
  return body(q,d=>{
    if(!d||!/^[A-Z0-9]{4,8}$/.test(String(d.code||'')))return send(r,400,{ok:0,error:'código no válido'});
    ROOMS[d.code]={code:d.code,host:String(d.host||'Anfitrión').slice(0,16),count:Math.max(1,Math.min(100,+d.count||1)),mode:Math.max(1,Math.min(4,+d.mode||1)),ts:Date.now()};
    send(r,200,{ok:1});});}
 if(q.method==='DELETE'&&path.startsWith('/rooms/')){
  delete ROOMS[decodeURIComponent(path.slice(7))];return send(r,200,{ok:1});}
 send(r,404,{error:'no encontrado'});
}).listen(process.env.PORT||8787,()=>console.log('Servidor en puerto '+(process.env.PORT||8787)));
