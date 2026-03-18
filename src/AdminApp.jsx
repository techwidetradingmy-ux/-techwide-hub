const giftPoints=async(toId,points,reason)=>{
  if(!toId||!points||!reason.trim())return;
  const recipient=allProfiles.find(p=>p.id===toId);
  if(!recipient)return;
  // Add points to recipient
  await supabase.from("profiles").update({xp:(recipient.xp||0)+points}).eq("id",toId);
  // Record the gift
  await supabase.from("point_gifts").insert({from_id:profile.id,to_id:toId,points,reason});
  // Auto announcement
  const annTitle=`🎁 ${recipient.nickname||recipient.name} received a gift!`;
  const annBody=`${recipient.nickname||recipient.name} has been gifted ${points} pts by the admin.\n\nReason: ${reason}`;
  await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"Admin"});
  // Notify the recipient
  await supabase.from("notifications").insert({user_id:toId,title:"🎁 You received a gift!",body:`You've been gifted ${points} pts! Reason: ${reason}`,type:"gift"});
  await loadAll();
  showToast(`🎁 Gifted ${points} pts to ${recipient.name}!`);
};
