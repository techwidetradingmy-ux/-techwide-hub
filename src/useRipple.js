import{useRef}from"react";

// Returns {ref, handlePress} — attach ref to element, handlePress to onPointerDown
export function useRipple(){
  const ref=useRef(null);
  const handlePress=e=>{
    const el=ref.current;
    if(!el)return;
    const rect=el.getBoundingClientRect();
    const dot=document.createElement("div");
    dot.className="ripple-dot";
    dot.style.left=(e.clientX-rect.left)+"px";
    dot.style.top=(e.clientY-rect.top)+"px";
    el.appendChild(dot);
    setTimeout(()=>dot.remove(),500);
  };
  return{ref,handlePress};
}
