const express=require("express"),http=require("http"),{Server}=require("socket.io"),crypto=require("crypto"),fs=require("fs"),path=require("path");
const app=express(),server=http.createServer(app),io=new Server(server),PORT=process.env.PORT||3000;
const data=path.join(__dirname,"data"),UF=path.join(data,"users.json"),QF=path.join(data,"questions.json");
if(!fs.existsSync(data))fs.mkdirSync(data,{recursive:true}); if(!fs.existsSync(UF))fs.writeFileSync(UF,"{}");
const users=JSON.parse(fs.readFileSync(UF)),questions=JSON.parse(fs.readFileSync(QF)),rooms=new Map();
const save=()=>fs.writeFileSync(UF,JSON.stringify(users,null,2));
const hp=(p,s=crypto.randomBytes(16).toString("hex"))=>({salt:s,hash:crypto.scryptSync(p,s,64).toString("hex")});
const verify=(p,u)=>{const h=crypto.scryptSync(p,u.salt,64).toString("hex");return crypto.timingSafeEqual(Buffer.from(h,"hex"),Buffer.from(u.hash,"hex"))};
const clean=n=>String(n||"").trim();
const safe=k=>users[k]&&{nickname:users[k].nickname,bestRound:users[k].bestRound||0,quizWins:users[k].quizWins||0};
function code(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let x;do{x=Array.from({length:5},()=>c[Math.floor(Math.random()*c.length)]).join("")}while(rooms.has(x));return x}
function pub(r){return{code:r.code,status:r.status,players:[...r.players.values()].map(p=>({nickname:p.nickname,ready:p.ready,surrendered:p.surrendered}))}}
function update(r){io.to(r.code).emit("room:update",pub(r))}
function pick(){const a=questions.map((_,i)=>i);for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,200)}
function finish(r,result){if(r.status==="finished")return;r.status="finished";io.to(r.code).emit("game:finished",{result})}
function question(r){const q=questions[r.ids[r.current]];io.to(r.code).emit("game:question",{number:r.current+1,total:200,question:q.question,options:q.options,category:q.category,seconds:60})}
app.use(express.json());app.use(express.static(path.join(__dirname,"public")));
app.post("/api/register",(req,res)=>{const n=clean(req.body.nickname),p=String(req.body.password||""),k=n.toLowerCase();
 if(!/^[\p{L}\p{N}_-]{3,16}$/u.test(n))return res.status(400).json({error:"Nickname: 3–16 caracteres, sem espaços, usando letras, números, _ ou -."});
 if(p.length<4||p.length>72)return res.status(400).json({error:"A senha precisa ter entre 4 e 72 caracteres."});
 if(users[k])return res.status(409).json({error:"Esse nickname já está em uso."}); users[k]={nickname:n,...hp(p),bestRound:0,quizWins:0};save();res.json({user:safe(k)})});
app.post("/api/login",(req,res)=>{const k=clean(req.body.nickname).toLowerCase(),p=String(req.body.password||""),u=users[k];
 if(!u||!verify(p,u))return res.status(401).json({error:"Nickname ou senha incorretos."});res.json({user:safe(k)})});
app.get("/api/health",(req,res)=>res.json({ok:true,questions:questions.length}));
io.on("connection",s=>{
 s.on("room:create",({nickname})=>{const c=code(),r={code:c,host:s.id,status:"lobby",players:new Map(),ids:[],current:0,answers:new Set()};
  r.players.set(s.id,{nickname,ready:false,surrendered:false});rooms.set(c,r);s.join(c);s.data.room=c;update(r)});
 s.on("room:join",({nickname,code:c})=>{c=String(c||"").trim().toUpperCase();const r=rooms.get(c);
  if(!r)return s.emit("room:error","Sala não encontrada.");if(r.status!=="lobby")return s.emit("room:error","Essa partida já começou.");
  if(r.players.size>=8)return s.emit("room:error","A sala está cheia.");r.players.set(s.id,{nickname,ready:false,surrendered:false});s.join(c);s.data.room=c;update(r)});
 s.on("room:ready",()=>{const r=rooms.get(s.data.room);if(!r||r.status!=="lobby")return;const p=r.players.get(s.id);if(!p)return;p.ready=!p.ready;update(r);
  if(r.players.size&&[...r.players.values()].every(x=>x.ready||x.surrendered)){r.status="playing";r.ids=pick();r.current=0;r.answers=new Set();io.to(r.code).emit("game:start",{total:200});question(r)}});
 s.on("room:surrender",()=>{const r=rooms.get(s.data.room);if(!r||r.status!=="lobby")return;const p=r.players.get(s.id);if(!p)return;p.surrendered=true;p.ready=false;update(r);
  if([...r.players.values()].every(x=>x.ready||x.surrendered))finish(r,"loss")});
 s.on("game:answer",({index})=>{const r=rooms.get(s.data.room);if(!r||r.status!=="playing")return;if(r.answers.has(s.id))return;const q=questions[r.ids[r.current]];
  if(Number(index)!==q.options.indexOf(q.answer))return finish(r,"loss");r.answers.add(s.id);
  if(r.answers.size===r.players.size){r.current++;if(r.current>=200){for(const p of r.players.values()){const u=users[p.nickname.toLowerCase()];if(u)u.quizWins=(u.quizWins||0)+1}save();return finish(r,"win")}r.answers=new Set();question(r)}});
 s.on("game:timeout",()=>{const r=rooms.get(s.data.room);if(r&&r.status==="playing")finish(r,"loss")});
 s.on("disconnect",()=>{const r=rooms.get(s.data.room);if(!r)return;r.players.delete(s.id);if(!r.players.size)rooms.delete(r.code);else if(r.status==="lobby")update(r);else if(r.status==="playing")finish(r,"loss")});
});
server.listen(PORT,()=>console.log(`Grupão Minigames: http://localhost:${PORT}`));