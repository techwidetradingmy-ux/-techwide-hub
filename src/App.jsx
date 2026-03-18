import{useState,useEffect}from"react";
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
  .notif-dot{animation:notifPop .3s cubic-bezier(.34,1.56,.64,1) both;}
  input,textarea,button{font-family:${SF};}
`;

// ── EMAIL VALIDATION ────────────────────────────────────────────────────
const validateEmail=email=>{
  const re=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

// ── SIGN UP SCREEN ──────────────────────────────────────────────────────
function SignUpScreen({onBack,onSuccess}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [confirm,setConfirm]=useState("");
  const [errors,setErrors]=useState({});
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);

  const validate=()=>{
    const e={};
    if(!email.trim())e.email="Email is required";
    else if(!validateEmail(email))e.email="Please enter a valid email address";
    if(!pass)e.pass="Password is required";
    else if(pass.length<6)e.pass="Password must be at least 6 characters";
    if(!confirm)e.confirm="Please confirm your password";
    else if(pass!==confirm)e.confirm="Passwords do not match";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSignUp=async()=>{
    if(!validate())return;
    setLoading(true);
    try{
      // Create auth account
      const{data,error}=await supabase.auth.signUp({
        email:email.trim().toLowerCase(),
        password:pass
      });
      if(error){
        if(error.message.includes("already registered")){
          setErrors({email:"This email is already registered. Please sign in."});
        } else {
          setErrors({email:error.message});
        }
        setLoading(false);
        return;
      }
      if(data?.user){
        // Create basic profile
        const avatar=email.trim().split("@")[0].slice(0,2).toUpperCase();
        await supabase.from("profiles").insert({
          id:data.user.id,
          name:email.trim().split("@")[0],
          avatar,
          xp:0,
          streak:0,
          badges:[],
          is_admin:false,
          onboarded:false,
          contribution_score:0
        });
        // Confirm email immediately (internal app)
        await supabase.rpc("confirm_user_email",{user_id:data.user.id}).catch(()=>{});
      }
      setDone(true);
      setLoading(false);
    }catch(err){
      setErrors({email:"Something went wrong. Please try again."});
      setLoading(false);
    }
  };

  const ErrMsg=({k})=>errors[k]
    ?<div style={{fontSize:12,color:"#ff3b30",marginTop:5,fontWeight:500,paddingLeft:2}}>{errors[k]}</div>
    :null;

  if(done)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
      <div className="fade" style={{textAlign:"center",maxWidth:360,width:"100%"}}>
        <div style={{fontSize:64,marginBottom:20}}>🎉</div>
        <div style={{fontSize:24,fontWeight:700,color:LBL,letterSpacing:"-.5px",marginBottom:10}}>Account Created!</div>
        <div style={{fontSize:15,color:LB3,lineHeight:1.7,marginBottom:32}}>
          Your account has been created successfully.<br/>
          Sign in now to complete your profile setup.
        </div>
        <button onClick={()=>onSuccess(email.trim().toLowerCase())} className="btn-primary"
          style={{width:"100%",background:ACC,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
          Sign In Now →
        </button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      {/* Header */}
      <div style={{padding:"56px 16px 24px"}}>
        <button onClick={onBack} className="btn"
          style={{display:"flex",alignItems:"center",gap:6,color:ACC,fontSize:16,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:SF,marginBottom:20}}>
          ← Back
        </button>
        <img src="/TECHWIDE_LOGO.png" alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover",marginBottom:16}}/>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginBottom:6}}>
          First Time? 👋
        </div>
        <div style={{fontSize:15,color:LB3,lineHeight:1.6}}>
          Create your Techwide Hub account.<br/>
          You'll set up your full profile after signing in.
        </div>
      </div>

      <div style={{padding:"0 16px 40px"}}>
        {/* Email field */}
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>
              Work Email <span style={{color:"#ff3b30"}}>*</span>
            </div>
            <input
              value={email}
              onChange={e=>{setEmail(e.target.value);setErrors(p=>({...p,email:undefined}));}}
              placeholder="yourname@techwide.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}
            />
            <ErrMsg k="email"/>
            {email&&!errors.email&&validateEmail(email)&&(
              <div style={{fontSize:12,color:"#34c759",marginTop:5,fontWeight:500}}>✓ Valid email</div>
            )}
          </div>

          {/* Password field */}
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>
              Password <span style={{color:"#ff3b30"}}>*</span>
            </div>
            <input
              value={pass}
              onChange={e=>{setPass(e.target.value);setErrors(p=>({...p,pass:undefined}));}}
              placeholder="Minimum 6 characters"
              type="password"
              autoComplete="new-password"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}
            />
            {pass&&<div style={{display:"flex",gap:4,marginTop:6}}>
              {[
                {label:"6+ chars",   ok:pass.length>=6},
                {label:"Uppercase",  ok:/[A-Z]/.test(pass)},
                {label:"Number",     ok:/[0-9]/.test(pass)},
              ].map(x=>(
                <div key={x.label} style={{background:x.ok?"#34c75918":"rgba(0,0,0,.06)",color:x.ok?"#34c759":LB3,fontSize:11,fontWeight:600,padding:"3px 7px",borderRadius:99}}>
                  {x.ok?"✓":""} {x.label}
                </div>
              ))}
            </div>}
            <ErrMsg k="pass"/>
          </div>

          {/* Confirm password */}
          <div style={{padding:"11px 16px"}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>
              Confirm Password <span style={{color:"#ff3b30"}}>*</span>
            </div>
            <input
              value={confirm}
              onChange={e=>{setConfirm(e.target.value);setErrors(p=>({...p,confirm:undefined}));}}
              placeholder="Re-enter your password"
              type="password"
              autoComplete="new-password"
              onKeyDown={e=>e.key==="Enter"&&handleSignUp()}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}
            />
            {confirm&&pass===confirm&&<div style={{fontSize:12,color:"#34c759",marginTop:5,fontWeight:500}}>✓ Passwords match</div>}
            <ErrMsg k="confirm"/>
          </div>
        </div>

        {/* Info note */}
        <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:20,fontSize:13,color:ACC,lineHeight:1.7}}>
          📋 After creating your account, you'll be guided through a <strong>setup process</strong> to complete your profile — including your name, position, contact details and more.
        </div>

        {/* Sign Up button */}
        <button onClick={handleSignUp} disabled={loading} className="btn-primary"
          style={{width:"100%",background:loading?"#e5e5ea":ACC,color:loading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:loading?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
          {loading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          {loading?"Creating Account…":"Create Account"}
        </button>

        <div style={{textAlign:"center",fontSize:13,color:LB3,marginTop:16}}>
          Already have an account?{" "}
          <button onClick={onBack} className="btn" style={{color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:SF,fontSize:13}}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING ──────────────────────────────────────────────────────────
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
      if(!form.position)e.position="Please select your position";
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

  const ErrMsg=({k})=>errors[k]
    ?<div style={{fontSize:12,color:"#ff3b30",marginTop:4,fontWeight:500}}>{errors[k]}</div>
    :null;

  const FieldWrap=(label,children,last=false,required=false)=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
        <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>{label}</div>
        {required&&<div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>}
      </div>
      {children}
    </div>
  );

  const TextInp=(k,ph,type="text")=>(
    <input value={form[k]} onChange={e=>{set(k,e.target.value);clearErr(k);}} placeholder={ph} type={type}
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
        {/* Step 1 — Basic Info */}
        {step===1&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            {FieldWrap("Full Name",
              <>{TextInp("name","Ahmad Farid")}<ErrMsg k="name"/></>,
              false,true)}
            {FieldWrap("Nickname",TextInp("nickname","e.g. Farid"),false,false)}
            {FieldWrap("Position",
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:4}}>
                  {POSITIONS.map(p=>(
                    <button key={p} onClick={()=>{set("position",p);clearErr("position");}} className="btn"
                      style={{padding:"8px 10px",background:form.position===p?ACC:"rgba(0,0,0,.05)",color:form.position===p?"#fff":LBL,border:form.position===p?"none":`1px solid ${SEP}`,borderRadius:8,fontSize:12,fontFamily:SF,textAlign:"left",fontWeight:form.position===p?600:400,cursor:"pointer"}}>
                      {p}
                    </button>
                  ))}
                </div>
                <ErrMsg k="position"/>
              </>,false,true)}
            {FieldWrap("Birthday",
              <>{TextInp("birthday","","date")}<ErrMsg k="birthday"/></>,
              false,true)}
            {FieldWrap("Joining Date",TextInp("joined_date","","date"),true,false)}
          </div>
        )}

        {/* Step 2 — Contact */}
        {step===2&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              📱 Enter numbers only — no spaces or dashes<br/>
              Example: <strong>0123456789</strong> or <strong>01112345678</strong>
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
              {FieldWrap("Contact Number",
                <>
                  <input value={form.contact_number}
                    onChange={e=>{set("contact_number",e.target.value.replace(/\D/g,''));clearErr("contact_number");}}
                    placeholder="0123456789" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                  {form.contact_number&&<div style={{fontSize:13,color:ACC,marginTop:4,fontWeight:500}}>
                    Preview: {formatContact(normalizeContact(form.contact_number))}
                  </div>}
                  <ErrMsg k="contact_number"/>
                </>,true,true)}
            </div>
          </>
        )}

        {/* Step 3 — About */}
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

        {/* Step 4 — Private Info */}
        {step===4&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              🔒 Only visible to admin.<br/>
              IC, EPF & Bank require admin verification before showing as verified.
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
              {FieldWrap("IC Number",
                <>
                  <input value={form.ic_number}
                    onChange={e=>{set("ic_number",formatIC(e.target.value));clearErr("ic_number");}}
                    placeholder="XXXXXX-XX-XXXX"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF,letterSpacing:1}}/>
                  <div style={{fontSize:12,color:getICDigits(form.ic_number).length===12?"#34c759":LB3,marginTop:4}}>
                    {getICDigits(form.ic_number).length}/12 digits {getICDigits(form.ic_number).length===12&&"✓"}
                  </div>
                  <ErrMsg k="ic_number"/>
                </>,false,true)}
              {FieldWrap("EPF Number",TextInp("epf_number","XXXXXXXXXXXX"))}
              {FieldWrap("Bank Account Number",
                <>
                  <input value={form.bank_account}
                    onChange={e=>{set("bank_account",e.target.value.replace(/\D/g,''));clearErr("bank_account");}}
                    placeholder="Numbers only" type="tel"
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                  <ErrMsg k="bank_account"/>
                </>)}
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Bank Type</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  {BANK_TYPES.map(b=>(
                    <button key={b} onClick={()=>set("bank_type",b)} className="btn"
                      style={{padding:"8px 10px",background:form.bank_type===b?ACC:"rgba(0,0,0,.05)",color:form.bank_type===b?"#fff":LBL,border:form.bank_type===b?"none":`1px solid ${SEP}`,borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:SF,textAlign:"left",fontWeight:form.bank_type===b?600:400}}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 5 — Photo */}
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
                style={{fontSize:15,color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:SF}}>
                Change Photo
              </button>
            )}
            <div style={{fontSize:13,color:errors.avatar_url?"#ff3b30":LB3,marginTop:8,lineHeight:1.6,fontWeight:errors.avatar_url?600:400}}>
              {errors.avatar_url||"Required · Will be displayed as a circle"}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          {step>1&&(
            <button onClick={()=>setStep(s=>s-1)} className="btn"
              style={{flex:1,padding:"15px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:17,color:LBL,fontFamily:SF}}>
              Back
            </button>
          )}
          {step<TOTAL
            ?<button onClick={next} className="btn-primary"
                style={{flex:2,padding:"15px",background:ACC,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:600,fontFamily:SF}}>
                Continue →
              </button>
            :<button onClick={handleSubmit} disabled={loading} className="btn-primary"
                style={{flex:2,padding:"15px",background:ORG,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:700,fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {loading?"Setting up…":"Let's Go! 🚀"}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────────────────
export default function App(){
  const [session,   setSession]   = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [screen,    setScreen]    = useState("login"); // login | signup
  const [loginEmail,setLoginEmail]= useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr,  setLoginErr]  = useState("");
  const [loginLoading,setLoginLoading]=useState(false);

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);
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
    // Validate email format
    if(!loginEmail.trim()){setLoginErr("Please enter your email");return;}
    if(!validateEmail(loginEmail)){setLoginErr("Please enter a valid email address");return;}
    if(!loginPass){setLoginErr("Please enter your password");return;}
    setLoginErr("");setLoginLoading(true);
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email:loginEmail.trim(),password:loginPass});
      if(error){
        if(error.message.includes("Invalid login"))setLoginErr("Incorrect email or password. Please try again.");
        else if(error.message.includes("Email not confirmed"))setLoginErr("Email not confirmed. Contact your admin.");
        else setLoginErr(error.message);
        setLoginLoading(false);return;
      }
      if(!data?.user){setLoginErr("Login failed. Please try again.");setLoginLoading(false);return;}
      const{data:profileData,error:profileError}=await supabase.from("profiles").select("*").eq("id",data.user.id).single();
      if(profileError||!profileData){setLoginErr("Account setup incomplete. Contact admin.");setLoginLoading(false);return;}
      setProfile(profileData);setLoginLoading(false);
    }catch(err){setLoginErr("Something went wrong: "+err.message);setLoginLoading(false);}
  };

  // Loading screen
  if(loading)return(
    <div style={{minHeight:"100vh",background:ACC,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:SF}}>
      <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover"}}/>
      <div style={{width:24,height:24,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  // Sign Up screen
  if(screen==="signup")return(
    <SignUpScreen
      onBack={()=>setScreen("login")}
      onSuccess={prefillEmail=>{
        setLoginEmail(prefillEmail);
        setScreen("login");
      }}
    />
  );

  // Login screen
  if(!session||!profile)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
      <div className="fade" style={{textAlign:"center",marginBottom:36}}>
        <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover",margin:"0 auto 16px",display:"block",boxShadow:"0 8px 28px rgba(28,50,88,.2)"}}/>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px"}}>Techwide Hub</div>
        <div style={{fontSize:13,color:LB3,marginTop:8,lineHeight:2}}>Sincerity · Love · Responsible · Respectful</div>
      </div>

      <div className="fade" style={{width:"100%",maxWidth:360}}>
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
          {/* Email */}
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email</div>
            <input value={loginEmail}
              onChange={e=>{setLoginEmail(e.target.value);setLoginErr("");}}
              placeholder="your@email.com" type="email" autoComplete="email"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            {loginEmail&&!validateEmail(loginEmail)&&(
              <div style={{fontSize:12,color:"#ff9500",marginTop:4}}>Please enter a valid email</div>
            )}
            {loginEmail&&validateEmail(loginEmail)&&(
              <div style={{fontSize:12,color:"#34c759",marginTop:4}}>✓ Valid email</div>
            )}
          </div>
          {/* Password */}
          <div style={{padding:"11px 16px"}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password</div>
            <input value={loginPass}
              onChange={e=>{setLoginPass(e.target.value);setLoginErr("");}}
              placeholder="Password" type="password" autoComplete="current-password"
              onKeyDown={e=>e.key==="Enter"&&doLogin()}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
          </div>
        </div>

        {loginErr&&(
          <div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,fontWeight:500,background:"#ff3b3010",borderRadius:10,padding:"10px 14px"}}>
            {loginErr}
          </div>
        )}

        {/* Sign In button */}
        <button onClick={doLogin} disabled={loginLoading} className="btn-primary"
          style={{width:"100%",background:loginLoading?"#e5e5ea":ACC,color:loginLoading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF,marginBottom:10}}>
          {loginLoading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          {loginLoading?"Signing In…":"Sign In"}
        </button>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{flex:1,height:1,background:SEP}}/>
          <div style={{fontSize:12,color:LB3}}>or</div>
          <div style={{flex:1,height:1,background:SEP}}/>
        </div>

        {/* First Time Login button */}
        <button onClick={()=>setScreen("signup")} className="btn-primary"
          style={{width:"100%",background:"transparent",color:ACC,border:`1.5px solid ${ACC}`,borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          🆕 First Time Login
        </button>

        <div style={{textAlign:"center",fontSize:12,color:LB3,marginTop:14,lineHeight:1.6}}>
          By signing in you agree to our<br/>company policies and code of conduct
        </div>
      </div>
    </div>
  );

  // Onboarding
  if(!profile.onboarded)return<OnboardingFlow user={profile} onComplete={()=>loadProfile(session.user.id)}/>;

  // Main app
  if(profile.is_admin)return<AdminApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
  return<UserApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
}
