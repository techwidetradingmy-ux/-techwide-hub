import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import CircleCrop from"./CircleCrop";
import{PRIZES,getTier,calcScore,formatContact,formatIC,getICDigits,BANK_TYPES,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}from"./constants";
import{getSavedAccounts,getActiveAccountId}from"./lib/accountManager";

const CAT_C={Sales:"#5856d6",Teamwork:"#007aff",Admin:"#af52de",Creativity:"#ff2d55",KOL:"#ff6b35",Content:"#30b0c7","Live Hosting":"#e91e8c",Others:"#8e8e93"};
const fmtDate=iso=>{if(!iso)return null;const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
const calcAge=birthday=>{if(!birthday)return null;const birth=new Date(birthday),today=new Date();let age=today.getFullYear()-birth.getFullYear();const m=today.getMonth()-birth.getMonth();if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;return age;};
const calcDaysWorking=joinedDate=>{if(!joinedDate)return null;return Math.floor((Date.now()-new Date(joinedDate))/86400000);};
const daysLeft=dueDate=>{if(!dueDate)return null;return Math.ceil((new Date(dueDate)-new Date())/(1000*60*60*24));};

function addRipple(e){
  const el=e.currentTarget;if(!el)return;
  const rect=el.getBoundingClientRect();
  const dot=document.createElement("div");
  dot.className="ripple-dot";
  dot.style.left=(e.clientX-rect.left)+"px";
  dot.style.top=(e.clientY-rect.top)+"px";
  el.appendChild(dot);
  setTimeout(()=>dot.remove(),500);
}

// ── EMOJI PICKER ──────────────────────────────────────────────────────
const EMOJIS=["😀","😂","🤣","😍","🥰","😘","😎","🤩","😅","😭","😤","🥺","😡","🤔","😴","🙏","👍","👎","👋","💪","🤝","👏","❤️","🔥","✨","🎉","💯","⭐","🎯","🏆","💰","🎁","📱","💬","✅","🎊","😁","🤑","🌟","💥","🚀","🍜","☕","🧋","🍟","😆","😜","🥳","🫡","🎶"];
function EmojiPicker({onSelect}){
  return(
    <div style={{background:BG2,borderTop:`1px solid ${SEP}`,padding:"10px 12px 12px",flexShrink:0,maxHeight:180,overflowY:"auto"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {EMOJIS.map(e=>(
          <button key={e} onClick={()=>onSelect(e)}
            style={{background:"none",border:"none",fontSize:28,cursor:"pointer",padding:"4px 6px",borderRadius:10,lineHeight:1}}
            onPointerDown={ev=>ev.currentTarget.style.transform="scale(.8)"}
            onPointerUp={ev=>ev.currentTarget.style.transform="scale(1)"}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BRANDED DM CHAT — 100dvh, keyboard-aware ─────────────────────────
function DMChat({profile,dmWith,allProfiles,onBack,setViewingProfile}){
  const [messages,setMessages]=useState([]);
  const [loading,setLoading]=useState(true);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const [showAttach,setShowAttach]=useState(false);
  const [showEmoji,setShowEmoji]=useState(false);
  const [recording,setRecording]=useState(false);
  const [mediaRecorder,setMediaRecorder]=useState(null);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const touchStartX=useRef(0);

  useEffect(()=>{
    let alive=true;
    const init=async()=>{await loadMsgs();markSeen();if(alive)setLoading(false);};
    init();
    // Realtime subscription for instant delivery
    const ch=supabase.channel(`dm_${[profile.id,dmWith.id].sort().join("_")}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
        const m=payload.new;
        if(!((m.user_id===profile.id&&m.recipient_id===dmWith.id)||(m.user_id===dmWith.id&&m.recipient_id===profile.id)))return;
        setMessages(p=>p.find(x=>x.id===m.id)?p:[...p,m]);
        markSeen();
      })
      .subscribe();
    // Fallback poll every 30s
    const iv=setInterval(()=>{loadMsgs();markSeen();},30000);
    return()=>{alive=false;clearInterval(iv);supabase.removeChannel(ch);};
  },[]);

  useEffect(()=>{
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),80);
  },[messages]);

  const loadMsgs=async()=>{
    const{data}=await supabase.from("messages").select("*").eq("is_dm",true)
      .or(`and(user_id.eq.${profile.id},recipient_id.eq.${dmWith.id}),and(user_id.eq.${dmWith.id},recipient_id.eq.${profile.id})`)
      .order("created_at",{ascending:true}).limit(100);
    if(data)setMessages(data);
  };

  const markSeen=async()=>{
    await supabase.from("messages")
      .update({seen_at:new Date().toISOString()})
      .eq("user_id",dmWith.id)
      .eq("recipient_id",profile.id)
      .is("seen_at",null);
  };

  const send=async(content=text.trim(),type="text",mediaUrl=null,fileName=null)=>{
    if(type==="text"&&!content)return;
    setSending(true);
    const msg={
      user_id:profile.id,recipient_id:dmWith.id,
      sender_name:profile.nickname||profile.name,
      sender_avatar:profile.avatar||"",
      sender_avatar_url:profile.avatar_url||"",
      content:content||"",message_type:type,
      media_url:mediaUrl,file_name:fileName,
      is_dm:true,delivered_at:new Date().toISOString(),
    };
    setMessages(p=>[...p,{...msg,id:"temp_"+Date.now(),created_at:new Date().toISOString()}]);
    setText("");setShowEmoji(false);
    await supabase.from("messages").insert(msg);
    try{
      await supabase.from("notifications").insert({
        user_id:dmWith.id,
        title:`💬 ${profile.nickname||profile.name}`,
        body:type==="text"?content:`Sent a ${type}`,
        type:"dm",
      });
    }catch(e){console.warn(e);}
    await loadMsgs();
    setSending(false);
  };

  const handleFile=async(e,type="image")=>{
    const file=e.target.files[0];if(!file)return;
    setShowAttach(false);
    const reader=new FileReader();
    reader.onload=async ev=>{
      await send(type==="image"?"📷 Photo":type==="video"?"🎥 Video":"📄 "+file.name,type,ev.target.result,file.name);
    };
    reader.readAsDataURL(file);
  };

  const startRecording=async()=>{
    if(!navigator.mediaDevices?.getUserMedia){alert("Voice recording not supported on this browser");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const mr=new MediaRecorder(stream,{mimeType});const chunks=[];
      mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
      mr.onstop=async()=>{
        const blob=new Blob(chunks,{type:mr.mimeType||mimeType});
        const ext=mr.mimeType?.includes("mp4")?"voice.m4a":"voice.webm";
        const reader=new FileReader();
        reader.onload=async ev=>{await send("🎤 Voice message","audio",ev.target.result,ext);};
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start();setMediaRecorder(mr);setRecording(true);
    }catch(e){console.error("Recording error:",e);alert("Could not access microphone. Please allow microphone permission and try again.");}
  };
  const stopRecording=()=>{if(mediaRecorder)mediaRecorder.stop();setRecording(false);setMediaRecorder(null);};

  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});

  const Ticks=({msg})=>{
    if(msg.user_id!==profile.id)return null;
    if(msg.seen_at)return<span style={{color:ORG,fontSize:12,marginLeft:4,fontWeight:700}}>✓✓</span>;
    if(msg.delivered_at)return<span style={{color:"rgba(255,255,255,.5)",fontSize:12,marginLeft:4}}>✓</span>;
    return<span style={{color:"rgba(255,255,255,.3)",fontSize:12,marginLeft:4}}>⏳</span>;
  };

  const MsgContent=({msg,me})=>{
    const c=me?"#fff":LBL;
    if(msg.message_type==="image"&&msg.media_url)return<div style={{borderRadius:12,overflow:"hidden",maxWidth:240}}><img src={msg.media_url} alt="photo" style={{width:"100%",display:"block"}}/></div>;
    if(msg.message_type==="video"&&msg.media_url)return<div style={{borderRadius:12,overflow:"hidden",maxWidth:240}}><video src={msg.media_url} controls style={{width:"100%",display:"block"}}/></div>;
    if(msg.message_type==="audio"&&msg.media_url)return<div style={{display:"flex",alignItems:"center",gap:10,minWidth:180}}><span style={{fontSize:22}}>🎤</span><audio src={msg.media_url} controls style={{height:34,flex:1,minWidth:0}}/></div>;
    if(msg.message_type==="document"&&msg.media_url)return<a href={msg.media_url} download={msg.file_name} style={{display:"flex",alignItems:"center",gap:10,color:c,textDecoration:"none"}}><span style={{fontSize:26}}>📄</span><div style={{fontSize:14,flex:1,wordBreak:"break-word"}}>{msg.file_name||"Document"}</div></a>;
    return<div style={{fontSize:16,color:c,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{msg.content}</div>;
  };

  return(
    <div
      style={{
        position:"fixed",
        top:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,
        height:"100dvh",
        background:BG,zIndex:150,
        display:"flex",flexDirection:"column",
        fontFamily:SF,overflow:"hidden",
      }}
      onTouchStart={e=>touchStartX.current=e.touches[0].clientX}
      onTouchEnd={e=>{if(e.changedTouches[0].clientX-touchStartX.current>80)onBack();}}>

      {/* Header */}
      <div style={{background:ACC,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,paddingTop:"max(12px,env(safe-area-inset-top))"}}>
        <button onClick={onBack} className="btn"
          style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:"4px 8px 4px 0",fontFamily:SF}}>
          ←
        </button>
        <div onClick={()=>setViewingProfile&&setViewingProfile(dmWith)}
          style={{width:44,height:44,borderRadius:"50%",background:dmWith.avatar_url?`url(${dmWith.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:ACC,overflow:"hidden",flexShrink:0,cursor:"pointer"}}>
          {!dmWith.avatar_url&&(dmWith.avatar||"?")}
        </div>
        <div style={{flex:1,cursor:"pointer"}} onClick={()=>setViewingProfile&&setViewingProfile(dmWith)}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.2}}>{dmWith.nickname||dmWith.name}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.65)"}}>{dmWith.role}</div>
        </div>
      </div>

      {/* Messages — flex:1 + minHeight:0 critical */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:6,background:`${ACC}06`,minHeight:0}}>
        {loading?(
          <div style={{display:"flex",flexDirection:"column",gap:12,padding:"10px 0"}}>
            {[1,2,3].map(i=>(
              <div key={i} style={{display:"flex",justifyContent:i%2===0?"flex-end":"flex-start",gap:8}}>
                {i%2!==0&&<div style={{width:32,height:32,borderRadius:"50%",background:`${ACC}20`,flexShrink:0,alignSelf:"flex-end"}}/>}
                <div style={{width:i===2?180:120,height:44,borderRadius:14,background:`${ACC}12`,animation:"pulse 1.4s ease-in-out infinite"}}/>
              </div>
            ))}
          </div>
        ):messages.length===0?(
          <div style={{textAlign:"center",padding:"50px 20px",color:LB3}}>
            <div style={{fontSize:44,marginBottom:14}}>💬</div>
            <div style={{fontSize:16,background:BG2,borderRadius:14,padding:"14px 22px",display:"inline-block",color:LB2}}>
              Say hi to {dmWith.nickname||dmWith.name?.split(" ")[0]}!
            </div>
          </div>
        ):null}
        {messages.map(msg=>{
          const me=msg.user_id===profile.id;
          if(msg.is_system)return(
            <div key={msg.id} style={{textAlign:"center",margin:"10px 0"}}>
              <span style={{background:`${ACC}14`,borderRadius:12,padding:"5px 14px",fontSize:13,color:ACC}}>{msg.content}</span>
            </div>
          );
          return(
            <div key={msg.id} style={{display:"flex",justifyContent:me?"flex-end":"flex-start",marginBottom:4}}>
              {!me&&(
                <div
                  style={{width:32,height:32,borderRadius:"50%",background:msg.sender_avatar_url?`url(${msg.sender_avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden",marginRight:8,alignSelf:"flex-end",cursor:"pointer",border:`2px solid ${BG}`}}
                  onClick={()=>{const s=allProfiles?.find(p=>p.id===msg.user_id);if(s&&setViewingProfile)setViewingProfile(s);}}>
                  {!msg.sender_avatar_url&&(msg.sender_avatar||"?")}
                </div>
              )}
              <div style={{maxWidth:"78%"}}>
                {!me&&<div style={{fontSize:12,color:ACC,fontWeight:700,marginBottom:3,paddingLeft:2}}>{msg.sender_name}</div>}
                <div style={{
                  background:me?`linear-gradient(135deg,${ACC},#0e2140)`:BG2,
                  borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  padding:"10px 14px",
                  boxShadow:me?`0 2px 8px ${ACC}30`:"0 1px 4px rgba(0,0,0,.08)",
                }}>
                  <MsgContent msg={msg} me={me}/>
                  <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:4,marginTop:4}}>
                    <span style={{fontSize:11,color:me?"rgba(255,255,255,.5)":"#aaa"}}>{fmt(msg.created_at)}</span>
                    <Ticks msg={msg}/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Emoji picker */}
      {showEmoji&&<EmojiPicker onSelect={e=>{setText(p=>p+e);inputRef.current?.focus();}}/>}

      {/* Attach menu */}
      {showAttach&&(
        <div style={{background:BG2,padding:"16px",display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",borderTop:`1px solid ${SEP}`,flexShrink:0}}>
          {[
            {icon:"📷",label:"Camera",accept:"image/*",capture:"environment",type:"image"},
            {icon:"🎥",label:"Video",accept:"video/*",capture:"camcorder",type:"video"},
            {icon:"🖼️",label:"Photo",accept:"image/*",type:"image"},
            {icon:"📄",label:"Document",accept:"*/*",type:"document"},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer"}}
              onClick={()=>document.getElementById(`attach_dm_${item.label}`).click()}>
              <div style={{width:54,height:54,borderRadius:"50%",background:`${ACC}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{item.icon}</div>
              <span style={{fontSize:13,color:LB2,fontWeight:500}}>{item.label}</span>
              <input id={`attach_dm_${item.label}`} type="file" accept={item.accept} capture={item.capture||undefined} onChange={e=>handleFile(e,item.type)} style={{display:"none"}}/>
            </div>
          ))}
          <button onClick={()=>setShowAttach(false)}
            style={{width:"100%",padding:"12px",background:"rgba(0,0,0,.05)",border:"none",color:"#ff3b30",fontSize:16,cursor:"pointer",fontFamily:SF,borderRadius:12,fontWeight:600}}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Input bar — always above keyboard ── */}
      <div style={{
        background:BG2,
        padding:"10px 12px",
        display:"flex",alignItems:"center",gap:8,
        flexShrink:0,
        borderTop:`1px solid ${SEP}`,
        paddingBottom:"max(10px,env(safe-area-inset-bottom))",
      }}>
        <button onClick={()=>{setShowAttach(p=>!p);setShowEmoji(false);}}
          style={{width:42,height:42,borderRadius:"50%",background:`${ACC}12`,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",flexShrink:0}}>
          ➕
        </button>
        <button onClick={()=>{setShowEmoji(p=>!p);setShowAttach(false);}}
          style={{width:42,height:42,borderRadius:"50%",background:showEmoji?`${ACC}20`:"transparent",border:`1px solid ${showEmoji?ACC:SEP}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
          😊
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Type a message…"
          style={{flex:1,background:`${ACC}08`,border:`1px solid ${ACC}20`,outline:"none",borderRadius:24,padding:"11px 16px",fontSize:16,color:LBL,fontFamily:SF,minWidth:0}}
        />
        {text.trim()?(
          <button onClick={()=>send()} disabled={sending}
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:46,height:46,borderRadius:"50%",background:ACC,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",flexShrink:0,color:"#fff",boxShadow:`0 3px 12px ${ACC}50`}}>
            {sending?"…":"▶"}
          </button>
        ):(
          <button
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={startRecording} onTouchEnd={stopRecording}
            style={{width:46,height:46,borderRadius:"50%",background:recording?"#ff3b30":ACC,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",flexShrink:0,color:"#fff",transition:"background .2s",boxShadow:`0 3px 12px ${ACC}50`}}>
            🎤
          </button>
        )}
      </div>
    </div>
  );
}

// ── MISSION DETAIL PAGE ───────────────────────────────────────────────
function MissionDetailPage({mission,claim,profile,onBack,onAccept,onDecline,onRefresh,showToast,Chip}){
  const [subText,setSubText]=useState("");
  const [subImg,setSubImg]=useState(null);
  const [subLoading,setSubLoading]=useState(false);
  const [showSubForm,setShowSubForm]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [localClaim,setLocalClaim]=useState(claim);

  useEffect(()=>{setLocalClaim(claim);},[claim]);

  const done=localClaim?.completed===true;
  const isSubmitted=submitted||(localClaim?.submitted&&!done);
  const isDeclined=localClaim?.status==="declined";
  const accepted=!!localClaim&&!isDeclined&&!done;
  const dl=daysLeft(mission.due_date);
  const overdue=dl!==null&&dl<0;

  const handleImg=e=>{
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();r.onload=ev=>setSubImg(ev.target.result);r.readAsDataURL(file);
  };

  const submitProof=async()=>{
    if(!subText.trim()&&!subImg){showToast("Please add text or photo proof");return;}
    if(!localClaim?.id){showToast("Mission not accepted yet");return;}
    setSubLoading(true);
    try{
      const{data:existing}=await supabase.from("mission_submissions").select("id").eq("claim_id",localClaim.id).maybeSingle();
      if(existing){showToast("Already submitted — awaiting review");setSubLoading(false);return;}
      const{error}=await supabase.from("mission_submissions").insert({
        user_id:profile.id,mission_id:mission.id,claim_id:localClaim.id,
        submission_text:subText,submission_image:subImg,
        status:"Pending",submitted_at:new Date().toISOString(),
      });
      if(error)throw error;
      await supabase.from("mission_claims").update({submitted:true}).eq("id",localClaim.id);
      const{data:updated}=await supabase.from("mission_claims").select("*").eq("id",localClaim.id).single();
      if(updated)setLocalClaim(updated);
      setSubmitted(true);
      if(onRefresh)onRefresh();
      setShowSubForm(false);setSubText("");setSubImg(null);
    }catch(err){console.error(err);showToast("Submission failed — please try again");}
    setSubLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF}}>
      {/* Floating back button — no full header */}
      <div style={{position:"sticky",top:0,zIndex:20,padding:"14px 16px 0",display:"flex",alignItems:"center"}}>
        <button onClick={onBack} className="btn"
          style={{background:"rgba(255,255,255,.92)",backdropFilter:"blur(10px)",border:"none",cursor:"pointer",fontSize:16,color:ACC,fontWeight:700,padding:"8px 16px",borderRadius:99,fontFamily:SF,boxShadow:"0 2px 12px rgba(0,0,0,.12)",display:"flex",alignItems:"center",gap:6}}>
          ← Back
        </button>
      </div>

      <div style={{padding:"12px 16px 50px"}}>
        {/* Hero */}
        <div style={{background:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:18,padding:22,marginBottom:18,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:110,height:110,borderRadius:"50%",background:`${ORG}20`,pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,marginRight:14}}>
              <div style={{fontSize:23,fontWeight:700,color:"#fff",lineHeight:1.25}}>{mission.title}</div>
            </div>
            <div style={{background:`${ORG}30`,borderRadius:14,padding:"12px 16px",textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:26,fontWeight:700,color:ORG,lineHeight:1}}>+{mission.xp}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:4}}>pts</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
            <Chip color={CAT_C[mission.category]||"#8e8e93"}>{mission.category}</Chip>
            {done&&<Chip color="#34c759">✅ Completed</Chip>}
            {isSubmitted&&!done&&<Chip color="#ff9500">⏳ Awaiting Review</Chip>}
            {accepted&&!isSubmitted&&!done&&<Chip color={ORG}>⚡ Ongoing</Chip>}
            {isDeclined&&<Chip color="#8e8e93">🚫 Skipped</Chip>}
            {dl!==null&&(
              <Chip color={overdue?"#ff3b30":dl<=3?"#ff9500":"#34c759"}>
                {overdue?"⚠️ Overdue":dl===0?"Due today":dl===1?"Due tomorrow":`${dl}d left`}
              </Chip>
            )}
          </div>
        </div>

        {/* Description */}
        {mission.description&&(
          <div style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:14}}>
            <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>What to do</div>
            <div style={{fontSize:16,color:LB2,lineHeight:1.7,whiteSpace:"pre-line"}}>{mission.description}</div>
          </div>
        )}

        {/* Details */}
        <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:18}}>
          {[
            ["📅 Due Date",mission.due_date?fmtDate(mission.due_date):null],
            ["🏷️ Category",mission.category],
            ["⭐ Reward",`${mission.xp} pts`],
            ["🔁 Type",mission.completion_type==="once_total"?"Once Total (1 Winner)":mission.completion_type==="unlimited"?"Unlimited":"Once Per User"],
          ].filter(([,v])=>v).map(([label,value],i,a)=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
              <div style={{fontSize:16,color:LB3}}>{label}</div>
              <div style={{fontSize:16,color:LBL,fontWeight:600}}>{value}</div>
            </div>
          ))}
        </div>

        {/* Action area */}
        {done?(
          <div style={{background:"#34c75910",borderRadius:20,padding:"32px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <div style={{width:76,height:76,borderRadius:"50%",background:"#34c75920",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38}}>🎉</div>
            <div style={{fontSize:21,color:"#34c759",fontWeight:700}}>Mission Completed!</div>
            <div style={{fontSize:15,color:LB3,lineHeight:1.6}}>Reward has been added to your account.</div>
          </div>
        ):isSubmitted?(
          <div style={{background:`linear-gradient(135deg,${ACC}10,${ORG}08)`,border:`2px solid ${ACC}20`,borderRadius:20,padding:"32px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{width:76,height:76,borderRadius:"50%",background:`${ACC}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:38}}>⏳</div>
            <div style={{fontSize:21,color:ACC,fontWeight:700}}>Proof Submitted!</div>
            <div style={{fontSize:15,color:LB2,lineHeight:1.65,maxWidth:280,textAlign:"center"}}>Your proof is under admin review. You'll be notified once approved.</div>
            <div style={{background:BG2,borderRadius:12,padding:"10px 20px",fontSize:14,color:LB3,fontWeight:500}}>⏱️ Usually reviewed within 24 hours</div>
          </div>
        ):showSubForm?(
          <div style={{background:BG2,borderRadius:16,padding:"18px"}}>
            <div style={{fontSize:18,color:LBL,fontWeight:700,marginBottom:14}}>📤 Submit Proof</div>
            <textarea value={subText} onChange={e=>setSubText(e.target.value)}
              placeholder="Describe what you did…" rows={4}
              style={{width:"100%",background:"#f2f2f7",border:"none",outline:"none",borderRadius:12,padding:"14px",fontSize:16,color:LBL,resize:"none",fontFamily:SF,marginBottom:12}}/>
            <div onClick={()=>document.getElementById("proof_img").click()}
              style={{border:`2px dashed ${subImg?"transparent":SEP}`,borderRadius:12,overflow:"hidden",background:subImg?`url(${subImg}) center/cover`:"transparent",minHeight:subImg?180:64,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginBottom:12}}>
              {!subImg&&<div style={{fontSize:15,color:LB3}}>📷 Attach photo proof (optional)</div>}
            </div>
            <input id="proof_img" type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowSubForm(false);setSubText("");setSubImg(null);}} className="btn"
                style={{flex:1,padding:"15px",background:"rgba(0,0,0,.05)",borderRadius:14,fontSize:16,color:LB2,border:"none",cursor:"pointer",fontFamily:SF}}>
                Cancel
              </button>
              <button onClick={submitProof} disabled={subLoading||(!subText.trim()&&!subImg)}
                className="btn-primary ripple-container" onPointerDown={addRipple}
                style={{flex:2,padding:"15px",background:(subLoading||(!subText.trim()&&!subImg))?"#e5e5ea":ACC,borderRadius:14,fontSize:16,color:(subLoading||(!subText.trim()&&!subImg))?LB3:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {subLoading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {subLoading?"Submitting…":"Submit Proof"}
              </button>
            </div>
          </div>
        ):accepted?(
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>onDecline(mission.id)} className="btn"
              style={{flex:1,padding:"16px",background:"rgba(255,59,48,.08)",color:"#ff3b30",borderRadius:14,fontSize:16,border:"none",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
              Withdraw
            </button>
            <button onClick={()=>setShowSubForm(true)} disabled={overdue}
              className="btn-primary ripple-container" onPointerDown={addRipple}
              style={{flex:2,padding:"16px",background:overdue?"#e5e5ea":ACC,borderRadius:14,fontSize:16,color:overdue?LB3:"#fff",fontWeight:700,border:"none",cursor:overdue?"default":"pointer",fontFamily:SF}}>
              {overdue?"Past Due Date":"Submit Proof 📤"}
            </button>
          </div>
        ):isDeclined?(
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,padding:"16px",background:"rgba(0,0,0,.04)",borderRadius:14,fontSize:15,color:LB3,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
              🚫 Skipped
            </div>
            <button onClick={()=>onAccept(mission.id)} disabled={overdue}
              className="btn-primary ripple-container" onPointerDown={addRipple}
              style={{flex:2,padding:"16px",background:overdue?"#e5e5ea":ACC,borderRadius:14,fontSize:16,color:overdue?LB3:"#fff",fontWeight:700,border:"none",cursor:overdue?"default":"pointer",fontFamily:SF}}>
              {overdue?"Past Due Date":"Accept Instead 🎯"}
            </button>
          </div>
        ):(
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>onDecline(mission.id)} className="btn"
              style={{flex:1,padding:"16px",background:"rgba(255,59,48,.08)",color:"#ff3b30",borderRadius:14,fontSize:16,border:"none",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
              Not Interested
            </button>
            <button onClick={()=>onAccept(mission.id)} disabled={overdue}
              className="btn-primary ripple-container" onPointerDown={addRipple}
              style={{flex:2,padding:"16px",background:overdue?"#e5e5ea":ACC,borderRadius:14,fontSize:17,color:overdue?LB3:"#fff",fontWeight:700,border:"none",cursor:overdue?"default":"pointer",fontFamily:SF}}>
              {overdue?"Past Due Date":"Accept Mission 🎯"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MISSIONS TAB — 4 columns ──────────────────────────────────────────
export function MissionsTab({profile,missions,myClaims,setMyClaims,showToast,showMissionAccepted,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [column,setColumn]=useState("new");
  const [selected,setSelected]=useState(null);

  const claimOf=id=>myClaims.find(c=>c.mission_id===id);
  const newMissions    =missions.filter(m=>{const c=claimOf(m.id);return!c;});
  const ongoingMissions=missions.filter(m=>{const c=claimOf(m.id);return c&&!c.completed&&c.status!=="declined"&&c.status!=="completed";});
  const completedMissions=missions.filter(m=>{const c=claimOf(m.id);return c&&(c.completed===true||c.status==="completed");});
  const skippedMissions=missions.filter(m=>{const c=claimOf(m.id);return c&&c.status==="declined";});

  const COLUMNS=[
    {id:"new",       label:"New",     emoji:"🆕",list:newMissions,       count:newMissions.length},
    {id:"ongoing",   label:"Ongoing", emoji:"⚡",list:ongoingMissions,   count:ongoingMissions.length},
    {id:"completed", label:"Done",    emoji:"✅",list:completedMissions, count:completedMissions.length},
    {id:"skipped",   label:"Skipped", emoji:"🚫",list:skippedMissions,   count:skippedMissions.length},
  ];

  const accept=async missionId=>{
    const existing=claimOf(missionId);
    if(existing){
      await supabase.from("mission_claims").update({status:"accepted",submitted:false,completed:false}).eq("id",existing.id);
    } else {
      await supabase.from("mission_claims").insert({user_id:profile.id,mission_id:missionId,status:"accepted",submitted:false});
    }
    const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
    if(data)setMyClaims(data);
    if(showMissionAccepted)showMissionAccepted();else showToast("Mission accepted! 💪");
    setSelected(null);
  };

  const decline=async missionId=>{
    const existing=claimOf(missionId);
    if(existing){
      await supabase.from("mission_claims").update({status:"declined"}).eq("id",existing.id);
    } else {
      await supabase.from("mission_claims").insert({user_id:profile.id,mission_id:missionId,status:"declined",submitted:false});
    }
    const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
    if(data)setMyClaims(data);
    setSelected(null);
  };

  const refresh=async()=>{
    const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
    if(data)setMyClaims(data);
  };

  if(selected){
    const claim=claimOf(selected.id);
    return(
      <div className="page-enter-forward" style={{position:"fixed",inset:0,zIndex:50,maxWidth:430,margin:"0 auto",background:BG,overflowY:"auto"}}>
        <MissionDetailPage
          mission={selected} claim={claim} profile={profile}
          onBack={()=>setSelected(null)}
          onAccept={accept} onDecline={decline} onRefresh={refresh}
          showToast={showToast} Chip={Chip}
        />
      </div>
    );
  }

  const currentCol=COLUMNS.find(c=>c.id===column);
  const list=currentCol?.list||[];
  const colColors={new:ACC,ongoing:ORG,completed:"#34c759",skipped:"#8e8e93"};
  const colColor=colColors[column]||ACC;

  return(
    <div style={{padding:"0 16px 16px"}}>
      {/* Column tabs */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:14,scrollbarWidth:"none"}}>
        {COLUMNS.map(col=>(
          <button key={col.id} onClick={()=>setColumn(col.id)} className="btn"
            style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:99,fontSize:14,fontWeight:column===col.id?700:400,background:column===col.id?colColors[col.id]:"rgba(0,0,0,.06)",color:column===col.id?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF,transition:"all .15s"}}>
            <span style={{fontSize:16}}>{col.emoji}</span>
            {col.label}
            {col.count>0&&(
              <span style={{background:column===col.id?"rgba(255,255,255,.3)":"rgba(0,0,0,.12)",color:column===col.id?"#fff":LBL,fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:99}}>
                {col.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Column info banner */}
      <div style={{background:colColor+"10",borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>{currentCol?.emoji}</span>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:colColor}}>{currentCol?.label} Missions</div>
          <div style={{fontSize:13,color:LB3,marginTop:2}}>
            {column==="new"&&"New missions available to accept"}
            {column==="ongoing"&&"Accepted — submit proof when done"}
            {column==="completed"&&"Successfully completed missions 🎉"}
            {column==="skipped"&&"Skipped — you can still accept them"}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {list.length===0&&(
        <div style={{textAlign:"center",padding:"50px 0",color:LB3}}>
          <div style={{fontSize:52,marginBottom:16}}>{currentCol?.emoji}</div>
          <div style={{fontSize:18,color:LBL,fontWeight:600,marginBottom:8}}>
            {column==="new"&&"No new missions right now"}
            {column==="ongoing"&&"No ongoing missions"}
            {column==="completed"&&"No completed missions yet"}
            {column==="skipped"&&"No skipped missions"}
          </div>
          <div style={{fontSize:14,color:LB3}}>
            {column==="new"&&"Check back later for new campaigns!"}
            {column==="ongoing"&&"Accept a new mission to get started"}
            {column==="completed"&&"Complete missions to earn points"}
            {column==="skipped"&&"You haven't skipped any missions"}
          </div>
        </div>
      )}

      {list.map(m=>{
        const claim=claimOf(m.id);
        const done=claim?.completed===true;
        const submitted=claim?.submitted&&!done;
        const dl=daysLeft(m.due_date);
        const overdue=dl!==null&&dl<0;
        const catColor=CAT_C[m.category]||"#8e8e93";
        return(
          <div key={m.id} onClick={()=>setSelected(m)} className="card-press"
            style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:5,height:52,borderRadius:3,background:done?"#34c759":column==="skipped"?"#e5e5ea":catColor,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{fontSize:17,color:done?LB3:LBL,fontWeight:600,lineHeight:1.3,textDecoration:done?"line-through":"none",flex:1}}>
                  {m.title}
                </div>
                <div style={{background:done?"#34c75914":`${ACC}14`,borderRadius:10,padding:"6px 10px",textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:done?"#34c759":ACC,lineHeight:1}}>+{m.xp}</div>
                  <div style={{fontSize:10,color:LB3,marginTop:2}}>pts</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:12,color:catColor,fontWeight:700,background:catColor+"18",padding:"3px 9px",borderRadius:99}}>{m.category}</span>
                {done&&<span style={{fontSize:12,color:"#34c759",fontWeight:700,background:"#34c75918",padding:"3px 9px",borderRadius:99}}>✅ Done</span>}
                {submitted&&<span style={{fontSize:12,color:"#ff9500",fontWeight:700,background:"#ff950018",padding:"3px 9px",borderRadius:99}}>⏳ Review</span>}
                {claim&&!done&&!submitted&&claim.status==="accepted"&&<span style={{fontSize:12,color:ORG,fontWeight:700,background:ORG+"18",padding:"3px 9px",borderRadius:99}}>⚡ Ongoing</span>}
                {dl!==null&&<span style={{fontSize:12,color:overdue?"#ff3b30":dl<=2?"#ff9500":LB3,fontWeight:overdue||dl<=2?700:400}}>{overdue?"Overdue":dl===0?"Due today":dl===1?"1d left":`${dl}d`}</span>}
              </div>
            </div>
            <div style={{color:LB3,fontSize:22,flexShrink:0}}>›</div>
          </div>
        );
      })}
    </div>
  );
}

// ── LEADERBOARD TAB ───────────────────────────────────────────────────
export function LeaderboardTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,getLevel,getLvlPct,getTier,calcScore,setViewingProfile}){
  const ranked=allProfiles.filter(s=>!s.is_admin);
  return(
    <div style={{padding:"0 16px 16px"}}>
      <div style={{background:BG2,borderRadius:16,overflow:"hidden"}}>
        {ranked.length===0&&<div style={{padding:"24px 16px",fontSize:17,color:LB3,textAlign:"center"}}>No staff yet</div>}
        {ranked.map((s,i)=>{
          const me=s.id===profile.id;
          const medal=["🥇","🥈","🥉"][i]||null;
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} onClick={()=>setViewingProfile&&setViewingProfile(s)} className="card-press"
              style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:me?`${ACC}08`:BG2,borderBottom:i<ranked.length-1?`1px solid ${SEP}`:"none",cursor:"pointer"}}>
              <div style={{width:30,textAlign:"center",fontWeight:700,fontSize:medal?24:15,color:i<3?ORG:"#8e8e93",flexShrink:0}}>{medal||`${i+1}`}</div>
              <div style={{width:48,height:48,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                {!s.avatar_url&&(s.avatar||"?")}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{fontSize:17,color:me?ACC:LBL,fontWeight:me?700:500}}>{s.nickname||s.name?.split(" ")[0]}{me?" (you)":""}</div>
                  <span style={{fontSize:15}}>{sTier.emoji}</span>
                </div>
                <div style={{fontSize:13,color:LB3,marginTop:2}}>{s.role} · Lv.{getLevel(s.xp)} · {s.streak||0}🔥</div>
                <div style={{marginTop:5,background:"#e5e5ea",borderRadius:99,height:4}}>
                  <div style={{width:`${getLvlPct(s.xp)}%`,height:"100%",background:`linear-gradient(90deg,${ACC},${ORG})`,borderRadius:99}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:17,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                <div style={{fontSize:12,color:LB3,marginTop:2}}>pts ›</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PRIZES TAB ────────────────────────────────────────────────────────
export function PrizesTab({profile,prizes,myRedemptions,doRedeem,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [view,setView]=useState("shop");
  const [filter,setFilter]=useState("All");
  const display=prizes.length>0?prizes:PRIZES.map(x=>({...x,cost:x.pts,category:x.cat}));
  const cats=["All",...new Set(display.map(p=>p.cat||p.category).filter(Boolean))];
  const filtered=filter==="All"?display:display.filter(p=>(p.cat||p.category)===filter);

  const Sb=({status})=>{
    const delivered=status==="Approved"||status==="Delivered";
    const c=status==="Pending"?"#ff9500":delivered?"#34c759":"#ff3b30";
    return<span style={{fontSize:13,color:c,fontWeight:700,background:c+"18",padding:"4px 10px",borderRadius:99}}>
      {delivered?"✓ Delivered":status==="Pending"?"⏳ Pending":"✕ Rejected"}
    </span>;
  };

  return(
    <div style={{padding:"0 16px 16px"}}>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        {[["shop","🎁 Prize Shop"],["history","📋 My Prizes"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} className="btn"
            style={{flex:1,padding:"13px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:14,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      <div className="fade" style={{background:BG2,borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,color:LB2,fontWeight:500}}>Your balance</div>
        <div style={{fontSize:24,fontWeight:700,color:ACC,letterSpacing:"-.8px"}}>{(profile.xp||0).toLocaleString()} <span style={{fontSize:16,fontWeight:500,color:LB3}}>pts</span></div>
      </div>

      {view==="shop"&&(
        <>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:10}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setFilter(c)} className="btn"
                style={{flexShrink:0,padding:"7px 16px",borderRadius:99,fontSize:14,fontWeight:filter===c?700:400,background:filter===c?ACC:"rgba(0,0,0,.06)",color:filter===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>
                {c}
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {filtered.map(p=>{
              const cost=p.pts||p.cost||0;
              const can=cost>0&&profile.xp>=cost;
              const out=(p.stock!=null&&p.stock<1);
              return(
                <div key={p.id||p.name} className="fade card-press"
                  style={{background:BG2,borderRadius:16,padding:"18px 14px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",opacity:out?.5:1}}>
                  <div style={{fontSize:38,marginBottom:8}}>{p.icon||"🎁"}</div>
                  <div style={{fontSize:15,color:LBL,fontWeight:600,marginBottom:5,lineHeight:1.3}}>{p.name}</div>
                  <Chip color="#8e8e93">{p.cat||p.category||"General"}</Chip>
                  <div style={{fontSize:13,color:LB3,marginTop:8,marginBottom:8,lineHeight:1.5}}>{p.desc}</div>
                  <div style={{fontSize:20,fontWeight:700,color:can&&!out?ACC:"#8e8e93",marginBottom:3}}>{cost?.toLocaleString()}</div>
                  <div style={{fontSize:12,color:LB3,marginBottom:12}}>pts · {p.stock!=null?p.stock:"∞"} left</div>
                  <button
                    onClick={()=>{if(!out&&can)doRedeem(p);}}
                    disabled={!can||out}
                    className={(!can||out)?"":"btn-primary ripple-container"}
                    onPointerDown={(!can||out)?undefined:addRipple}
                    style={{width:"100%",padding:"12px",background:(!can||out)?"rgba(0,0,0,.06)":ACC,color:(!can||out)?LB3:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:(!can||out)?"default":"pointer",fontFamily:SF}}>
                    {out?"Sold Out":can?"Redeem 🎁":"Need More pts"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view==="history"&&(
        myRedemptions.length===0?(
          <div style={{textAlign:"center",padding:"50px 0",color:LB3,fontSize:17}}>
            <div style={{fontSize:48,marginBottom:14}}>🎁</div>No prizes redeemed yet.
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {myRedemptions.map(r=>(
              <div key={r.id} className="fade" style={{background:BG2,borderRadius:16,padding:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1,marginRight:12}}>
                    <div style={{fontSize:18,color:LBL,fontWeight:600}}>{r.prize_name}</div>
                    <div style={{fontSize:14,color:LB3,marginTop:3}}>{new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
                  </div>
                  <Sb status={r.status}/>
                </div>
                <div style={{background:(r.status==="Approved"||r.status==="Delivered")?"#34c75910":"#ff950010",borderRadius:10,padding:"10px 14px",fontSize:14,color:(r.status==="Approved"||r.status==="Delivered")?"#34c759":"#ff9500",marginTop:8}}>
                  {(r.status==="Approved"||r.status==="Delivered")?"✓ Delivered! Enjoy your prize.":"⏳ Processing — you'll be notified when delivered."}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── COMMUNITY TAB — WhatsApp-style DM list + Group Chat ───────────────
export function CommunityTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,dmTarget,setDmTarget,setViewingProfile,setDmOpen}){
  const [mode,setMode]=useState("chats");
  const [dmWith,setDmWith]=useState(null);
  const [conversations,setConversations]=useState([]);
  const [messages,setMessages]=useState([]);
  const [groupLoading,setGroupLoading]=useState(true);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const [showPeople,setShowPeople]=useState(false);
  const [showEmoji,setShowEmoji]=useState(false);
  const [grpRecording,setGrpRecording]=useState(false);
  const [grpMediaRecorder,setGrpMediaRecorder]=useState(null);
  const bottomRef=useRef(null);

  useEffect(()=>{if(dmTarget){setDmWith(dmTarget);setMode("dm");}},[dmTarget]);
  useEffect(()=>{if(setDmOpen)setDmOpen(mode==="dm");},[mode]);

  const loadConversations=async()=>{
    const{data}=await supabase.from("messages")
      .select("id,user_id,recipient_id,sender_name,sender_avatar_url,content,message_type,created_at,seen_at")
      .eq("is_dm",true)
      .or(`user_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .order("created_at",{ascending:false})
      .limit(300);
    if(!data)return;
    const seen=new Set();const convs=[];
    data.forEach(msg=>{
      const partnerId=msg.user_id===profile.id?msg.recipient_id:msg.user_id;
      if(!seen.has(partnerId)){
        seen.add(partnerId);
        const partner=allProfiles?.find(p=>p.id===partnerId);
        if(partner)convs.push({partner,lastMsg:msg});
      }
    });
    setConversations(convs);
  };

  const loadGroupMsgs=async()=>{
    const{data}=await supabase.from("messages")
      .select("id,user_id,sender_name,sender_avatar,sender_avatar_url,content,message_type,media_url,file_name,created_at,is_system")
      .eq("is_dm",false).order("created_at",{ascending:true}).limit(100);
    if(data)setMessages(data);
    setGroupLoading(false);
  };

  // Pre-load BOTH conversations and group messages simultaneously on mount.
  // This means group chat data is already in state before the user even taps
  // the tab — switching becomes instant instead of waiting for a network round-trip.
  useEffect(()=>{
    loadConversations();
    loadGroupMsgs();
    // Realtime for new group messages (always on, regardless of active tab)
    const grpCh=supabase.channel("group_chat_rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
        const m=payload.new;
        if(!m.is_dm)setMessages(p=>p.find(x=>x.id===m.id)?p:[...p,m]);
      })
      .subscribe();
    // Fallback refresh every 30s
    const iv=setInterval(()=>{loadConversations();loadGroupMsgs();},30000);
    return()=>{clearInterval(iv);supabase.removeChannel(grpCh);};
  },[]);

  useEffect(()=>{
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),80);
  },[messages]);

  // DM mode — full screen
  if(mode==="dm"&&dmWith){
    return(
      <DMChat
        profile={profile} dmWith={dmWith} allProfiles={allProfiles}
        onBack={()=>{setMode("chats");setDmWith(null);if(setDmTarget)setDmTarget(null);loadConversations();}}
        setViewingProfile={setViewingProfile}
      />
    );
  }

  const send=async()=>{
    if(!text.trim()||sending)return;
    setSending(true);
    await supabase.from("messages").insert({
      user_id:profile.id,
      sender_name:profile.nickname||profile.name,
      sender_avatar:profile.avatar||"",
      sender_avatar_url:profile.avatar_url||"",
      content:text.trim(),is_dm:false,message_type:"text",
    });
    setText("");setShowEmoji(false);await loadGroupMsgs();setSending(false);
  };

  const startGrpRecording=async()=>{
    if(!navigator.mediaDevices?.getUserMedia){alert("Voice recording not supported on this browser");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const mr=new MediaRecorder(stream,{mimeType});const chunks=[];
      mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
      mr.onstop=async()=>{
        const blob=new Blob(chunks,{type:mr.mimeType||mimeType});
        const ext=mr.mimeType?.includes("mp4")?"voice.m4a":"voice.webm";
        const reader=new FileReader();
        reader.onload=async ev=>{
          setSending(true);
          await supabase.from("messages").insert({
            user_id:profile.id,
            sender_name:profile.nickname||profile.name,
            sender_avatar:profile.avatar||"",
            sender_avatar_url:profile.avatar_url||"",
            content:"🎤 Voice message",is_dm:false,message_type:"audio",
            media_url:ev.target.result,file_name:ext,
          });
          await loadGroupMsgs();setSending(false);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start();setGrpMediaRecorder(mr);setGrpRecording(true);
    }catch(e){console.error("Recording error:",e);alert("Could not access microphone. Please allow microphone permission and try again.");}
  };
  const stopGrpRecording=()=>{if(grpMediaRecorder)grpMediaRecorder.stop();setGrpRecording(false);setGrpMediaRecorder(null);};

  const fmtTime=ts=>{
    const d=new Date(ts);const now=new Date();
    if(now.toDateString()===d.toDateString())return d.toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});
    if(now.getTime()-d.getTime()<7*86400000)return d.toLocaleDateString("en-MY",{weekday:"short"});
    return d.toLocaleDateString("en-MY",{day:"numeric",month:"short"});
  };

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",background:BG}}>

      {/* People picker overlay */}
      {showPeople&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:BG,borderRadius:"22px 22px 0 0",padding:"22px 16px 50px",maxHeight:"68vh",overflowY:"auto"}}>
            <div style={{fontSize:20,fontWeight:700,color:LBL,marginBottom:16}}>Start a conversation</div>
            {(allProfiles||[]).filter(p=>p.id!==profile.id&&!p.is_admin).map(u=>(
              <div key={u.id}
                onClick={()=>{setDmWith(u);setMode("dm");setShowPeople(false);if(setDmTarget)setDmTarget(null);}}
                className="card-press"
                style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:`1px solid ${SEP}`,cursor:"pointer"}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:u.avatar_url?`url(${u.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
                  {!u.avatar_url&&(u.avatar||"?")}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,color:LBL,fontWeight:600}}>{u.nickname||u.name}</div>
                  <div style={{fontSize:14,color:LB3}}>{u.role}</div>
                </div>
                <div style={{fontSize:22,color:LB3}}>›</div>
              </div>
            ))}
            <button onClick={()=>setShowPeople(false)} className="btn"
              style={{width:"100%",marginTop:18,padding:"16px",background:"rgba(0,0,0,.06)",border:"none",borderRadius:14,fontSize:17,color:"#ff3b30",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{padding:"10px 16px 0",background:BG,flexShrink:0}}>
        <div style={{display:"flex",gap:6,background:"rgba(0,0,0,.06)",borderRadius:14,padding:4}}>
          {[["chats","💬 Messages"],["group","👥 Group Chat"]].map(([id,label])=>(
            <button key={id} onClick={()=>setMode(id)}
              style={{flex:1,padding:"10px",background:mode===id?BG2:"transparent",border:"none",borderRadius:11,fontSize:14,fontWeight:mode===id?700:400,color:mode===id?ACC:LB3,cursor:"pointer",fontFamily:SF,transition:"all .15s",boxShadow:mode===id?"0 1px 6px rgba(0,0,0,.1)":"none"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHATS TAB — WhatsApp-style DM list ── */}
      {mode==="chats"&&(
        <div style={{flex:1,overflowY:"auto",minHeight:0}}>
          <div style={{padding:"12px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,color:LBL,fontWeight:700}}>Direct Messages</div>
            <button onClick={()=>setShowPeople(true)} className="btn-primary ripple-container" onPointerDown={addRipple}
              style={{background:ACC,color:"#fff",border:"none",borderRadius:99,padding:"8px 16px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",gap:6}}>
              ✏️ New DM
            </button>
          </div>

          {conversations.length===0&&(
            <div style={{textAlign:"center",padding:"60px 24px",color:LB3}}>
              <div style={{fontSize:56,marginBottom:16}}>💬</div>
              <div style={{fontSize:18,color:LBL,fontWeight:600,marginBottom:8}}>No conversations yet</div>
              <div style={{fontSize:14,color:LB3,marginBottom:24}}>Start a direct message with a teammate!</div>
              <button onClick={()=>setShowPeople(true)} className="btn-primary ripple-container" onPointerDown={addRipple}
                style={{background:ACC,color:"#fff",border:"none",borderRadius:14,padding:"14px 28px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                ✏️ Start a Conversation
              </button>
            </div>
          )}

          {conversations.map(({partner,lastMsg})=>{
            const me=lastMsg.user_id===profile.id;
            const preview=lastMsg.message_type!=="text"
              ?(me?`You sent a ${lastMsg.message_type}`:`Sent a ${lastMsg.message_type}`)
              :(me?`You: ${lastMsg.content}`:lastMsg.content);
            return(
              <div key={partner.id}
                onClick={()=>{setDmWith(partner);setMode("dm");}}
                className="card-press"
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:`1px solid ${SEP}`,cursor:"pointer",background:BG}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:partner.avatar_url?`url(${partner.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                  {!partner.avatar_url&&(partner.avatar||"?")}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:17,color:LBL,fontWeight:600}}>{partner.nickname||partner.name}</div>
                    <div style={{fontSize:12,color:LB3,flexShrink:0,marginLeft:8}}>{fmtTime(lastMsg.created_at)}</div>
                  </div>
                  <div style={{fontSize:14,color:LB3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{preview}</div>
                </div>
                <div style={{color:LB3,fontSize:20,flexShrink:0}}>›</div>
              </div>
            );
          })}
          <div style={{height:20}}/>
        </div>
      )}

      {/* ── GROUP CHAT TAB ── */}
      {mode==="group"&&(
        <>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${SEP}`,background:BG,flexShrink:0,display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:700,color:LBL}}>💬 Team Group Chat</div>
              <div style={{fontSize:13,color:LB3}}>{(allProfiles||[]).filter(p=>!p.is_admin).length} members</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
            {groupLoading&&messages.length===0?(
              <div style={{display:"flex",flexDirection:"column",gap:14,padding:"10px 0"}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{display:"flex",flexDirection:i%2===0?"row":"row-reverse",alignItems:"flex-end",gap:10}}>
                    {i%2===0&&<div style={{width:38,height:38,borderRadius:"50%",background:`${ACC}15`,flexShrink:0}}/>}
                    <div style={{width:[170,210,150,195][i],height:50,borderRadius:14,background:`${ACC}10`,animation:"pulse 1.4s ease-in-out infinite",animationDelay:`${i*0.1}s`}}/>
                  </div>
                ))}
              </div>
            ):messages.length===0?(
              <div style={{textAlign:"center",padding:40,color:LB3,fontSize:17}}>No messages yet. Say hi! 👋</div>
            ):null}
            {messages.map(msg=>{
              const me=msg.user_id===profile.id;
              const avatarUrl=msg.sender_avatar_url||allProfiles?.find(p=>p.id===msg.user_id)?.avatar_url||"";
              const avatarLetter=msg.sender_avatar||msg.sender_name?.charAt(0)||"?";
              if(msg.is_system)return(
                <div key={msg.id} style={{textAlign:"center",padding:"4px 8px"}}>
                  <div style={{display:"inline-block",background:`${ACC}10`,borderRadius:14,padding:"10px 16px",fontSize:14,color:ACC,lineHeight:1.55,maxWidth:"88%"}}>{msg.content}</div>
                </div>
              );
              return(
                <div key={msg.id} style={{display:"flex",flexDirection:me?"row-reverse":"row",alignItems:"flex-end",gap:10}}>
                  {!me&&(
                    <div
                      onClick={()=>{const s=allProfiles?.find(p=>p.id===msg.user_id);if(s&&setViewingProfile)setViewingProfile(s);}}
                      style={{width:38,height:38,borderRadius:"50%",background:avatarUrl?`url(${avatarUrl}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden",cursor:"pointer",border:`2px solid ${BG}`}}>
                      {!avatarUrl&&avatarLetter}
                    </div>
                  )}
                  <div style={{maxWidth:"72%"}}>
                    {!me&&<div style={{fontSize:12,color:LB3,marginBottom:4,paddingLeft:4}}>{msg.sender_name}</div>}
                    <div style={{
                      background:me?`linear-gradient(135deg,${ACC},#0e2140)`:BG2,
                      borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",
                      padding:"12px 16px",
                      boxShadow:me?`0 2px 8px ${ACC}30`:"0 1px 4px rgba(0,0,0,.07)",
                    }}>
                      <div style={{fontSize:16,color:me?"#fff":LBL,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                    </div>
                    <div style={{fontSize:11,color:LB3,marginTop:4,textAlign:me?"right":"left",paddingLeft:me?0:4}}>
                      {new Date(msg.created_at).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true})}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>

          {showEmoji&&<EmojiPicker onSelect={e=>{setText(p=>p+e);}}/>}

          {/* Group input */}
          <div style={{padding:"8px 14px",background:BG2,borderTop:`1px solid ${SEP}`,display:"flex",gap:8,alignItems:"center",flexShrink:0,paddingBottom:"max(8px,env(safe-area-inset-bottom))"}}>
            <button onClick={()=>setShowEmoji(p=>!p)}
              style={{width:42,height:42,borderRadius:"50%",background:showEmoji?`${ACC}20`:"transparent",border:`1px solid ${showEmoji?ACC:SEP}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
              😊
            </button>
            <input value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
              placeholder="Message the team…"
              style={{flex:1,background:`${ACC}08`,border:`1px solid ${ACC}20`,outline:"none",borderRadius:24,padding:"12px 18px",fontSize:16,color:LBL,fontFamily:SF,minWidth:0}}/>
            {text.trim()?(
              <button onClick={send} disabled={sending}
                className="btn-primary ripple-container" onPointerDown={addRipple}
                style={{width:46,height:46,borderRadius:"50%",background:ACC,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,color:"#fff",boxShadow:`0 3px 12px ${ACC}50`,transition:"background .15s"}}>
                {sending?"…":"▶"}
              </button>
            ):(
              <button
                onMouseDown={startGrpRecording} onMouseUp={stopGrpRecording}
                onTouchStart={startGrpRecording} onTouchEnd={stopGrpRecording}
                style={{width:46,height:46,borderRadius:"50%",background:grpRecording?"#ff3b30":ACC,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",flexShrink:0,color:"#fff",transition:"background .2s",boxShadow:`0 3px 12px ${ACC}50`}}>
                🎤
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── PROFILE TAB ───────────────────────────────────────────────────────
export function ProfileTab({profile,syncProfile,score,tier,completedCount,showToast,onSwitchAccount,onAddAccount,onShowSwitcher,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [section,setSection]=useState("public");
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [rawImg,setRawImg]=useState(null);
  const [showCrop,setShowCrop]=useState(false);
  const [showBannerFull,setShowBannerFull]=useState(false);
  const [showAvatarFull,setShowAvatarFull]=useState(false);
  const [verif,setVerif]=useState([]);
  const [infoExpanded,setInfoExpanded]=useState(false);
  const [privateEditing,setPrivateEditing]=useState(null);
  const [privateForm,setPrivateForm]=useState({ic_number:"",epf_number:"",bank_account:"",bank_type:profile.bank_type||"Maybank"});
  const [submittingPrivate,setSubmittingPrivate]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [switching,setSwitching]=useState(null);
  const GENDERS=["Male","Female","Prefer not to say"];

  const [form,setForm]=useState({
    name:profile.name||"",nickname:profile.nickname||"",bio:profile.bio||"",
    hobby:profile.hobby||"",favorite_food:profile.favorite_food||"",
    contact_number:profile.contact_number||"",gender:profile.gender||"",
    hometown:profile.hometown||"",email:profile.email||"",
    birthday:profile.birthday||"",joined_date:profile.joined_date||"",
    avatar_url:profile.avatar_url||"",banner_url:profile.banner_url||"",
  });
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleAcctSwitch=async(acct)=>{
    if(switching)return;
    if(acct.id===getActiveAccountId())return;
    setSwitching(acct.id);
    try{if(onSwitchAccount)await onSwitchAccount(acct.id);}
    catch(err){console.error("Switch failed:",err);}
    setSwitching(null);
  };

  useEffect(()=>{loadVerif();},[]);

  const loadVerif=async()=>{
    const{data}=await supabase.from("verification_requests").select("*").eq("user_id",profile.id).order("submitted_at",{ascending:false});
    if(data)setVerif(data);
  };

  const getVerifStatus=field=>{
    if(field==="ic_number"&&profile.ic_verified)return"verified";
    if(field==="epf_number"&&profile.epf_verified)return"verified";
    if(field==="bank_account"&&profile.bank_verified)return"verified";
    if(field==="joined_date"&&profile.joined_date_verified)return"verified";
    if(field==="birthday"&&profile.birthday_verified)return"verified";
    const latest=verif.find(v=>v.field_name===field);
    if(latest?.status==="Pending")return"pending";
    if(latest?.status==="Rejected")return"rejected";
    return"unverified";
  };

  const VerifBadge=({field})=>{
    const status=getVerifStatus(field);
    const cfg={
      verified:{c:"#34c759",label:"✓ Verified"},
      pending:{c:"#ff9500",label:"⏳ Pending"},
      rejected:{c:"#ff3b30",label:"✕ Rejected"},
      unverified:{c:"#8e8e93",label:"Not Verified"},
    }[status];
    return<span style={{fontSize:12,color:cfg.c,fontWeight:700,background:cfg.c+"18",padding:"3px 9px",borderRadius:99}}>{cfg.label}</span>;
  };

  const handleFileSelect=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{setRawImg(ev.target.result);setShowCrop(true);};r.readAsDataURL(file);};
  const handleBannerSelect=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>set("banner_url",ev.target.result);r.readAsDataURL(file);};

  const save=async()=>{
    setSaving(true);
    const payload={...form};
    if(profile.joined_date_verified)payload.joined_date=profile.joined_date;
    if(profile.birthday_verified)payload.birthday=profile.birthday;
    syncProfile({...profile,...payload});setEditing(false);showToast("Profile updated ✓");
    const reqs=[];
    if(form.joined_date!==profile.joined_date&&form.joined_date&&!profile.joined_date_verified)
      reqs.push({user_id:profile.id,field_name:"joined_date",field_value:form.joined_date,status:"Pending"});
    if(form.birthday!==profile.birthday&&form.birthday&&!profile.birthday_verified)
      reqs.push({user_id:profile.id,field_name:"birthday",field_value:form.birthday,status:"Pending"});
    try{
      await supabase.from("profiles").update(payload).eq("id",profile.id);
      if(reqs.length>0)await supabase.from("verification_requests").insert(reqs);
      await loadVerif();
    }catch{showToast("Sync error — please refresh");}
    setSaving(false);
  };

  // ── FIXED: bank auto-overrides + goes pending immediately ──
  const submitPrivate=async(fieldName,value,extra=null)=>{
    if(!value.trim()){showToast("Please enter a value");return;}
    if((fieldName==="ic_number"&&profile.ic_verified)||(fieldName==="epf_number"&&profile.epf_verified)){
      showToast("Locked after verification");return;
    }
    setSubmittingPrivate(true);
    try{
      if(fieldName==="bank_account"){
        // Immediately update profile with new bank + set pending
        const bankUpdate={bank_account:value,bank_type:extra||"Maybank",bank_verified:false};
        syncProfile({...profile,...bankUpdate});
        await supabase.from("profiles").update(bankUpdate).eq("id",profile.id);
      }
      const req={user_id:profile.id,field_name:fieldName,field_value:value,status:"Pending"};
      if(extra)req.extra_value=extra;
      await supabase.from("verification_requests").insert(req);
      await loadVerif();
      showToast(fieldName==="bank_account"?"Bank updated — pending admin verification 🔒":"Submitted for verification 🔒");
    }catch(e){console.error(e);showToast("Failed to submit");}
    setPrivateEditing(null);setSubmittingPrivate(false);
  };

  const av=form.avatar_url||profile.avatar_url;
  const bn=form.banner_url||profile.banner_url;
  const age=profile.birthday_verified&&profile.birthday?calcAge(profile.birthday):null;
  const daysWorking=profile.joined_date_verified&&profile.joined_date?calcDaysWorking(profile.joined_date):null;
  const publicRows=[
    ["🎂 Age",age?`${age} years old`:null],
    ["⚧ Gender",profile.gender||null],
    ["🏠 Home Town",profile.hometown||null],
    ["📱 Contact",profile.contact_number?formatContact(profile.contact_number):null],
    ["📧 Email",profile.email||null],
    ["📅 Joining Date",profile.joined_date_verified?fmtDate(profile.joined_date):null],
    ["⏳ Been Working",daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎂 Birthday",profile.birthday_verified?fmtDate(profile.birthday):null],
    ["🎮 Hobby",profile.hobby||null],
    ["🍜 Fav Food",profile.favorite_food||null],
  ].filter(([,v])=>v);
  const SHOW_INIT=5;
  const visibleRows=infoExpanded?publicRows:publicRows.slice(0,SHOW_INIT);
  const hasMore=publicRows.length>SHOW_INIT;

  if(showSettings){
    const savedAccts=getSavedAccounts().sort((a,b)=>(b.lastUsed||0)-(a.lastUsed||0));
    const activeId=getActiveAccountId();
    return(
      <div className="page-enter-forward" style={{padding:"16px 0 24px"}}>
        <div style={{padding:"0 16px 20px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setShowSettings(false)} className="btn" style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ACC,padding:0,lineHeight:1}}>←</button>
          <div style={{fontSize:20,fontWeight:700,color:LBL}}>Settings</div>
        </div>

        {/* Saved accounts */}
        {savedAccts.length>0&&(
          <div style={{padding:"0 16px",marginBottom:20}}>
            <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8,paddingLeft:4}}>Saved Accounts</div>
            <div style={{background:BG2,borderRadius:14,overflow:"hidden"}}>
              {savedAccts.map((acct,i)=>{
                const isActive=acct.id===activeId;
                const initials=(acct.nickname||acct.name||acct.email||"?").slice(0,2).toUpperCase();
                const isSwitching=switching===acct.id;
                return(
                  <div key={acct.id}
                    onClick={!isActive&&!isSwitching?()=>handleAcctSwitch(acct):undefined}
                    className={!isActive?"card-press":""}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:isActive?`${ACC}0D`:"transparent",borderBottom:i<savedAccts.length-1?`1px solid ${SEP}`:"none",cursor:isActive?"default":"pointer"}}>
                    {acct.avatar_url
                      ?<img src={acct.avatar_url} alt={initials} style={{width:46,height:46,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:isActive?`2px solid ${ACC}`:"2px solid transparent"}}/>
                      :<div style={{width:46,height:46,borderRadius:"50%",background:ACC,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0,border:isActive?`2px solid ${ACC}`:"2px solid transparent"}}>{initials}</div>
                    }
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:16,fontWeight:600,color:LBL,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
                        {acct.nickname||acct.name||acct.email?.split("@")[0]}
                        {isActive&&<span style={{fontSize:10,color:"#fff",fontWeight:700,background:ACC,borderRadius:99,padding:"1px 7px"}}>ACTIVE</span>}
                      </div>
                      <div style={{fontSize:13,color:LB3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acct.email}</div>
                    </div>
                    {isSwitching&&<div style={{width:20,height:20,border:"2px solid "+ACC+"44",borderTop:"2px solid "+ACC,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>
            {onAddAccount&&(
              <button onClick={onAddAccount} className="btn"
                style={{width:"100%",background:BG2,border:`1px solid ${SEP}`,borderRadius:14,padding:"14px 16px",fontSize:16,fontWeight:600,color:ACC,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",gap:12,marginTop:8,textAlign:"left"}}>
                <div style={{width:44,height:44,borderRadius:"50%",border:`2px dashed ${SEP}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:LB3,flexShrink:0}}>+</div>
                Add Another Account
              </button>
            )}
          </div>
        )}

        <div style={{padding:"0 16px"}}>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8,paddingLeft:4}}>Account</div>
          <div style={{background:BG2,borderRadius:14,overflow:"hidden"}}>
            <button onClick={()=>supabase.auth.signOut()} className="btn"
              style={{width:"100%",padding:"16px",fontSize:16,fontWeight:600,color:"#ff3b30",background:"none",border:"none",cursor:"pointer",fontFamily:SF,textAlign:"left"}}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{paddingBottom:16}}>
      {showCrop&&rawImg&&<CircleCrop src={rawImg} onCrop={url=>{set("avatar_url",url);setShowCrop(false);setRawImg(null);}} onCancel={()=>{setShowCrop(false);setRawImg(null);}}/>}
      {showBannerFull&&(
        <div style={{position:"fixed",inset:0,background:"#000",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowBannerFull(false)}>
          {bn?<img src={bn} alt="banner" style={{width:"100%",maxHeight:"100vh",objectFit:"contain"}}/>:<div style={{color:"#fff"}}>No banner</div>}
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}
      {showAvatarFull&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAvatarFull(false)}>
          <div style={{width:290,height:290,borderRadius:"50%",background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80,fontWeight:700,color:ACC,overflow:"hidden"}}>{!av&&(profile.avatar||"?")}</div>
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}

      {/* Banner */}
      <div onClick={()=>!editing&&setShowBannerFull(true)}
        style={{height:140,background:bn?`url(${bn}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,position:"relative",cursor:!editing?"zoom-in":"default"}}>
        {/* Settings gear — top right corner */}
        {!editing&&(
          <button onClick={e=>{e.stopPropagation();setShowSettings(true);}} className="btn"
            style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,.18)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:"none",borderRadius:"50%",width:38,height:38,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}>
            ⚙️
          </button>
        )}
        {editing&&(
          <>
            <button onClick={e=>{e.stopPropagation();document.getElementById("bnP").click();}}
              style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.55)",color:"#fff",border:"none",borderRadius:10,padding:"7px 13px",fontSize:14,cursor:"pointer",fontFamily:SF,fontWeight:600}}>
              Change Banner
            </button>
            <input id="bnP" type="file" accept="image/*" onChange={handleBannerSelect} style={{display:"none"}}/>
          </>
        )}
      </div>

      {/* Avatar + edit */}
      <div style={{padding:"0 16px",marginTop:-48,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{position:"relative"}}>
          <div onClick={()=>!editing&&setShowAvatarFull(true)}
            style={{width:90,height:90,borderRadius:"50%",background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,border:`3px solid ${BG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:ACC,overflow:"hidden",cursor:!editing?"zoom-in":"default"}}>
            {!av&&(profile.avatar||"?")}
          </div>
          {editing&&(
            <button onClick={()=>document.getElementById("avP").click()}
              style={{position:"absolute",bottom:2,right:2,width:30,height:30,background:ACC,border:`2px solid ${BG}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:15}}>
              📷
            </button>
          )}
          <input id="avP" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
        </div>
        {!editing&&(
          <button onClick={()=>setEditing(true)} className="btn"
            style={{background:"rgba(0,0,0,.07)",color:LBL,border:"none",borderRadius:99,padding:"10px 20px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Name + tier */}
      <div style={{padding:"0 16px",marginBottom:16}}>
        <div style={{fontSize:24,fontWeight:700,color:LBL}}>{profile.nickname||profile.name}</div>
        <div style={{fontSize:15,color:LB3,marginTop:3}}>{profile.name} · {profile.role}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:tier.color+"18",borderRadius:99,padding:"4px 12px",marginTop:10}}>
          <span style={{fontSize:16}}>{tier.emoji}</span>
          <span style={{fontSize:13,color:tier.color,fontWeight:700}}>{tier.name}</span>
        </div>
        {profile.bio&&!editing&&<div style={{fontSize:15,color:LB2,marginTop:12,lineHeight:1.65}}>{profile.bio}</div>}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"0 16px",marginBottom:18}}>
        {[{l:"Points",v:(profile.xp||0).toLocaleString()},{l:"Contrib.",v:score.toLocaleString()},{l:"Missions",v:completedCount}].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:14,padding:"14px 8px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:700,color:ACC}}>{s.v}</div>
            <div style={{fontSize:12,color:LB3,marginTop:3}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:10,padding:"0 16px",marginBottom:16}}>
        {[["public","Public Info"],["private","Private 🔒"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSection(id)} className="btn"
            style={{flex:1,padding:"12px",background:section===id?ACC:"rgba(0,0,0,.06)",color:section===id?"#fff":LB2,border:"none",borderRadius:14,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      {/* PUBLIC section */}
      {section==="public"&&(
        editing?(
          <div style={{padding:"0 16px"}}>
            <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:12}}>
              {[
                {label:"Full Name",key:"name",ph:"Ahmad Farid"},
                {label:"Nickname",key:"nickname",ph:"e.g. Farid"},
                {label:"Hobby",key:"hobby",ph:"e.g. Gaming"},
                {label:"Favourite Food",key:"favorite_food",ph:"e.g. Nasi Lemak"},
                {label:"Home Town",key:"hometown",ph:"e.g. Kuala Lumpur"},
                {label:"Email",key:"email",ph:"your@email.com",type:"email"},
              ].map(({label,key,ph,type="text"},i,a)=>(
                <div key={key} style={{padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>{label}</div>
                  <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph} type={type}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
                </div>
              ))}
              <div style={{padding:"13px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Contact</div>
                <input value={form.contact_number} onChange={e=>set("contact_number",e.target.value.replace(/\D/g,""))} placeholder="0123456789" type="tel"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
                {form.contact_number&&<div style={{fontSize:13,color:ACC,marginTop:4,fontWeight:600}}>Preview: {formatContact(form.contact_number)}</div>}
              </div>
              <div style={{padding:"13px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Gender</div>
                <div style={{position:"relative"}}>
                  <select value={form.gender} onChange={e=>set("gender",e.target.value)}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:form.gender?LBL:LB3,appearance:"none",WebkitAppearance:"none",cursor:"pointer",fontFamily:SF}}>
                    <option value="">Select…</option>
                    {GENDERS.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",fontSize:16,color:LB3,pointerEvents:"none"}}>▾</div>
                </div>
              </div>
              <div style={{padding:"13px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>About Me</div>
                <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Short description…" rows={3}
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,resize:"none",fontFamily:SF,lineHeight:1.5}}/>
              </div>
              <div style={{padding:"13px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700}}>Birthday</div>
                  <VerifBadge field="birthday"/>
                </div>
                {profile.birthday_verified
                  ?<div style={{fontSize:17,color:LB3}}>{fmtDate(profile.birthday)} (locked)</div>
                  :<input type="date" value={form.birthday} onChange={e=>set("birthday",e.target.value)}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
                }
                {!profile.birthday_verified&&form.birthday&&<div style={{fontSize:12,color:"#ff9500",marginTop:4}}>⏳ Requires admin verification</div>}
              </div>
              <div style={{padding:"13px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700}}>Joining Date</div>
                  <VerifBadge field="joined_date"/>
                </div>
                {profile.joined_date_verified
                  ?<div style={{fontSize:17,color:LB3}}>{fmtDate(profile.joined_date)} (locked)</div>
                  :<input type="date" value={form.joined_date} onChange={e=>set("joined_date",e.target.value)}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
                }
                {!profile.joined_date_verified&&form.joined_date&&<div style={{fontSize:12,color:"#ff9500",marginTop:4}}>⏳ Shown after admin verification</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <button onClick={()=>setEditing(false)} className="btn"
                style={{flex:1,padding:"16px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:14,fontSize:17,color:"#ff3b30",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="btn-primary ripple-container" onPointerDown={addRipple}
                style={{flex:2,padding:"16px",background:saving?"#e5e5ea":ACC,color:saving?LB3:"#fff",border:"none",borderRadius:14,fontSize:17,fontWeight:700,cursor:saving?"default":"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {saving&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {saving?"Saving…":"Save Changes ✓"}
              </button>
            </div>
          </div>
        ):(
          <div style={{padding:"0 16px"}}>
            <div style={{background:BG2,borderRadius:16,overflow:"hidden"}}>
              {visibleRows.map(([label,value],i)=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",borderBottom:i<visibleRows.length-1||hasMore?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:16,color:LB3,flexShrink:0,marginRight:14}}>{label}</div>
                  <div style={{fontSize:16,color:LBL,textAlign:"right",maxWidth:"55%",lineHeight:1.4}}>{value}</div>
                </div>
              ))}
              {hasMore&&(
                <button onClick={()=>setInfoExpanded(p=>!p)} className="btn"
                  style={{width:"100%",padding:"13px 16px",background:"none",border:"none",cursor:"pointer",fontSize:15,color:ACC,fontWeight:700,fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {infoExpanded?`Show Less ▲`:`Show ${publicRows.length-SHOW_INIT} More ▾`}
                </button>
              )}
              {publicRows.length===0&&(
                <div style={{padding:"24px 16px",fontSize:16,color:LB3,textAlign:"center"}}>Tap Edit Profile to add your info.</div>
              )}
            </div>
          </div>
        )
      )}

      {/* PRIVATE section */}
      {section==="private"&&(
        <div style={{padding:"0 16px"}}>
          <div style={{background:`${ACC}10`,borderRadius:14,padding:"14px 16px",marginBottom:16,fontSize:15,color:ACC,lineHeight:1.7}}>
            🔒 Visible only to you and admin.<br/>
            <strong>IC & EPF</strong> locked after verification.<br/>
            <strong>Bank</strong> always editable — changes need re-approval.
          </div>

          {/* IC */}
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700}}>IC Number</div>
                <VerifBadge field="ic_number"/>
              </div>
              <div style={{fontSize:17,color:LBL,marginBottom:10}}>{profile.ic_number||"Not provided"}</div>
              {!profile.ic_verified&&(
                privateEditing==="ic"?(
                  <div style={{borderTop:`1px solid ${SEP}`,paddingTop:14}}>
                    <input value={privateForm.ic_number}
                      onChange={e=>setPrivateForm(p=>({...p,ic_number:formatIC(e.target.value)}))}
                      placeholder="XXXXXX-XX-XXXX"
                      style={{width:"100%",background:"#f2f2f7",border:`1px solid ${SEP}`,borderRadius:12,padding:"12px 14px",fontSize:17,color:LBL,outline:"none",marginBottom:8,letterSpacing:1}}/>
                    <div style={{fontSize:13,color:getICDigits(privateForm.ic_number).length===12?"#34c759":LB3,marginBottom:10,fontWeight:600}}>
                      {getICDigits(privateForm.ic_number).length}/12 digits
                    </div>
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>setPrivateEditing(null)} className="btn"
                        style={{flex:1,padding:"12px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:12,fontSize:15,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                      <button onClick={()=>submitPrivate("ic_number",privateForm.ic_number)}
                        disabled={submittingPrivate||getICDigits(privateForm.ic_number).length!==12}
                        className="btn-primary"
                        style={{flex:2,padding:"12px",background:ACC,border:"none",borderRadius:12,fontSize:15,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:SF}}>Submit</button>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>setPrivateEditing("ic")} className="btn"
                    style={{width:"100%",padding:"12px",background:`${ACC}10`,border:"none",borderRadius:12,fontSize:15,color:ACC,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                    {profile.ic_number?"Update IC":"Add IC Number"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* EPF */}
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700}}>EPF Number</div>
                <VerifBadge field="epf_number"/>
              </div>
              <div style={{fontSize:17,color:LBL,marginBottom:10}}>{profile.epf_number||"Not provided"}</div>
              {!profile.epf_verified&&(
                privateEditing==="epf"?(
                  <div style={{borderTop:`1px solid ${SEP}`,paddingTop:14}}>
                    <input value={privateForm.epf_number}
                      onChange={e=>setPrivateForm(p=>({...p,epf_number:e.target.value.replace(/\D/g,"")}))}
                      placeholder="XXXXXXXXXXXX" type="tel"
                      style={{width:"100%",background:"#f2f2f7",border:`1px solid ${SEP}`,borderRadius:12,padding:"12px 14px",fontSize:17,color:LBL,outline:"none",marginBottom:10}}/>
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>setPrivateEditing(null)} className="btn"
                        style={{flex:1,padding:"12px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:12,fontSize:15,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                      <button onClick={()=>submitPrivate("epf_number",privateForm.epf_number)}
                        disabled={submittingPrivate||!privateForm.epf_number}
                        className="btn-primary"
                        style={{flex:2,padding:"12px",background:ACC,border:"none",borderRadius:12,fontSize:15,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:SF}}>Submit</button>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>setPrivateEditing("epf")} className="btn"
                    style={{width:"100%",padding:"12px",background:`${ACC}10`,border:"none",borderRadius:12,fontSize:15,color:ACC,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                    {profile.epf_number?"Update EPF":"Add EPF Number"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Bank — always editable, auto-overrides existing */}
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700}}>Bank Account</div>
                <VerifBadge field="bank_account"/>
              </div>
              <div style={{fontSize:17,color:LBL,marginBottom:3}}>{profile.bank_account||"Not provided"}</div>
              {profile.bank_type&&<div style={{fontSize:14,color:LB3,marginBottom:10}}>{profile.bank_type}</div>}
              {privateEditing==="bank"?(
                <div style={{borderTop:`1px solid ${SEP}`,paddingTop:14}}>
                  <input value={privateForm.bank_account}
                    onChange={e=>setPrivateForm(p=>({...p,bank_account:e.target.value.replace(/\D/g,"")}))}
                    placeholder="Account number (digits only)" type="tel"
                    style={{width:"100%",background:"#f2f2f7",border:`1px solid ${SEP}`,borderRadius:12,padding:"12px 14px",fontSize:17,color:LBL,outline:"none",marginBottom:10}}/>
                  <div style={{position:"relative",marginBottom:10}}>
                    <select value={privateForm.bank_type}
                      onChange={e=>setPrivateForm(p=>({...p,bank_type:e.target.value}))}
                      style={{width:"100%",background:"transparent",border:`1px solid ${SEP}`,borderRadius:12,padding:"12px 36px 12px 14px",fontSize:17,color:LBL,appearance:"none",WebkitAppearance:"none",cursor:"pointer",outline:"none"}}>
                      {BANK_TYPES.map(b=><option key={b} value={b}>{b}</option>)}
                    </select>
                    <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:LB3,pointerEvents:"none"}}>▾</div>
                  </div>
                  <div style={{background:`${ORG}10`,borderRadius:12,padding:"10px 14px",fontSize:13,color:ORG,marginBottom:12,lineHeight:1.5}}>
                    ⚠️ Your current bank info will be replaced and go back to pending verification.
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>setPrivateEditing(null)} className="btn"
                      style={{flex:1,padding:"12px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:12,fontSize:15,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                    <button onClick={()=>submitPrivate("bank_account",privateForm.bank_account,privateForm.bank_type)}
                      disabled={submittingPrivate||!privateForm.bank_account}
                      className="btn-primary"
                      style={{flex:2,padding:"12px",background:ACC,border:"none",borderRadius:12,fontSize:15,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                      {submittingPrivate?"Saving…":"Update Bank"}
                    </button>
                  </div>
                </div>
              ):(
                <button onClick={()=>{setPrivateForm(p=>({...p,bank_account:"",bank_type:profile.bank_type||"Maybank"}));setPrivateEditing("bank");}} className="btn"
                  style={{width:"100%",padding:"12px",background:`${ACC}10`,border:"none",borderRadius:12,fontSize:15,color:ACC,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                  {profile.bank_account?"Update Bank Account":"Add Bank Account"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
