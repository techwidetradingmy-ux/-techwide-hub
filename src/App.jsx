import{useState,useEffect}from"react";
import{supabase}from"./supabaseClient";
import UserApp from"./UserApp";
import AdminApp from"./AdminApp";
import CircleCrop from"./CircleCrop";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,WELCOME,formatIC,getICDigits,formatContact,normalizeContact,validateContact,BANK_TYPES,POSITIONS}from"./constants";

// ── GLOBAL STYLES ──────────────────────────────────────────────────────
const GLOBAL_CSS=`
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:${BG};font-family:${SF};}
  ::-webkit-scrollbar{display:none;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes barFill{from{width:0}to{width:var(--w)}}
  @keyframes toastIn{from{opacity:0;transform:translateY(10px)scale(.95)}to{opacity:1;transform:translateY(0)scale(1)}}
  @keyframes press{0%{transform:scale(1)}50%{transform:scale(.94)}100%{transform:scale(1)}}
  @keyframes notifPop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
  @keyframes shimmer{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
  .fade{animation:fadeUp .28s cubic-bezier(.4,0,.2,1) both}
  .bar{animation:barFill .7s cubic-bezier(.4,0,.2,1) both}
  .toast-in{animation:toastIn .3s cubic-bezier(.34,1.2,.64,1) both}
  .btn{transition:all .15s cubic-bezier(.4,0,.2,1);cursor:pointer;}
  .btn:active{transform:scale(.93);opacity:.85;}
  .btn-primary{transition:all .15s;cursor:pointer;}
  .btn-primary:active{transform:scale(.96);filter:brightness(.9);}
  .tab-btn{transition:all .15s;}
  .tab-btn:active{transform:scale(.88);}
  .card-press{transition:all .12s;}
  .card-press:active{transform:scale(.97);opacity:.9;}
  input,textarea,button{font-family:${SF};}
  .notif-dot{animation:notifPop .3s cubic-bezier(.34,1.56,.64,1) both;}
`;

// ── ONBOARDING ─────────────────────────────────────────────────────────
function OnboardingFlow({user,onComplete}){
  const [step,setStep]=useState(1);
  const [errors,setErrors]=useState({});
  const [form,setForm]=useState({
    name:user.name||"",nickname:"",position:"",birthday:"",
    joined_date:new Date().toISOString().split("T")[0],
    contact_number:"",bio:"",hobby:"",favorite_food:"",
    ic_number:"",epf_number:"",bank_account:"",bank_type:"Maybank",
    avatar_url:""
  });
  const [loading,setLoading]=useState(false);
  const [rawImg,setRawImg]=useState(null);
  const [showCrop,setShowCrop]=useState(false);
  const TOTAL=5;
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const clearErr=k=>setErrors(p=>({...p,[k]:undefined}));

  const validate=()=>{
    const e={};
    if(step===1){
      if(!form.name.trim())e.name="Full name is required";
      if(!form.position)e.position="Position is required";
      if(!form.birthday)e.birthday="Birthday is required";
    }
    if(step===2){
      if(!form.contact_number)e.contact_number="Contact number is required";
      else if(!validateContact(form.contact_number))e.contact_number="Enter a valid Malaysian number";
    }
    if(step===4){
      const digits=getICDigits(form.ic_number);
      if(!form.ic_number)e.ic_number="IC number is required";
      else if(digits.length!==12)e.ic_number="IC must be exactly 12 digits";
      if(form.bank_account&&!/^\d+$/.test(form.bank_account))e.bank_account="Numbers only";
    }
    if(step===5){
      if(!form.avatar_url)e.avatar_url="Profile photo is required";
    }
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const next=()=>{if(validate())setStep(s=>s+1);};

  const handleFileSelect=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{setRawImg(ev.target.result);setShowCrop(true);};
    reader.readAsDataURL(file);
  };

  const handleSubmit=async()=>{
    if(!validate())return;
    setLoading(true);
    const contact=normalizeContact(form.contact_number);
    const payload={...form,contact_number:contact,onboarded:true,role:form.position};
    await supabase.from("profiles").update(payload).eq("id",user.id);
    const reqs=[];
    if(form.ic_number)reqs.push({user_id:user.id,field_name:"ic_number",field_value:form.ic_number,status:"Pending"});
    if(form.epf_number)reqs.push({user_id:user.id,field_name:"epf_number",field_value:form.epf_number,status:"Pending"});
    if(form.bank_account)reqs.push({user_id:user.id,field_name:"bank_account",field_value:form.bank_account,extra_value:form.bank_type,status:"Pending"});
    reqs.push({user_id:user.id,field_name:"position",field_value:form.position,status:"Pending"});
    if(reqs.length>0)await supabase.from("verification_requests").insert(reqs);
    for(const msg of WELCOME){
      await supabase.from("messages").insert({user_id:user.id,sender_name:"Techwide Hub",sender_avatar:"TW",content:msg,is_system:true});
    }
    setLoading(false);
    onComplete();
  };

  const ErrMsg=({k})=>errors[k]?<div style={{fontSize:12,color:"#ff3b30",marginTop:4,fontWeight:500}}>{errors[k]}</div>:null;

  const FieldWrap=(label,children,last=false,required=false)=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
        <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>{label}</div>
        {required&&<div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>}
      </div>
      {children}
    </div>
  );

  const TextInp=(k,ph,type="text",onChange)=>(
    <input value={form[k]} onChange={onChange||((e)=>{set(k,e.target.value);clearErr(k);})} placeholder={ph} type={type}
      style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
  );

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      {showCrop&&rawImg&&<CircleCrop src={rawImg} onCrop={url=>{set("avatar_url",url);clearErr("avatar_url");setShowCrop(false);setRawImg(null);}} onCancel={()=>{setShowCrop(false);setRawImg(null);}}/>}
      <div style={{padding:"52px 16px 24px"}}>
        <img src="/TECHWIDE_LOGO.png" alt="" style={{width:36,height:36,borderRadius:8,objectFit:"cover",marginBottom:16}}/>
        <div style={{fontSize:13,color:LB3,marginBottom:6}}>Step {step} of {TOTAL}</div>
        <div style={{background:SEP,borderRadius:99,height:4,overflow:"hidden",marginBottom:24}}>
          <div style={{width:`${(step/TOTAL)*100}%`,height:"100%",background:ACC,borderRadius:99,transition:"width .3s"}}/>
        </div>
        <div style={{fontSize:25,fontWeight:700,color:LBL,letterSpacing:"-.6px",lineHeight:1.2,marginBottom:6}}>
          {step===1&&"Welcome! Let's set up 👋"}
          {step===2&&"Contact details 📱"}
          {step===3&&"Tell us about yourself ✨"}
          {step===4&&"Private information 🔒"}
          {step===5&&"Profile photo 📸"}
        </div>
        <div style={{fontSize:14,color:LB3,marginBottom:20,lineHeight:1.5}}>
          {step===1&&"Basic info — visible to your team"}
          {step===2&&"How your team can reach you"}
          {step===3&&"Your personality and interests"}
          {step===4&&"Admin only — kept secure & confidential"}
          {step===5&&"A clear photo helps your team recognise you"}
        </div>
      </div>

      <div style={{padding:"0 16px 24px"}}>
        {step===1&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            {FieldWrap("Full Name",<>{TextInp("name","Ahmad Farid")}<ErrMsg k="name"/></>,false,true)}
            {FieldWrap("Nickname",TextInp("nickname","Farid"),false,false)}
            {FieldWrap("Position",
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:4}}>
                  {POSITIONS.map(p=>(
                    <button key={p} onClick={()=>{set("position",p);clearErr("position");}} className="btn"
                      style={{padding:"8px 10px",background:form.position===p?ACC:"rgba(0,0,0,.05)",color:form.position===p?"#fff":LBL,border:"none",borderRadius:8,fontSize:12,fontFamily:SF,textAlign:"left",fontWeight:form.position===p?600:400}}>
                      {p}
                    </button>
                  ))}
                </div>
                <ErrMsg k="position"/>
              </>,false,true)}
            {FieldWrap("Birthday",<>{TextInp("birthday","","date")}<ErrMsg k="birthday"/></>,false,true)}
            {FieldWrap("Joining Date",TextInp("joined_date","","date"),true,false)}
          </div>
        )}

        {step===2&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              📱 Numbers only (no spaces/dashes)<br/>
              Example: 0123456789 or 01112345678
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
              {FieldWrap("Contact Number",
                <>
                  <input value={form.contact_number} onChange={e=>{set("contact_number",e.target.value.replace(/\D/g,''));clearErr("contact_number");}} placeholder="0123456789" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                  {form.contact_number&&<div style={{fontSize:13,color:ACC,marginTop:4,fontWeight:500}}>Preview: {formatContact(normalizeContact(form.contact_number))}</div>}
                  <ErrMsg k="contact_number"/>
                </>,true,true)}
            </div>
          </>
        )}

        {step===3&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
              <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Write something about yourself…" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",lineHeight:1.45,fontFamily:SF}}/>
            </div>
            {FieldWrap("Hobby",TextInp("hobby","e.g. Gaming, Reading"))}
            {FieldWrap("Favourite Food",TextInp("favorite_food","e.g. Nasi Lemak"),true)}
          </div>
        )}

        {step===4&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              🔒 Only visible to admin.<br/>
              IC, EPF & Bank require admin verification.
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
              {FieldWrap("IC Number",
                <>
                  <input value={form.ic_number} onChange={e=>{set("ic_number",formatIC(e.target.value));clearErr("ic_number");}} placeholder="XXXXXX-XX-XXXX"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF,letterSpacing:1}}/>
                  <div style={{fontSize:12,color:getICDigits(form.ic_number).length===12?"#34c759":LB3,marginTop:4}}>
                    {getICDigits(form.ic_number).length}/12 digits {getICDigits(form.ic_number).length===12&&"✓"}
                  </div>
                  <ErrMsg k="ic_number"/>
                </>,false,true)}
              {FieldWrap("EPF Number",TextInp("epf_number","XXXXXXXXXXXX"))}
              {FieldWrap("Bank Account Number",
                <>
                  <input value={form.bank_account} onChange={e=>{set("bank_account",e.target.value.replace(/\D/g,''));clearErr("bank_account");}} placeholder="Numbers only" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                  <ErrMsg k="bank_account"/>
                </>)}
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Bank Type</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  {BANK_TYPES.map(b=>(
                    <button key={b} onClick={()=>set("bank_type",b)} className="btn"
                      style={{padding:"8px 10px",background:form.bank_type===b?ACC:"rgba(0,0,0,.05)",color:form.bank_type===b?"#fff":LBL,border:"none",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:SF,textAlign:"left",fontWeight:form.bank_type===b?600:400}}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step===5&&(
          <div style={{textAlign:"center",marginBottom:24}}>
            <div onClick={()=>document.getElementById("avOnboard").click()} className="btn"
              style={{width:160,height:160,borderRadius:"50%",margin:"0 auto 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:`2px dashed ${form.avatar_url?"transparent":errors.avatar_url?"#ff3b30":ACC}`,background:form.avatar_url?`url(${form.avatar_url}) center/cover`:`${ACC}10`}}>
              {!form.avatar_url&&<div style={{textAlign:"center"}}><div style={{fontSize:36,marginBottom:6}}>📸</div><div style={{fontSize:13,color:ACC,fontWeight:600}}>Tap to Upload</div></div>}
            </div>
            <input id="avOnboard" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
            {form.avatar_url&&<button onClick={()=>document.getElementById("avOnboard").click()} className="btn" style={{fontSize:15,color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:SF}}>Change Photo</button>}
            <div style={{fontSize:13,color:errors.avatar_url?"#ff3b30":LB3,marginTop:8,lineHeight:1.6,fontWeight:errors.avatar_url?600:400}}>
              {errors.avatar_url||"Required · Will be shown as a circle"}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:8}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} className="btn" style={{flex:1,padding:"15px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:17,color:LBL,fontFamily:SF}}>Back</button>}
          {step<TOTAL
            ?<button onClick={next} className="btn-primary" style={{flex:2,padding:"15px",background:ACC,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:600,fontFamily:SF}}>Continue →</button>
            :<button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{flex:2,padding:"15px",background:ORG,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:700,fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
              {loading?"Setting up…":"Let's Go! 🚀"}
            </button>
          }
        </div>
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
    el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);
    // Register service worker
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
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
    if(!loginEmail.trim()||!loginPass){setLoginErr("Please enter your email and password");return;}
    setLoginErr("");setLoginLoading(true);
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email:loginEmail.trim(),password:loginPass});
      if(error){setLoginErr(error.message);setLoginLoading(false);return;}
      if(!data?.user){setLoginErr("Login failed. Please try again.");setLoginLoading(false);return;}
      const{data:profileData,error:profileError}=await supabase.from("profiles").select("*").eq("id",data.user.id).single();
      if(profileError||!profileData){setLoginErr("Account setup incomplete. Contact admin.");setLoginLoading(false);return;}
      setProfile(profileData);setLoginLoading(false);
    }catch(err){setLoginErr("Something went wrong: "+err.message);setLoginLoading(false);}
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
        {loginErr&&<div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,fontWeight:500}}>{loginErr}</div>}
        <button onClick={doLogin} disabled={loginLoading} className="btn-primary"
          style={{width:"100%",background:loginLoading?"#e5e5ea":ACC,color:loginLoading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
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
