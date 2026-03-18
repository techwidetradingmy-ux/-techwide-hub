export const SF=`-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif`;
export const BG="#f2f2f7",BG2="#ffffff",SEP="#e5e5ea";
export const LBL="#000000",LB2="rgba(60,60,67,.8)",LB3="rgba(60,60,67,.6)";
export const ACC="#1c3258",ORG="#f69219";

export const BANK_TYPES=[
  "Maybank","CIMB Bank","Public Bank","RHB Bank","Hong Leong Bank",
  "AmBank","Bank Islam","Bank Rakyat","BSN","OCBC Bank",
  "Standard Chartered","HSBC Bank","Alliance Bank","Affin Bank",
  "Bank Muamalat","MBSB Bank","Other"
];

export const POSITIONS=[
  "Live Host",
  "Content Creator",
  "KOL Specialist",
  "Digital Marketing Executive",
  "Videographer",
  "Video Editor",
  "Graphic Designer",
  "Data Analyst",
  "Project Lead",
  "Team Manager",
  "Admin",
  "Clerk & HR",
  "Internship",
  "Others",
];

export const formatIC=val=>{
  const d=val.replace(/\D/g,'').slice(0,12);
  if(d.length<=6)return d;
  if(d.length<=8)return`${d.slice(0,6)}-${d.slice(6)}`;
  return`${d.slice(0,6)}-${d.slice(6,8)}-${d.slice(8)}`;
};
export const getICDigits=val=>val.replace(/\D/g,'');
export const formatContact=digits=>{
  if(!digits)return'';
  const d=digits.replace(/\D/g,'');
  let n=d.startsWith('60')?d.slice(2):d.startsWith('0')?d.slice(1):d;
  if(n.startsWith('11')){
    if(n.length<=2)return`+60 ${n}`;
    if(n.length<=6)return`+60 ${n.slice(0,2)} ${n.slice(2)}`;
    return`+60 ${n.slice(0,2)} ${n.slice(2,6)} ${n.slice(6)}`;
  }
  if(n.length<=2)return`+60 ${n}`;
  if(n.length<=5)return`+60 ${n.slice(0,2)} ${n.slice(2)}`;
  return`+60 ${n.slice(0,2)} ${n.slice(2,5)} ${n.slice(5)}`;
};
export const normalizeContact=val=>{
  const d=val.replace(/\D/g,'');
  if(d.startsWith('60'))return d;
  if(d.startsWith('0'))return'6'+d;
  return'60'+d;
};
export const validateContact=val=>{
  const d=val.replace(/\D/g,'');
  let n=d.startsWith('60')?d.slice(2):d.startsWith('0')?d.slice(1):d;
  return n.length>=7&&n.length<=9;
};

export const TIERS=[
  {name:"Rookie",      min:0,    color:"#8e8e93",emoji:"🌱",desc:"Just getting started"},
  {name:"Rising Star", min:100,  color:"#34c759",emoji:"⭐",desc:"Building momentum"},
  {name:"Contributor", min:300,  color:"#007aff",emoji:"🔷",desc:"Making an impact"},
  {name:"Champion",    min:700,  color:"#ff9500",emoji:"🏆",desc:"Leading the way"},
  {name:"Legend",      min:1500, color:"#ff2d55",emoji:"👑",desc:"The pinnacle of excellence"},
];
export const getTier=score=>{let t=TIERS[0];for(const x of TIERS)if(score>=x.min)t=x;return t;};
export const calcScore=(joinedDate,done)=>Math.max(0,joinedDate?Math.floor((Date.now()-new Date(joinedDate))/86400000):0)+(done*10);

export const PRIZES=[
  {id:"p1",name:"Bubble Tea Voucher",   pts:200, stock:20,icon:"🧋",cat:"Food",         desc:"Any drink from Tealive or Chatime"},
  {id:"p2",name:"Netflix 1 Month",      pts:500, stock:5, icon:"🎬",cat:"Entertainment",desc:"1 month Netflix premium subscription"},
  {id:"p3",name:"Grab Food RM50",       pts:400, stock:10,icon:"🛵",cat:"Food",         desc:"RM50 Grab Food credit"},
  {id:"p4",name:"Extra Annual Leave",   pts:800, stock:8, icon:"🌴",cat:"Time Off",     desc:"1 extra day annual leave"},
  {id:"p5",name:"Work From Anywhere",   pts:1200,stock:3, icon:"🏖️",cat:"Time Off",    desc:"WFA privilege for 1 full week"},
  {id:"p6",name:"Spotify Premium 3M",  pts:600, stock:10,icon:"🎵",cat:"Entertainment",desc:"3 months Spotify Premium"},
  {id:"p7",name:"Spa Treatment",        pts:900, stock:5, icon:"💆",cat:"Wellness",     desc:"Full body spa at partner outlet"},
  {id:"p8",name:"Team Dinner Invite",   pts:700, stock:6, icon:"🍽️",cat:"Experience",  desc:"Join the management team dinner"},
  {id:"p9",name:"Birthday Surprise Box",pts:350, stock:15,icon:"🎁",cat:"Special",      desc:"Mystery box curated by the team"},
  {id:"p10",name:"AirPods Raffle Entry",pts:1500,stock:20,icon:"🎧",cat:"Tech",         desc:"1 entry into quarterly AirPods lucky draw"},
  {id:"p11",name:"WFH Bundle",          pts:1000,stock:4, icon:"💻",cat:"Tech",         desc:"Mouse, mousepad & desk organizer set"},
  {id:"p12",name:"RM100 Touch n Go",    pts:500, stock:10,icon:"💳",cat:"Cash",         desc:"RM100 loaded to your TNG wallet"},
];

export const WELCOME=[
  "👋 Welcome to Techwide Hub! We're so thrilled to have you join the family!",
  "🏢 Techwide Marketing is built on 4 core values:\n\nSincerity · Love · Responsible · Respectful\n\nThese aren't just words — they guide everything we do every single day.",
  "📱 Quick app guide:\n\n🏠 Home — Daily check-in & your stats\n🎯 Missions — Complete tasks to earn points\n🏆 Leaderboard — See how you rank\n🎁 Prizes — Redeem points for rewards\n💬 Community — Chat with your team\n👤 Profile — Your personal space",
  "⭐ Contribution Tiers:\n\n🌱 Rookie → ⭐ Rising Star → 🔷 Contributor → 🏆 Champion → 👑 Legend\n\nEvery day you stay = 1 point. Every mission = 10 points!",
  "🎉 Welcome to the team! Don't hesitate to ask your admin if you need anything. We're so happy you're here! 💪✨",
];
