import {useState,useEffect} from "react";
import {supabase} from "./supabaseClient";
import UserApp from "./UserApp";
import AdminApp from "./AdminApp";
import {SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,WELCOME} from "./constants";

function OnboardingFlow({user,onComplete}){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:user.name||"",nickname:"",birthday:"",joined_date:new Date().toISOString().split("T")[0],whatsapp:"",bio:"",hobby:"",favorite_food:"",ic_number:"",epf_number:"",bank_account:"",avatar_url:""});
  const [loading,setLoading]=useState(false);
  const [imgPreview,setImgPreview]=useState(null);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const TOTAL=5;

  const handleImg=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{setImgPreview(ev.target.result);set("avatar_url",ev.target.result);};
    reader.readAsDataURL(file);
  };

  const handleSubmit=async()=>{
    setLoading(true);
    await supabase.from("profiles").update({...form,onboarded:true}).eq("id",user.id);
    for(const msg of WELCOME){
      await supabase.from("messages").insert({user_id:user.id,sender_name:"Techwide Hub",sender_avatar:"TW",content:msg,is_system:true});
    }
    setLoading(false);
    onComplete();
  };

  const inp={width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF};
  const FR=(label,key,ph,type="text",last=false)=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>
      <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph} type={type} style={inp}/>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,padding:"0 16px 40px",maxWidth:430,margin:"0 auto"}}>
      <div style={{padding:"56px 0 24px"}}>
        <div style={{fontSize:13,color:LB3,marginBottom:6}}>Step {step} of {TOTAL}</div>
        <div style={{background:SEP,borderRadius:99,height:4,overflow:"hidden"}}>
          <div style={{width:`${(step/TOTAL)*100}%`,height:"100%",background:ACC,borderRadius:99,transition:"width .3s"}}/>
        </div>
      </div>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",lineHeight:1.2}}>
          {step===1&&"Welcome! Set up your profile 👋"}
          {step===2&&"Your contact details 📱"}
          {step===3&&"Tell us about yourself ✨"}
          {step===4&&"Private information 🔒"}
          {step===5&&"Profile photo 📸"}
        </div>
        <div style={{fontSize:15,color:LB3,marginTop:8}}>
          {step===1&&"Basic info visible to your team"}
          {step===2&&"How teammates can reach you"}
          {step===3&&"Your personality and interests"}
          {step===4&&"Only visible to admin — kept secure"}
          {step===5&&"Make your profile stand out!"}
        </div>
      </div>

      {step===1&&(
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:16}}>
          {FR("Full Name","name","Ahmad Farid")}
          {FR("Nickname","nickname","Farid")}
          {FR("Birthday","birthday","","date")}
          {FR("Joining Date","joined_date","","date",true)}
        </div>
      )}
      {step===2&&(
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:16}}>
          {FR("WhatsApp Number","whatsapp","601X-XXXXXXX","tel",true)}
        </div>
      )}
      {step===3&&(
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
            <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Write something about yourself…" rows={3} style={{...inp,resize:"none",lineHeight:1.45}}/>
          </div>
          {FR("Hobby","hobby","e.g. Gaming, Reading")}
          {FR("Favorite Food","favorite_food","e.g. Nasi Lemak",  "text",true)}
        </div>
      )}
      {step===4&&(
        <>
          <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC,lineHeight:1.6}}>
            🔒 This info is only visible to admin. Never shown on your public profile.
          </div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:16}}>
            {FR("IC Number","ic_number","XXXXXX-XX-XXXX")}
            {FR("EPF Number","epf_number","XXXXXXXXXXXX")}
            {FR("Bank Account No.","bank_account","XXXXXXXXXXXXXX",  "text",true)}
          </div>
        </>
      )}
      {step===5&&(
        <div style={{textAlign:"center",marginBottom:24}}>
          <div onClick={()=>document.getElementById("avIn").click()} style={{width:120,height:120,borderRadius:"50%",background:imgPreview?`url(${imgPreview}) center/cover`:`${ACC}20`,margin:"0 auto 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,border:`2px dashed ${imgPreview?"transparent":ACC}`,overflow:"hidden"}}>
            {!imgPreview&&"📸"}
          </div>
          <input id="avIn" type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
          <div style={{fontSize:15,color:ACC,fontWeight:600,cursor:"pointer"}} onClick={()=>document.getElementById("avIn").click()}>
            {imgPreview?"Change Photo":"Tap to Upload Photo"}
          </div>
          <div style={{fontSize:13,color:LB3,marginTop:8}}>You can always update this in your profile</div>
        </div>
      )}

      <div style={{display:"flex",gap:10}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"15px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:17,color:LBL,cursor:"pointer",fontFamily:SF}}>Back</button>}
        {step<TOTAL
          ?<button onClick={()=>setStep(s=>s+1)} disabled={step===1&&!form.name.trim()} style={{flex:2,padding:"15px",background:ACC,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF,opacity:step===1&&!form.name.trim()?.5:1}}>Continue</button>
          :<button onClick={handleSubmit} disabled={loading} style={{flex:2,padding:"15px",background:ORG,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
            {loading?"Setting up…":"Let's Go! 🚀"}
          </button>
        }
      </div>
    </div>
  );
}

export default function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [loginEmail,setLoginEmail]=useState("");
  const [loginPass,setLoginPass]=useState("");
  const [loginErr,setLoginErr]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}body{background:${BG};font-family:${SF};}::-webkit-scrollbar{display:none;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes barFill{from{width:0}to{width:var(--w)}}.fade{animation:fadeUp .28s cubic-bezier(.4,0,.2,1) both}.bar{animation:barFill .7s cubic-bezier(.4,0,.2,1) both}.pressable:active{opacity:.6;transform:scale(.98);transition:all .1s;}input,textarea,button{font-family:${SF};}`;
    document.head.appendChild(el);
    return()=>document.head.removeChild(el);
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if(session)loadProfile(session.user.id);
      else setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s);
      if(!s){setProfile(null);setLoading(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadProfile=async uid=>{
    setLoading(true);
    const{data}=await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data)setProfile(data);
    setLoading(false);
  };

  const doLogin=async()=>{
    setLoginErr("");setLoginLoading(true);
    const{error}=await supabase.auth.signInWithPassword({email:loginEmail.trim(),password:loginPass});
    if(error){setLoginErr(error.message);setLoginLoading(false);}
    else{const uid=(await supabase.auth.getUser()).data.user.id;await loadProfile(uid);setLoginLoading(false);}
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:ACC,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:SF}}>
      <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover"}}/>
      <div style={{width:24,height:24,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  if(!session||!profile)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
      <div className="fade" style={{textAlign:"center",marginBottom:36}}>
        <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover",margin:"0 auto 16px",display:"block",boxShadow:"0 8px 28px rgba(28,50,88,.2)"}}/>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px"}}>Techwide Hub</div>
        <div style={{fontSize:13,color:LB3,marginTop:8,lineHeight:2}}>Sincerity · Love · Responsible · Respectful</div>
      </div>
      <div className="fade" style={{width:"100%",maxWidth:360}}>
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email</div>
            <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="your@email.com" type="email" autoComplete="email" style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
          </div>
          <div style={{padding:"11px 16px"}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password</div>
            <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
          </div>
        </div>
        {loginErr&&<div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12}}>{loginErr}</div>}
        <button onClick={doLogin} disabled={loginLoading} style={{width:"100%",background:loginLoading?"#e5e5ea":ACC,color:loginLoading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
          {loginLoading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          Sign In
        </button>
      </div>
    </div>
  );

  if(!profile.onboarded)return<OnboardingFlow user={profile} onComplete={()=>loadProfile(session.user.id)}/>;
  if(profile.is_admin)return<AdminApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
  return<UserApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
}
