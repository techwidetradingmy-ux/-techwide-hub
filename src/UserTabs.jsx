import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import CircleCrop from"./CircleCrop";
import{PRIZES,getTier,calcScore,formatContact,formatIC,getICDigits,BANK_TYPES,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}from"./constants";

const CAT_C={Sales:"#5856d6",Teamwork:"#007aff",Admin:"#af52de",Creativity:"#ff2d55",KOL:"#ff6b35",Content:"#30b0c7","Live Hosting":"#e91e8c",Others:"#8e8e93"};
const fmtDate=iso=>{if(!iso)return null;const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
const calcAge=birthday=>{if(!birthday)return null;const birth=new Date(birthday),today=new Date();let age=today.getFullYear()-birth.getFullYear();const m=today.getMonth()-birth.getMonth();if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;return age;};
const calcDaysWorking=joinedDate=>{if(!joinedDate)return null;return Math.floor((Date.now()-new Date(joinedDate))/86400000);};
const daysLeft=dueDate=>{if(!dueDate)return null;return Math.ceil((new Date(dueDate)-new Date())/(1000*60*60*24));};

function addRipple(e){const el=e.currentTarget;if(!el)return;const rect=el.getBoundingClientRect();const dot=document.createElement("div");dot.className="ripple-dot";dot.style.left=(e.clientX-rect.left)+"px";dot.style.top=(e.clientY-rect.top)+"px";el.appendChild(dot);setTimeout(()=>dot.remove(),500);}

// ── EMOJI PICKER ──────────────────────────────────────────────────────
const EMOJIS=["😀","😂","🤣","😍","🥰","😘","😎","🤩","😅","😭","😤","🥺","😡","🤔","😴","🙏","👍","👎","👋","💪","🤝","👏","❤️","🔥","✨","🎉","💯","⭐","🎯","🏆","💰","🎁","📱","💬","✅","🎊","😁","🤑","🌟","💥","🚀","🍜","☕","🧋","🍟","😆","😜","🥳","🫡","💪"];
function EmojiPicker({onSelect}){
  return(
    <div style={{background:BG2,borderTop:`1px solid ${SEP}`,padding:"10px 12px 14px",flexShrink:0,maxHeight:180,overflowY:"auto"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {EMOJIS.map(e=>(
          <button key={e} onClick={()=>onSelect(e)}
            style={{background:"none",border:"none",fontSize:28,cursor:"pointer",padding:"4px 6px",borderRadius:10,lineHeight:1,transition:"transform .1s"}}
            onPointerDown={ev=>{ev.currentTarget.style.transform="scale(.8)"}}
            onPointerUp={ev=>{ev.currentTarget.style.transform="scale(1)"}}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BRANDED DM CHAT ───────────────────────────────────────────────────
function DMChat({profile,dmWith,allProfiles,onBack,setViewingProfile,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [messages,setMessages]=useState([]);
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
    loadMsgs();markSeen();
    const iv=setInterval(()=>{loadMsgs();markSeen();},2000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const loadMsgs=async()=>{
    const{data}=await supabase.from("messages").select("*").eq("is_dm",true)
      .or(`and(user_id.eq.${profile.id},recipient_id.eq.${dmWith.id}),and(user_id.eq.${dmWith.id},recipient_id.eq.${profile.id})`)
      .order("created_at",{ascending:true}).limit(100);
    if(data)setMessages(data);
  };

  const markSeen=async()=>{
    await supabase.from("messages").update({seen_at:new Date().toISOString()})
      .eq("user_id",dmWith.id).eq("recipient_id",profile.id).is("seen_at",null);
  };

  const send=async(content=text.trim(),type="text",mediaUrl=null,fileName=null)=>{
    if(type==="text"&&!content)return;
    setSending(true);
    const msg={user_id:profile.id,recipient_id:dmWith.id,sender_name:profile.nickname||profile.name,sender_avatar:profile.avatar||"",sender_avatar_url:profile.avatar_url||"",content:content||"",message_type:type,media_url:mediaUrl,file_name:fileName,is_dm:true,delivered_at:new Date().toISOString()};
    const tempMsg={...msg,id:"temp_"+Date.now(),created_at:new Date().toISOString()};
    setMessages(p=>[...p,tempMsg]);
    setText("");setShowEmoji(false);
    await supabase.from("messages").insert(msg);
    try{await supabase.from("notifications").insert({user_id:dmWith.id,title:`💬 ${profile.nickname||profile.name}`,body:type==="text"?content:`Sent a ${type}`,type:"dm"});}catch(e){console.warn(e);}
    await loadMsgs();setSending(false);
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
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);const chunks=[];
      mr.ondataavailable=e=>chunks.push(e.data);
      mr.onstop=async()=>{
        const blob=new Blob(chunks,{type:"audio/webm"});
        const reader=new FileReader();
        reader.onload=async ev=>{await send("🎤 Voice message","audio",ev.target.result,"voice.webm");};
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start();setMediaRecorder(mr);setRecording(true);
    }catch{alert("Microphone access denied");}
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
      style={{position:"fixed",inset:0,background:BG,zIndex:100,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",fontFamily:SF}}
      onTouchStart={e=>touchStartX.current=e.touches[0].clientX}
      onTouchEnd={e=>{if(e.changedTouches[0].clientX-touchStartX.current>80)onBack();}}>

      {/* Branded header — no community header, own header only */}
      <div style={{background:ACC,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,paddingTop:"max(12px,env(safe-area-inset-top))"}}>
        <button onClick={onBack} className="btn" style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:"4px 8px 4px 0",fontFamily:SF}}>←</button>
        <div onClick={()=>setViewingProfile&&setViewingProfile(dmWith)}
          style={{width:44,height:44,borderRadius:"50%",background:dmWith.avatar_url?`url(${dmWith.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:ACC,overflow:"hidden",flexShrink:0,cursor:"pointer"}}>
          {!dmWith.avatar_url&&(dmWith.avatar||"?")}
        </div>
        <div style={{flex:1,cursor:"pointer"}} onClick={()=>setViewingProfile&&setViewingProfile(dmWith)}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.2}}>{dmWith.nickname||dmWith.name}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.65)"}}>{dmWith.role}</div>
        </div>
      </div>

      {/* Messages — flex:1 scrollabl
