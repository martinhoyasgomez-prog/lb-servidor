// Servidor de clasificación de Isla Pino Royale. Requiere Node 14+. Sin dependencias.
// Uso: node server.js   (puerto 8787 por defecto; PORT y LB_FILE son opcionales)
const http=require('http'),fs=require('fs');
const FILE=process.env.LB_FILE||'lb.json';
let db={};try{db=JSON.parse(fs.readFileSync(FILE,'utf8'));}catch(e){}
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db));
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const send=(r,code,obj)=>{r.writeHead(code,{...CORS,'Content-Type':'application/json'});r.end(JSON.stringify(obj));};
http.createServer((q,r)=>{
 if(q.method==='OPTIONS'){r.writeHead(204,CORS);return r.end();}
 if(q.method==='GET'&&q.url.split('?')[0]==='/leaderboard'){
  return send(r,200,Object.values(db).sort((a,b)=>b.coins-a.coins).slice(0,100));}
 if(q.method==='POST'&&q.url==='/stats'){
  let b='';q.on('data',c=>{b+=c;if(b.length>4096)q.destroy();});
  q.on('end',()=>{try{
    const d=JSON.parse(b),name=String(d.name||'').trim();
    if(!/^[\w\- ]{2,16}$/.test(name))return send(r,400,{ok:0,error:'nombre no válido'});
    const k=name.toLowerCase(),o=db[k]||{name,coins:0,kills:0,deaths:0,wins:0};
    // Solo sube: cada estadística guarda el máximo enviado.
    for(const f of['coins','kills','deaths','wins'])o[f]=Math.max(o[f],Math.floor(Math.max(0,+d[f]||0)));
    o.name=name;db[k]=o;save();send(r,200,{ok:1});
  }catch(e){send(r,400,{ok:0,error:'datos no válidos'});}});
  return;}
 send(r,404,{error:'no encontrado'});
}).listen(process.env.PORT||8787,()=>console.log('Clasificación en http://localhost:'+(process.env.PORT||8787)));
