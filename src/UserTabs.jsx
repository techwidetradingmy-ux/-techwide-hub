import {useState,useEffect,useRef} from "react";
import {supabase} from "./supabaseClient";
import {PRIZES,getTier,calcScore} from "./constants";

const DIFF_C={Easy:"#34c759",Medium:"#ff9500",Hard:"#ff3b30"};
const CAT_C={Sales:"#5856d6",Teamwork:"#007aff",Admin:"#af52de",Creativity:"#ff2d55"};

export function MissionsTab({profile,missions,myClaims,setMyClaims,doClaimMission,showToast,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [f,setF]=useState("All");
  const [submitting,setSubmitting]=useState(null);
  const [subText,setSubText]=useState("");
  const [subImg,setSubImg]=useState(null);
  const [subLoading,setSubLoading]=useState(false);
  const cats=["All","Sales","Teamwork","Admin","Creativity"];
  const list=f==="All"?missions:missions.filter(m=>m.category===f);

  const handleImg=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>setSubImg(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitProof=async claim=>{
    if(!subText.trim()&&!subImg){showToast("Please add text or photo proof");return;}
    setSubLoading(true);
    const{error}=await supabase.from("mission_submissions").insert({user_id:profile.id,mission_id:claim.mission_id,claim_id:claim.id,submission_text:subText,submission_image:subImg,status:"Pending"});
    if(!error){
      await supabase.from("mission_claims").update({submitted:true}).eq("id",claim.id);
      const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
      if(data)setMyClaims(data);
      showToast("Proof submitted! Awaiting admin approval 🎉");
      setSubmitting(null);setSubText("");setSubImg(null);
    }
    setSubLoading(false);
  };

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}} className="fade">
        {cats.map(c=>(
          <button key={c} onClick={()=>setF(c)} style={{flexShrink:0,padding:"6px 15px",borderRadius:99,fontSize:14,fontWeight:f===c?600:400,background:f===c?ACC:"rgba(0,0,0,.06)",color:f===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>{c}</button>
        ))}
      </div>
      {list.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No missions yet</div>}
      {list.map(m=>{
        const claim=myClaims.find(c=>c.mission_id===m.id);
        const done=claim?.completed;
        const submitted=claim?.submitted;
        const isSubForm=submitting?.id===claim?.id;
        return(
          <div key={m.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,opacity:done?.65:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,marginRight:12}}>
                <div style={{fontSize:17,color:done?LB3:LBL,fontWeight:500,letterSpacing:"-.35px",textDecoration:done?"line-through":"none",marginBottom:3}}>{m.title}</div>
                <div style={{fontSize:14,color:LB3,lineHeight:1.45}}>{m.description}</div>
              </div>
              <div style={{background:`${ACC}14`,borderRadius:9,padding:"6px 10px",textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:17,fontWeight:700,color:ACC,lineHeight:1}}>+{m.xp}</div>
                <div style={{fontSize:10,color:LB3}}>pts</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <Chip color={CAT_C[m.category]||"#8e8e93"}>{m.category}</Chip>
              <Chip color={DIFF_C[m.difficulty]||"#8e8e93"}>{m.difficulty}</Chip>
              <Chip color="#8e8e93">{m.period}</Chip>
            </div>
            {done?(
              <div style={{fontSize:14,color:"#34c759",fontWeight:600}}>✓ Completed & Approved</div>
            ):submitted?(
              <div style={{fontSize:14,color:"#ff9500",fontWeight:600}}>⏳ Proof submitted — pending approval</div>
            ):isSubForm?(
              <div style={{borderTop:`1px solid ${SEP}`,paddingTop:12}}>
                <div style={{fontSize:12,color:LB3,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Submit Proof</div>
                <textarea value={subText} onChange={e=>setSubText(e.target.value)} placeholder="Describe what you did…" rows={3}
                  style={{width:"100%",background:"#f2f2f7",border:"none",outline:"none",borderRadius:10,padding:"10px 12px",fontSize:15,color:LBL,resize:"none",fontFamily:SF,marginBottom:8}}/>
                <div onClick={()=>document.getElementById(`img_${m.id}`).click()} style={{border:`1.5px dashed ${subImg?"transparent":SEP}`,borderRadius:10,padding:subImg?"0":"14px",textAlign:"center",cursor:"pointer",marginBottom:8,overflow:"hidden",background:subImg?`url(${subImg}) center/cover`:"transparent",minHeight:subImg?120:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {!subImg&&<div style={{fontSize:13,color:LB3}}>📷 Attach image (optional)</div>}
                </div>
                <input id={`img_${m.id}`} type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setSubmitting(null);setSubText("");setSubImg(null);}} style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",borderRadius:10,fontSize:15,color:LB2,border:"none",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                  <button onClick={()=>submitProof(claim)} disabled={subLoading} style={{flex:2,padding:"10px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>{subLoading?"Submitting…":"Submit Proof"}</button>
                </div>
              </div>
            ):claim?(
              <div style={{display:"flex",gap:8}}>
                <button style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",borderRadius:10,fontSize:15,color:LB2,border:"none",cursor:"default",fontFamily:SF}}>Claimed ✓</button>
                <button onClick={()=>setSubmitting(claim)} style={{flex:1,padding:"10px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>Submit Proof</button>
              </div>
            ):(
              <button className="pressable" onClick={()=>doClaimMission(m.id)} style={{width:"100%",padding:"11px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>Claim Mission</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LeaderboardTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,getLevel,getLvlPct,getTier,calcScore,Section}){
  return(
    <div style={{padding:"0 16px 12px"}}>
      <Section className="fade">
        {allProfiles.map((s,i)=>{
          const me=s.id===profile.id;
          const medal=["🥇","🥈","🥉"][i]||null;
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:me?`${ACC}08`:BG2,borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
              <div style={{width:26,textAlign:"center",fontWeight:700,fontSize:medal?20:13,color:i<3?ORG:"#8e8e93",flexShrink:0}}>{medal||`${i+1}`}</div>
              <div style={{width:42,height:42,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                {!s.avatar_url&&(s.avatar||"?")}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{fontSize:16,color:me?ACC:LBL,fontWeight:me?600:400,letterSpacing:"-.3px"}}>{s.nickname||s.name?.split(" ")[0]}{me?" (you)":""}</div>
                  <span style={{fontSize:13}}>{sTier.emoji}</span>
                </div>
                <div style={{fontSize:12,color:LB3,marginTop:1}}>{s.role} · Lv.{getLevel(s.xp)} · {s.streak||0}🔥</div>
                <div style={{marginTop:4,background:"#e5e5ea",borderRadius:99,height:3}}>
                  <div style={{width:`${getLvlPct(s.xp)}%`,height:"100%",background:`linear-gradient(90deg,${ACC},${ORG})`,borderRadius:99}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:15,fontWeight:700,color:ACC,letterSpacing:"-.5px"}}>{s.xp.toLocaleString()}</div>
                <div style={{fontSize:10,color:LB3,marginTop:1}}>pts</div>
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

export function PrizesTab({profile,prizes,doRedeem,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [filter,setFilter]=useState("All");
  const display=prizes.length>0?prizes:PRIZES.map(x=>({...x,cost:x.pts,category:x.cat}));
  const cats=["All",...new Set(display.map(p=>p.cat||p.category).filter(Boolean))];
  const filtered=filter==="All"?display:display.filter(p=>(p.cat||p.category)===filter);
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{background:BG2,borderRadius:13,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:15,color:LB2}}>Your balance</div>
        <div style={{fontSize:22,fontWeight:700,color:ACC,letterSpacing:"-.8px"}}>{profile.xp.toLocaleString()} <span style={{fontSize:14,fontWeight:500,color:LB3}}>pts</span></div>
      </div>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{flexShrink:0,padding:"5px 13px",borderRadius:99,fontSize:13,fontWeight:filter===c?600:400,background:filter===c?ACC:"rgba(0,0,0,.06)",color:filter===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>{c}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {filtered.map(p=>{
          const cost=p.pts||p.cost;
          const can=profile.xp>=cost;
          const out=(p.stock||99)<1;
          return(
            <div key={p.id} className="fade" style={{background:BG2,borderRadius:13,padding:"15px 12px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",opacity:out?.5:1}}>
              <div style={{fontSize:32,marginBottom:6}}>{p.icon}</div>
              <div style={{fontSize:14,color:LBL,fontWeight:500,marginBottom:4,lineHeight:1.3}}>{p.name}</div>
              <Chip color="#8e8e93">{p.cat||p.category}</Chip>
              <div style={{fontSize:12,color:LB3,marginTop:6,marginBottom:6,lineHeight:1.4}}>{p.desc}</div>
              <div style={{fontSize:18,fontWeight:700,color:can&&!out?ACC:"#8e8e93",marginBottom:2}}>{cost.toLocaleString()}</div>
              <div style={{fontSize:10,color:LB3,marginBottom:10}}>pts · {p.stock||"∞"} left</div>
              <button onClick={()=>doRedeem(p)} disabled={!can||out} style={{width:"100%",padding:"9px",background:(!can||out)?"rgba(0,0,0,.06)":ACC,color:(!can||out)?LB3:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:(!can||out)?"default":"pointer",fontFamily:SF}}>
                {out?"Sold Out":can?"Redeem":"Need More"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CommunityTab({profile,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const bottomRef=useRef(null);

  useEffect(()=>{
    loadMessages();
    const iv=setInterval(loadMessages,4000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const loadMessages=async()=>{
    const{data}=await supabase.from("messages").select("*").order("created_at",{ascending:true}).limit(100);
    if(data)setMessages(data);
  };

  const send=async()=>{
    if(!text.trim()||sending)return;
    setSending(true);
    await supabase.from("messages").insert({user_id:profile.id,sender_name:profile.nickname||profile.name,sender_avatar:profile.avatar,content:text.trim(),is_system:false});
    setText("");
    await loadMessages();
    setSending(false);
  };

  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});
  const isMe=msg=>msg.user_id===profile.id;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 170px)"}}>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No messages yet. Say hi! 👋</div>}
        {messages.map(msg=>{
          const me=isMe(msg);
          if(msg.is_system)return(
            <div key={msg.id} style={{textAlign:"center",padding:"4px 8px"}}>
              <div style={{display:"inline-block",background:`${ACC}10`,borderRadius:12,padding:"8px 14px",fontSize:13,color:ACC,lineHeight:1.55,maxWidth:"88%",whiteSpace:"pre-line"}}>{msg.content}</div>
            </div>
          );
          return(
            <div key={msg.id} style={{display:"flex",flexDirection:me?"row-reverse":"row",alignItems:"flex-end",gap:8}}>
              {!me&&<div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0}}>{msg.sender_avatar||msg.sender_name?.charAt(0)||"?"}</div>}
              <div style={{maxWidth:"72%"}}>
                {!me&&<div style={{fontSize:11,color:LB3,marginBottom:3,paddingLeft:4}}>{msg.sender_name}</div>}
                <div style={{background:me?ACC:BG2,borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <div style={{fontSize:15,color:me?"#fff":LBL,lineHeight:1.45,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                </div>
                <div style={{fontSize:10,color:LB3,marginTop:3,textAlign:me?"right":"left",paddingLeft:me?0:4}}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"8px 16px",background:BG2,borderTop:`1px solid ${SEP}`,display:"flex",gap:8,alignItems:"center"}}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Message your team…"
          style={{flex:1,background:"#f2f2f7",border:"none",outline:"none",borderRadius:22,padding:"10px 16px",fontSize:16,color:LBL,fontFamily:SF}}/>
        <button onClick={send} disabled={!text.trim()||sending} style={{width:40,height:40,borderRadius:"50%",background:text.trim()?ACC:"#e5e5ea",border:"none",cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,transition:"background .15s",color:"#fff"}}>
          {sending?"…":"▶"}
        </button>
      </div>
    </div>
  );
}

export function ProfileTab({profile,syncProfile,score,tier,completedCount,showToast,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({nickname:profile.nickname||"",bio:profile.bio||"",hobby:profile.hobby||"",favorite_food:profile.favorite_food||"",whatsapp:profile.whatsapp||"",avatar_url:profile.avatar_url||"",banner_url:profile.banner_url||""});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleFile=(key,id)=>e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>set(key,ev.target.result);
    reader.readAsDataURL(file);
  };

  const save=async()=>{
    setSaving(true);
    const{error}=await supabase.from("profiles").update(form).eq("id",profile.id);
    if(!error){syncProfile({...profile,...form});showToast("Profile updated ✓");setEditing(false);}
    setSaving(false);
  };

  const inp={width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF};
  const FR=(label,key,ph,type="text",last=false)=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>
      <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph} type={type} style={inp}/>
    </div>
  );

  const av=form.avatar_url||profile.avatar_url;
  const bn=form.banner_url||profile.banner_url;

  return(
    <div style={{paddingBottom:12}}>
      {/* Banner */}
      <div style={{height:130,background:bn?`url(${bn}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,position:"relative"}}>
        {editing&&<button onClick={()=>document.getElementById("bnIn").click()} style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.55)",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:SF}}>Change Banner</button>}
        <input id="bnIn" type="file" accept="image/*" onChange={handleFile("banner_url","bnIn")} style={{display:"none"}}/>
      </div>

      {/* Avatar + actions */}
      <div style={{padding:"0 16px",marginTop:-44,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{position:"relative"}}>
          <div style={{width:84,height:84,borderRadius:"50%",background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,border:`3px solid ${BG2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:ACC,overflow:"hidden"}}>
            {!av&&(profile.avatar||"?")}
          </div>
          {editing&&<button onClick={()=>document.getElementById("avIn2").click()} style={{position:"absolute",bottom:2,right:2,width:26,height:26,background:ACC,border:`2px solid ${BG2}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13}}>📷</button>}
          <input id="avIn2" type="file" accept="image/*" onChange={handleFile("avatar_url","avIn2")} style={{display:"none"}}/>
        </div>
        <button onClick={editing?save:()=>setEditing(true)} disabled={saving} style={{background:editing?ACC:"rgba(0,0,0,.07)",color:editing?"#fff":LBL,border:"none",borderRadius:99,padding:"8px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
          {saving?"Saving…":editing?"Save Changes":"Edit Profile"}
        </button>
      </div>

      <div style={{padding:"0 16px",marginBottom:14}}>
        <div style={{fontSize:22,fontWeight:700,color:LBL,letterSpacing:"-.5px"}}>{profile.nickname||profile.name}</div>
        <div style={{fontSize:14,color:LB3,marginTop:2}}>{profile.name} · {profile.role}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:5,background:tier.color+"18",borderRadius:99,padding:"3px 10px",marginTop:8}}>
          <span>{tier.emoji}</span>
          <span style={{fontSize:12,color:tier.color,fontWeight:700}}>{tier.name}</span>
        </div>
        {profile.bio&&!editing&&<div style={{fontSize:14,color:LB2,marginTop:10,lineHeight:1.6}}>{profile.bio}</div>}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"0 16px",marginBottom:16}}>
        {[{l:"Points",v:profile.xp.toLocaleString()},{l:"Contrib. Score",v:score.toLocaleString()},{l:"Missions Done",v:completedCount}].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:13,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:ACC,letterSpacing:"-.5px"}}>{s.v}</div>
            <div style={{fontSize:10,color:LB3,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {editing?(
        <div style={{padding:"0 16px"}}>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>Edit Your Info</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:10}}>
            {FR("Nickname","nickname","Your nickname")}
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
              <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Short description…" rows={3} style={{...inp,resize:"none",lineHeight:1.45}}/>
            </div>
            {FR("Hobby","hobby","e.g. Gaming, Reading")}
            {FR("Favorite Food","favorite_food","e.g. Nasi Lemak")}
            {FR("WhatsApp","whatsapp","601X-XXXXXXX","tel",true)}
          </div>
          <button onClick={()=>setEditing(false)} style={{width:"100%",padding:"14px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:13,fontSize:16,color:"#ff3b30",cursor:"pointer",fontFamily:SF}}>Cancel</button>
        </div>
      ):(
        <div style={{padding:"0 16px"}}>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>About</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {[
              ["🎂 Birthday",      profile.birthday     ?new Date(profile.birthday).toLocaleDateString("en-MY",{day:"numeric",month:"long",year:"numeric"}):"Not set"],
              ["🎮 Hobby",         profile.hobby        ||"Not set"],
              ["🍜 Favorite Food", profile.favorite_food||"Not set"],
              ["📱 WhatsApp",      profile.whatsapp     ||"Not set"],
              ["📅 Joined",        profile.joined_date  ?new Date(profile.joined_date).toLocaleDateString("en-MY",{day:"numeric",month:"long",year:"numeric"}):"Not set"],
            ].map(([label,value],i,a)=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:15,color:LB3}}>{label}</div>
                <div style={{fontSize:15,color:LBL,textAlign:"right",maxWidth:"55%"}}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
