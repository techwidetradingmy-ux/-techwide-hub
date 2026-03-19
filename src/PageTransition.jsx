import{useState,useEffect,useRef}from"react";

// ── Page transition wrapper ──────────────────────────────────────────
// direction: "forward" = slide in from right
//            "back"    = slide out to right
export function PageTransition({children,direction="forward",style={}}){
  const [phase,setPhase]=useState("enter");
  useEffect(()=>{
    setPhase("enter");
    const t=requestAnimationFrame(()=>{
      requestAnimationFrame(()=>setPhase("visible"));
    });
    return()=>cancelAnimationFrame(t);
  },[]);

  const transforms={
    enter:  direction==="forward"?"translateX(100%)":"translateX(-30%)",
    visible:"translateX(0%)",
    exit:   direction==="forward"?"translateX(-30%)":"translateX(100%)",
  };

  return(
    <div style={{
      position:"fixed",inset:0,
      transform:transforms[phase],
      transition:phase==="visible"?"transform .28s cubic-bezier(.4,0,.2,1)":"none",
      willChange:"transform",
      background:"#f2f2f7",
      overflowY:"auto",
      maxWidth:430,
      margin:"0 auto",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Hook for managing page stack ─────────────────────────────────────
export function usePageStack(){
  const [stack,setStack]=useState([]);// [{id,component,direction}]
  const [leaving,setLeaving]=useState(null);

  const push=(id,component)=>{
    setStack(p=>[...p,{id,component,direction:"forward"}]);
  };

  const pop=()=>{
    if(stack.length===0)return;
    const top=stack[stack.length-1];
    setLeaving(top);
    setTimeout(()=>{
      setLeaving(null);
      setStack(p=>p.slice(0,-1));
    },260);
  };

  const current=stack[stack.length-1]||null;
  return{push,pop,current,leaving,stackLength:stack.length};
}

// ── Animated Back button ─────────────────────────────────────────────
export function BackButton({onBack,color="#1c3258",label="← Back"}){
  const [pressed,setPressed]=useState(false);
  return(
    <button
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>{setPressed(false);onBack();}}
      onPointerLeave={()=>setPressed(false)}
      style={{
        background:"none",border:"none",cursor:"pointer",
        fontSize:16,color,fontWeight:600,padding:"4px 8px 4px 0",
        display:"flex",alignItems:"center",gap:4,
        transform:pressed?"scale(.88) translateX(-2px)":"scale(1) translateX(0)",
        opacity:pressed?.7:1,
        transition:"transform .1s,opacity .1s",
        fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",
      }}>
      {label}
    </button>
  );
}
