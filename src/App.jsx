import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import UserApp from"./UserApp";
import AdminApp from"./AdminApp";
import CircleCrop from"./CircleCrop";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,WELCOME,formatIC,getICDigits,formatContact,normalizeContact,validateContact,BANK_TYPES,POSITIONS}from"./constants";

const GLOBAL_CSS=`
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:${BG};font-family:${SF};}
  ::-webkit-scrollbar{display:none;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes barFill{from{width:0}to{width:var(--w)}}
  @keyframes toastIn{from{opacity:0;transform:translateY(10px)scale(.95)}to{opacity:1;transform:translateY(0)scale(1)}}
  @keyframes notifPop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  .fade{animation:fadeUp .28s cubic-bezier(.4,0,.2,1) both}
  .bar{animation:barFill .7s cubic-bezier(.4,0,.2,1) both}
  .toast-in{animation:toastIn .3s cubic-bezier(.34,1.2,.64,1) both}
  .btn{transition:all .15s cubic-bezier(.4,0,.2,1);cursor:pointer;}
  .btn:active{transform:scale(.93);opacity:.85;}
  .btn-primary{transition:all .2s;cursor:pointer;}
  .btn-primary:active{transform:scale(.96);filter:brightness(.9);}
  .tab-btn{transition:all .15s;}
  .tab-btn:active{transform:scale(.88);}
  .card-press{transition:all .12s;}
  .card-press:active{transform:scale(.97);opacity:.9;}
  .notif-dot{animation:notifPop .3s cubic-bezier(.34,1.56,.64,1) both;}
  .pulsing{animation:pulse .9s ease infinite;}
  input,textarea,button,select{font-family:${SF};}
  input[type="date"]{color-scheme:light;}
`;

const DOMAIN="@techwide.com";

// ── DATE HELPERS ──────────────────────────────────────────────────────
const ISOToDisplay=iso=>{
  if(!iso)return"";
  const p=iso.split("-");
  if(p.length===3)return`${p[2]}/${p[1]}/${p[0]}`;
  return iso;
};
const dateToISO=val=>{
  if(!val)return"";
  // Already ISO
  if(/^\d{4}-\d{2}-\d{2}$/.test(val))return val;
  // DD/MM/YYYY
  const p=val.split("/");
  if(p.length===3&&p[2].length===4)
    return`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
  return"";
};

// ── ENSURE PROFILE ────────────────────────────────────────────────────
const ensureProfile=async(user)=>{
  try{
    const{data:ex}=await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
    if(ex)return ex;
    const avatar=(user.email||"").split("@")[0].slice(0,2).toUpperCase()||"??";
    const{data:cr,error}=await supabase.from("profiles").upsert({
      id:user.id,
      name:(user.email||"").split("@")[0],
      email:user.email||"",
      avatar,xp:0,streak:0,badges:[],
      is_admin:false,onboarded:false,contribution_score:0,
    },{onConflict:"id"}).select().single();
    if(error){console.error("Profile error:",error);return null;}
    return cr;
  }catch(err){console.error("ensureProfile:",err);return null;}
};

// ── SIGNUP SCREEN ─────────────────────────────────────────────────────
function SignUpScreen({onBack,onSignedIn}){
  const [prefix,      setPrefix]      = useState("");
  const [pass,        setPass]        = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [formErr,     setFormErr]     = useState({});
  const timerRef=useRef(null);

  const fullEmail  = ()=>`${prefix.trim().toLowerCase()}${DOMAIN}`;
  const validPrefix= v=>/^[a-zA-Z0-9._-]+$/.test(v);
  const passOk     = pass.length>=6;
  const matchOk    = confirm.length>0&&pass===confirm;

  // Live email check — fires 700ms after typing stops
  useEffect(()=>{
    clearTimeout(timerRef.current);
    if(!prefix.trim()||!validPrefix(prefix)){
      setEmailStatus(null);setChecking(false);return;
    }
    setEmailStatus(null);setChecking(true);
    timerRef.current=setTimeout(async()=>{
      const email=fullEmail();
      try{
        const[{data:rpcData,error:rpcErr},{data:profData}]=await Promise.all([
          supabase.rpc("check_email_exists",{check_email:email}),
          supabase.from("profiles").select("id").eq("email",email).maybeSingle(),
        ]);
        setEmailStatus(!rpcErr&&rpcData===true||!!profData?"taken":"available");
      }catch{
        try{
          const{data}=await supabase.from("profiles").select("id").eq("email",email).maybeSingle();
          setEmailStatus(data?"taken":"available");
        }catch{setEmailStatus("error");}
      }
      setChecking(false);
    },700);
    return()=>clearTimeout(timerRef.current);
  },[prefix]);

  const canSubmit=!loading&&!checking&&emailStatus==="available"&&prefix.trim().length>0&&passOk&&matchOk;

  const btnLabel=()=>{
    if(loading)               return"Creating Account…";
    if(checking)              return"Checking email…";
    if(emailStatus==="taken") return"Email already taken ✕";
    if(emailStatus==="error") return"Check failed — retry";
    if(!prefix.trim())        return"Enter your username";
    if(!passOk)               return"Password too short";
    if(!matchOk&&confirm)     return"Passwords don't match";
    if(canSubmit)             return"Create Account";
    return"Fill in all fields";
  };

  const handleSignUp=async()=>{
    if(!canSubmit)return;
    setLoading(true);
    try{
      const email=fullEmail();
      const{data:sd,error:se}=await supabase.auth.signUp({email,password:pass});
      if(se){
        if(se.message.toLowerCase().includes("already"))setEmailStatus("taken");
        else if(se.message.toLowerCase().includes("password"))setFormErr({pass:se.message});
        else setFormErr({general:se.message});
        setLoading(false);return;
      }
      if(!sd?.user){setFormErr({general:"Account creation failed. Please try again."});setLoading(false);return;}
      await supabase.from("profiles").upsert({
        id:sd.user.id,name:prefix.trim(),email,
        avatar:prefix.trim().slice(0,2).toUpperCase(),
        xp:0,streak:0,badges:[],is_admin:false,onboarded:false,contribution_score:0,
      },{onConflict:"id"});
      const{data:sid,error:sie}=await supabase.auth.signInWithPassword({email,password:pass});
      if(sie||!sid?.user){setLoading(false);onBack(email);return;}
      const prof=await ensureProfile(sid.user);
      if(prof)onSignedIn(sid.session,prof);
      else onBack(email);
    }catch(err){setFormErr({general:err.message||"Please try again"});setLoading(false);}
  };

  const emailBorder=
    emailStatus==="taken"    ?"#ff3b30":
    emailStatus==="available"?"#34c759":
    emailStatus==="error"    ?"#ff9500":"#e5e5ea";

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      <div style={{padding:"52px 16px 24px"}}>
        <button onClick={()=>onBack()} className="btn"
          style={{display:"flex",alignItems:"center",gap:6,color:ACC,fontSize:16,fontWeight:600,background:"none",border:"none",marginBottom:24,padding:0}}>
          ← Back to Sign In
        </button>
        <img src="/TECHWIDE_LOGO.png" alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover",marginBottom:16}}/>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginBottom:6}}>First Time Login 👋</div>
        <div style={{fontSize:15,color:LB3,lineHeight:1.6}}>
          Create your Techwide Hub account.<br/>
          Your email will be <strong>yourname{DOMAIN}</strong>
        </div>
      </div>
      <div style={{padding:"0 16px 40px"}}>
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
          {/* Email */}
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>Work Email</div>
              <div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>
            </div>
            <div style={{display:"flex",alignItems:"center",borderRadius:10,overflow:"hidden",border:`1.5px solid ${emailBorder}`,transition:"border-color .2s"}}>
              <input value={prefix}
                onChange={e=>{setPrefix(e.target.value.toLowerCase().replace(/\s/g,""));setFormErr(p=>({...p,prefix:undefined}));}}
                placeholder="name" type="text" autoCapitalize="none" autoCorrect="off"
                style={{flex:1,background:"#f9f9f9",border:"none",outline:"none",fontSize:17,color:LBL,padding:"11px 12px"}}/>
              <div style={{padding:"11px 12px",background:ACC,color:"#fff",fontSize:15,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{DOMAIN}</div>
            </div>
            {prefix&&<div style={{fontSize:13,marginTop:6,color:LB3}}>Full email: <span style={{color:ACC,fontWeight:600}}>{fullEmail()}</span></div>}
            {prefix&&validPrefix(prefix)&&(
              <div style={{fontSize:12,marginTop:6,fontWeight:500,display:"flex",alignItems:"center",gap:6,minHeight:18}}>
                {checking&&<><div className="pulsing" style={{width:7,height:7,borderRadius:"50%",background:"#ff9500",flexShrink:0}}/><span style={{color:"#ff9500"}}>Checking availability…</span></>}
                {!checking&&emailStatus==="available"&&<span style={{color:"#34c759"}}>✓ Email is available</span>}
                {!checking&&emailStatus==="taken"&&<span style={{color:"#ff3b30"}}>✕ Already registered — please sign in instead</span>}
                {!checking&&emailStatus==="error"&&<span style={{color:"#ff9500"}}>⚠️ Could not verify — please try again</span>}
              </div>
            )}
          </div>
          {/* Password */}
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>Password</div>
              <div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>
            </div>
            <input value={pass} onChange={e=>{setPass(e.target.value);setFormErr(p=>({...p,pass:undefined}));}}
              placeholder="Minimum 6 characters" type="password" autoComplete="new-password"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
            {pass&&(
              <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
                {[{label:"6+ chars",ok:pass.length>=6},{label:"Uppercase",ok:/[A-Z]/.test(pass)},{label:"Number",ok:/[0-9]/.test(pass)}].map(x=>(
                  <div key={x.label} style={{background:x.ok?"#34c75918":"rgba(0,0,0,.06)",color:x.ok?"#34c759":LB3,fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{x.ok?"✓ ":""}{x.label}</div>
                ))}
              </div>
            )}
            {formErr.pass&&<div style={{fontSize:12,color:"#ff3b30",marginTop:5,fontWeight:500}}>{formErr.pass}</div>}
          </div>
          {/* Confirm */}
          <div style={{padding:"11px 16px"}}>
            <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>Confirm Password</div>
              <div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>
            </div>
            <input value={confirm} onChange={e=>{setConfirm(e.target.value);setFormErr(p=>({...p,confirm:undefined}));}}
              placeholder="Re-enter your password" type="password" autoComplete="new-password"
              onKeyDown={e=>e.key==="Enter"&&canSubmit&&handleSignUp()}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
            {confirm&&matchOk&&passOk&&<div style={{fontSize:12,color:"#34c759",marginTop:5,fontWeight:500}}>✓ Passwords match</div>}
            {confirm&&!matchOk&&<div style={{fontSize:12,color:"#ff3b30",marginTop:5,fontWeight:500}}>✕ Passwords do not match</div>}
          </div>
        </div>
        {formErr.general&&<div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,fontWeight:500,background:"#ff3b3010",borderRadius:10,padding:"10px 14px"}}>{formErr.general}</div>}
        <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:20,fontSize:13,color:ACC,lineHeight:1.7}}>
          📋 After creating your account, you'll be guided through profile setup — name, position, contact info and more.
        </div>
        <button onClick={handleSignUp} disabled={!canSubmit} className="btn-primary"
          style={{width:"100%",background:canSubmit?ACC:"#e5e5ea",color:canSubmit?"#fff":LB3,border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:canSubmit?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:12,transition:"all .2s"}}>
          {loading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          {btnLabel()}
        </button>
        <div style={{textAlign:"center",fontSize:13,color:LB3}}>
          Already have an account?{" "}
          <button onClick={()=>onBack()} className="btn" style={{color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontSize:13}}>Sign In</button>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING ─────────────────────────────────────────────────────────
function OnboardingFlow({user,onComplete}){
  const [step,   setStep]   = useState(1);
  const [errors, setErrors] = useState({});
  const [form,   setForm]   = useState({
    name:user.name||"",
    nickname:"",
    position:"",
    birthday:"",
    joined_date:"",
    contact_number:"",
    bio:"",
    hobby:"",
    favorite_food:"",
    ic_number:"",
    epf_number:"",
    bank_account:"",
    bank_type:"Maybank",
    bank_type_other:"",
    avatar_url:"",
  });
  const [loading,  setLoading]  = useState(false);
  const [rawImg,   setRawImg]   = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const TOTAL=5;
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const clearErr=k=>setErrors(p=>({...p,[k]:undefined}));

  const validate=()=>{
    const e={};
    if(step===1){
      if(!form.name.trim())       e.name="Full name is required";
      if(!form.position)          e.position="Please select your position";
      if(!form.birthday)          e.birthday="Birthday is required";
      if(!form.joined_date)       e.joined_date="Joining date is required";
    }
    if(step===2){
      if(!form.contact_number)    e.contact_number="Contact number is required";
      else if(!validateContact(form.contact_number))
                                  e.contact_number="Enter a valid Malaysian number";
    }
    if(step===4){
      const digits=getICDigits(form.ic_number);
      if(!form.ic_number)         e.ic_number="IC number is required";
      else if(digits.length!==12) e.ic_number="IC must be exactly 12 digits";
      if(!form.epf_number.trim()) e.epf_number="EPF number is required";
      if(form.bank_account&&!/^\d+$/.test(form.bank_account))
                                  e.bank_account="Numbers only";
      if(form.bank_type==="Others"&&!form.bank_type_other.trim())
                                  e.bank_type_other="Please specify your bank";
    }
    if(step===5){
      if(!form.avatar_url)        e.avatar_url="Profile photo is required";
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
    try{
      const contact=normalizeContact(form.contact_number);
      const finalBankType=form.bank_type==="Others"?form.bank_type_other:form.bank_type;
      const birthdayISO  = dateToISO(form.birthday);
      const joinedISO    = dateToISO(form.joined_date);
      const payload={
        ...form,
        contact_number:contact,
        birthday:birthdayISO,
        joined_date:joinedISO,
        bank_type:finalBankType,
        onboarded:true,
        role:form.position,
      };
      delete payload.bank_type_other;
      await supabase.from("profiles").update(payload).eq("id",user.id);
      const reqs=[];
      if(form.ic_number)    reqs.push({user_id:user.id,field_name:"ic_number",   field_value:form.ic_number,   status:"Pending"});
      if(form.epf_number)   reqs.push({user_id:user.id,field_name:"epf_number",  field_value:form.epf_number,  status:"Pending"});
      if(form.bank_account) reqs.push({user_id:user.id,field_name:"bank_account",field_value:form.bank_account,extra_value:finalBankType,status:"Pending"});
      reqs.push({user_id:user.id,field_name:"position",   field_value:form.position, status:"Pending"});
      reqs.push({user_id:user.id,field_name:"joined_date",field_value:joinedISO,      status:"Pending"});
      if(reqs.length>0)await supabase.from("verification_requests").insert(reqs);
      for(const msg of WELCOME){
        await supabase.from("messages").insert({
          user_id:user.id,sender_name:"Techwide Hub",
          sender_avatar:"TW",content:msg,is_system:true,
        });
      }
      onComplete();
    }catch(err){console.error("Onboarding error:",err);}
    setLoading(false);
  };

  const ErrMsg=({k})=>errors[k]
    ?<div style={{fontSize:12,color:"#ff3b30",marginTop:4,fontWeight:500,lineHeight:1.4}}>{errors[k]}</div>
    :null;

  const FW=(label,children,last=false,required=false)=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
        <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>{label}</div>
        {required&&<div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>}
      </div>
      {children}
    </div>
  );

  const TI=(k,ph,type="text")=>(
    <input value={form[k]} onChange={e=>{set(k,e.target.value);clearErr(k);}} placeholder={ph} type={type}
      style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
  );

  // ── Calendar date picker — stores as DD/MM/YYYY ──
  const DateInp=(k)=>(
    <input
      type="date"
      value={dateToISO(form[k])||""}
      onChange={e=>{
        const iso=e.target.value;
        set(k,ISOToDisplay(iso));
        clearErr(k);
      }}
      style={{
        width:"100%",background:"transparent",border:"none",
        outline:"none",fontSize:17,
        color:form[k]?LBL:LB3,
        cursor:"pointer",
      }}
    />
  );

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      {showCrop&&rawImg&&(
        <CircleCrop
          src={rawImg}
          onCrop={url=>{set("avatar_url",url);clearErr("avatar_url");setShowCrop(false);setRawImg(null);}}
          onCancel={()=>{setShowCrop(false);setRawImg(null);}}
        />
      )}

      <div style={{padding:"52px 16px 24px"}}>
        <img src="/TECHWIDE_LOGO.png" alt="" style={{width:36,height:36,borderRadius:8,objectFit:"cover",marginBottom:16}}/>
        <div style={{fontSize:13,color:LB3,marginBottom:6}}>Step {step} of {TOTAL}</div>
        <div style={{background:SEP,borderRadius:99,height:4,overflow:"hidden",marginBottom:24}}>
          <div style={{width:`${(step/TOTAL)*100}%`,height:"100%",background:ACC,borderRadius:99,transition:"width .3s"}}/>
        </div>
        <div style={{fontSize:25,fontWeight:700,color:LBL,letterSpacing:"-.6px",lineHeight:1.2,marginBottom:6}}>
          {step===1&&"Let's set up your profile 👋"}
          {step===2&&"Contact details 📱"}
          {step===3&&"Tell us about yourself ✨"}
          {step===4&&"Private information 🔒"}
          {step===5&&"Profile photo 📸"}
        </div>
        <div style={{fontSize:14,color:LB3,marginBottom:20,lineHeight:1.5}}>
          {step===1&&"Basic info visible to your team"}
          {step===2&&"How your team can reach you"}
          {step===3&&"Your personality and interests"}
          {step===4&&"Admin only — kept secure & confidential"}
          {step===5&&"A clear photo helps your team recognise you"}
        </div>
      </div>

      <div style={{padding:"0 16px 24px"}}>

        {/* ── Step 1 — Basic Info ── */}
        {step===1&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>

            {/* Full Name */}
            {FW("Full Name",<>{TI("name","Ahmad Farid")}<ErrMsg k="name"/></>,false,true)}

            {/* Nickname */}
            {FW("Nickname",TI("nickname","e.g. Farid"))}

            {/* Position — Dropdown */}
            {FW("Position",
              <>
                <div style={{position:"relative"}}>
                  <select
                    value={form.position}
                    onChange={e=>{set("position",e.target.value);clearErr("position");}}
                    style={{
                      width:"100%",background:"transparent",border:"none",outline:"none",
                      fontSize:17,color:form.position?LBL:LB3,
                      appearance:"none",WebkitAppearance:"none",
                      paddingRight:24,cursor:"pointer",
                    }}>
                    <option value="" disabled>Select your position…</option>
                    {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",fontSize:14,color:LB3,pointerEvents:"none"}}>▾</div>
                </div>
                <ErrMsg k="position"/>
              </>,false,true)}

            {/* Birthday — Calendar picker */}
            {FW("Birthday",
              <>
                {DateInp("birthday")}
                {form.birthday&&(
                  <div style={{fontSize:12,color:"#34c759",marginTop:4,fontWeight:500}}>
                    ✓ {form.birthday}
                  </div>
                )}
                <ErrMsg k="birthday"/>
              </>,false,true)}

            {/* Joining Date — Calendar picker */}
            {FW("Joining Date",
              <>
                {DateInp("joined_date")}
                {form.joined_date&&(
                  <div style={{fontSize:12,color:"#34c759",marginTop:4,fontWeight:500}}>
                    ✓ {form.joined_date}
                  </div>
                )}
                <ErrMsg k="joined_date"/>
              </>,true,true)}
          </div>
        )}

        {/* ── Step 2 — Contact ── */}
        {step===2&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              📱 Numbers only — no spaces or dashes<br/>
              Example: <strong>0123456789</strong> or <strong>01112345678</strong>
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
              {FW("Contact Number",
                <>
                  <input value={form.contact_number}
                    onChange={e=>{set("contact_number",e.target.value.replace(/\D/g,""));clearErr("contact_number");}}
                    placeholder="0123456789" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
                  {form.contact_number&&(
                    <div style={{fontSize:13,color:ACC,marginTop:4,fontWeight:500}}>
                      Preview: {formatContact(normalizeContact(form.contact_number))}
                    </div>
                  )}
                  <ErrMsg k="contact_number"/>
                </>,true,true)}
            </div>
          </>
        )}

        {/* ── Step 3 — About ── */}
        {step===3&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
              <textarea value={form.bio} onChange={e=>set("bio",e.target.value)}
                placeholder="Describe about yourself in short..."
                rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",lineHeight:1.45,fontFamily:SF}}/>
            </div>
            {FW("Hobby",TI("hobby","e.g. Gaming, Reading"))}
            {FW("Favourite Food",TI("favorite_food","e.g. Nasi Lemak"),true)}
          </div>
        )}

        {/* ── Step 4 — Private Info ── */}
        {step===4&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              🔒 Only visible to admin.<br/>
              IC, EPF & Bank require admin verification.
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>

              {/* IC Number */}
              {FW("IC Number",
                <>
                  <input value={form.ic_number}
                    onChange={e=>{set("ic_number",formatIC(e.target.value));clearErr("ic_number");}}
                    placeholder="XXXXXX-XX-XXXX"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,letterSpacing:1}}/>
                  <div style={{fontSize:12,color:getICDigits(form.ic_number).length===12?"#34c759":LB3,marginTop:4}}>
                    {getICDigits(form.ic_number).length}/12 digits {getICDigits(form.ic_number).length===12&&"✓"}
                  </div>
                  <ErrMsg k="ic_number"/>
                </>,false,true)}

              {/* EPF Number — Required */}
              {FW("EPF Number",
                <>
                  <input value={form.epf_number}
                    onChange={e=>{set("epf_number",e.target.value.replace(/\D/g,""));clearErr("epf_number");}}
                    placeholder="XXXXXXXXXXXX" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
                  <ErrMsg k="epf_number"/>
                </>,false,true)}

              {/* Bank Account */}
              {FW("Bank Account Number",
                <>
                  <input value={form.bank_account}
                    onChange={e=>{set("bank_account",e.target.value.replace(/\D/g,""));clearErr("bank_account");}}
                    placeholder="Numbers only" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
                  <ErrMsg k="bank_account"/>
                </>)}

              {/* Bank Type — Dropdown */}
              <div style={{padding:"11px 16px",borderBottom:form.bank_type==="Others"?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Bank Type</div>
                <div style={{position:"relative"}}>
                  <select
                    value={form.bank_type}
                    onChange={e=>{set("bank_type",e.target.value);clearErr("bank_type_other");}}
                    style={{
                      width:"100%",background:"transparent",border:`1px solid ${SEP}`,
                      borderRadius:9,padding:"10px 32px 10px 12px",
                      fontSize:16,color:LBL,
                      appearance:"none",WebkitAppearance:"none",
                      cursor:"pointer",outline:"none",
                    }}>
                    {BANK_TYPES.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                  <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:LB3,pointerEvents:"none"}}>▾</div>
                </div>
              </div>

              {/* If Others — free text */}
              {form.bank_type==="Others"&&(
                <div style={{padding:"11px 16px"}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>
                    Specify Bank Name <span style={{color:"#ff3b30"}}>*</span>
                  </div>
                  <input value={form.bank_type_other}
                    onChange={e=>{set("bank_type_other",e.target.value);clearErr("bank_type_other");}}
                    placeholder="Enter your bank name"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
                  <ErrMsg k="bank_type_other"/>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 5 — Photo ── */}
        {step===5&&(
          <div style={{textAlign:"center",marginBottom:24}}>
            <div onClick={()=>document.getElementById("avOnboard").click()} className="btn"
              style={{width:160,height:160,borderRadius:"50%",margin:"0 auto 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:`2px dashed ${form.avatar_url?"transparent":errors.avatar_url?"#ff3b30":ACC}`,background:form.avatar_url?`url(${form.avatar_url}) center/cover`:`${ACC}10`}}>
              {!form.avatar_url&&(
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:6}}>📸</div>
                  <div style={{fontSize:13,color:ACC,fontWeight:600}}>Tap to Upload</div>
                </div>
              )}
            </div>
            <input id="avOnboard" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
            {form.avatar_url&&(
              <button onClick={()=>document.getElementById("avOnboard").click()} className="btn"
                style={{fontSize:15,color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer"}}>
                Change Photo
              </button>
            )}
            <div style={{fontSize:13,color:errors.avatar_url?"#ff3b30":LB3,marginTop:8,lineHeight:1.6,fontWeight:errors.avatar_url?600:400}}>
              {errors.avatar_url||"Required · Will be displayed as a circle"}
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          {step>1&&(
            <button onClick={()=>setStep(s=>s-1)} className="btn"
              style={{flex:1,padding:"15px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:17,color:LBL}}>
              Back
            </button>
          )}
          {step<TOTAL
            ?<button onClick={next} className="btn-primary"
                style={{flex:2,padding:"15px",background:ACC,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:600}}>
                Continue →
              </button>
            :<button onClick={handleSubmit} disabled={loading} className="btn-primary"
                style={{flex:2,padding:"15px",background:ORG,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {loading?"Setting up…":"Let's Go! 🚀"}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────
export default function App(){
  const [session,      setSession]      = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [screen,       setScreen]       = useState("login");
  const [loginEmail,   setLoginEmail]   = useState("");
  const [loginPass,    setLoginPass]    = useState("");
  const [loginErr,     setLoginErr]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);
    if("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    return()=>document.head.removeChild(el);
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if(session)loadUserProfile(session);
      else setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s);
      if(!s){setProfile(null);setLoading(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadUserProfile=async(sess)=>{
    setLoading(true);
    try{
      const p=await ensureProfile(sess.user);
      if(p)setProfile(p);
      else await supabase.auth.signOut();
    }catch(err){
      console.error("Load profile error:",err);
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  const doLogin=async()=>{
    if(!loginEmail.trim()){setLoginErr("Please enter your email");return;}
    if(!loginPass){setLoginErr("Please enter your password");return;}
    setLoginErr("");setLoginLoading(true);
    try{
      const{data,error}=await supabase.auth.signInWithPassword({
        email:loginEmail.trim().toLowerCase(),
        password:loginPass,
      });
      if(error){
        const msg=error.message.toLowerCase();
        if(msg.includes("invalid login")||msg.includes("invalid credentials"))
          setLoginErr("Incorrect email or password. Please try again.");
        else if(msg.includes("email not confirmed"))
          setLoginErr("Email not confirmed. Please contact your admin.");
        else
          setLoginErr(error.message);
        setLoginLoading(false);return;
      }
      if(!data?.user){setLoginErr("Login failed. Please try again.");setLoginLoading(false);return;}
      const p=await ensureProfile(data.user);
      if(!p){setLoginErr("Could not load your profile. Please contact admin.");setLoginLoading(false);return;}
      setSession(data.session);
      setProfile(p);
      setLoginLoading(false);
    }catch(err){
      setLoginErr("Connection error. Please check your internet and try again.");
      setLoginLoading(false);
    }
  };

  // ── Loading ──
  if(loading)return(
    <div style={{minHeight:"100vh",background:ACC,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:SF}}>
      <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover"}}/>
      <div style={{width:24,height:24,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  // ── Sign Up ──
  if(screen==="signup")return(
    <SignUpScreen
      onBack={(prefillEmail)=>{
        if(prefillEmail)setLoginEmail(prefillEmail);
        setScreen("login");
      }}
      onSignedIn={(sess,prof)=>{
        setSession(sess);
        setProfile(prof);
        setScreen("login");
      }}
    />
  );

  // ── Login ──
  if(!session||!profile)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
      <div className="fade" style={{textAlign:"center",marginBottom:36}}>
        <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover",margin:"0 auto 16px",display:"block",boxShadow:"0 8px 28px rgba(28,50,88,.2)"}}/>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px"}}>Techwide Hub</div>
        <div style={{fontSize:13,color:LB3,marginTop:8,lineHeight:2}}>
          Sincerity · Love · Responsible · Respectful
        </div>
      </div>
      <div className="fade" style={{width:"100%",maxWidth:360}}>
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email</div>
            <input value={loginEmail}
              onChange={e=>{setLoginEmail(e.target.value);setLoginErr("");}}
              placeholder="name@techwide.com" type="email" autoComplete="email"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
          </div>
          <div style={{padding:"11px 16px"}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password</div>
            <input value={loginPass}
              onChange={e=>{setLoginPass(e.target.value);setLoginErr("");}}
              placeholder="Password" type="password" autoComplete="current-password"
              onKeyDown={e=>e.key==="Enter"&&doLogin()}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL}}/>
          </div>
        </div>
        {loginErr&&(
          <div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,fontWeight:500,background:"#ff3b3010",borderRadius:10,padding:"10px 14px",lineHeight:1.5}}>
            {loginErr}
          </div>
        )}
        <button onClick={doLogin} disabled={loginLoading} className="btn-primary"
          style={{width:"100%",background:loginLoading?"#e5e5ea":ACC,color:loginLoading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
          {loginLoading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          {loginLoading?"Signing In…":"Sign In"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{flex:1,height:1,background:SEP}}/>
          <div style={{fontSize:12,color:LB3}}>or</div>
          <div style={{flex:1,height:1,background:SEP}}/>
        </div>
        <button onClick={()=>setScreen("signup")} className="btn-primary"
          style={{width:"100%",background:"transparent",color:ACC,border:`1.5px solid ${ACC}`,borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          🆕 First Time Login
        </button>
        <div style={{textAlign:"center",fontSize:12,color:LB3,marginTop:14,lineHeight:1.6}}>
          By signing in you agree to our<br/>company policies and code of conduct
        </div>
      </div>
    </div>
  );

  // ── Onboarding ──
  if(!profile.onboarded)return(
    <OnboardingFlow
      user={profile}
      onComplete={async()=>{
        const{data:updated}=await supabase.from("profiles").select("*").eq("id",profile.id).single();
        if(updated)setProfile(updated);
      }}
    />
  );

  // ── Main App ──
  if(profile.is_admin)return<AdminApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
  return<UserApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
}
