/* ========== Utility ========== */
const $ = (q,scope=document)=>scope.querySelector(q);
const on = (el,ev,fn)=>el.addEventListener(ev,fn);

const quoteText = $("#quoteText");
const quoteAuthor = $("#quoteAuthor");
const quoteBox = $("#quoteBox");
const nextBtn = $("#nextBtn");
const copyBtn = $("#copyBtn");
const tweetBtn = $("#tweetBtn");
const categorySel = $("#category");
const progress = $("#progress");
const themeToggle = $("#themeToggle");

let allQuotes = [];          // from JSON
let pool = [];               // filtered + shuffled list
let idx = 0;                 // current index within pool
let current = null;          // {text, author, category}

/* ========== Background Particles (canvas, subtle) ========== */
(function particles(){
  const c = document.getElementById("particles");
  const ctx = c.getContext("2d");
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  let W, H, dots = [];

  function resize(){
    W = c.width = Math.floor(innerWidth * DPR);
    H = c.height = Math.floor(innerHeight * DPR);
    c.style.width = innerWidth+"px";
    c.style.height = innerHeight+"px";
    dots = Array.from({length: 60}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-0.5)*0.18*DPR, vy:(Math.random()-0.5)*0.18*DPR,
      r: (Math.random()*1.4 + 0.6) * DPR, a: Math.random()*0.6+0.2
    }));
  }
  function step(){
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = "lighter";
    dots.forEach(d=>{
      d.x+=d.vx; d.y+=d.vy;
      if(d.x<0||d.x>W) d.vx*=-1;
      if(d.y<0||d.y>H) d.vy*=-1;
      ctx.beginPath();
      ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(124,243,255,${d.a})`;
      ctx.fill();
    });
    requestAnimationFrame(step);
  }
  addEventListener("resize", resize, { passive:true });
  resize(); step();
})();

/* ========== Data loading with fallback ========== */
const FALLBACK_QUOTES = [
  { text:"Believe you can and you're halfway there.", author:"Theodore Roosevelt", category:"inspirational" },
  { text:"Code is like humor. When you have to explain it, it’s bad.", author:"Cory House", category:"tech" },
  { text:"If it works, don’t touch it. If it doesn’t, console.log it.", author:"Unknown", category:"tech" },
  { text:"People say nothing is impossible, but I do nothing every day.", author:"A. A. Milne", category:"humor" },
  { text:"The secret of getting ahead is getting started.", author:"Mark Twain", category:"inspirational" },
  { text:"First, solve the problem. Then, write the code.", author:"John Johnson", category:"tech" },
  { text:"If you’re the smartest person in the room, you’re in the wrong room.", author:"Unknown", category:"inspirational" },
  { text:"Simplicity is the ultimate sophistication.", author:"Leonardo da Vinci", category:"inspirational" },
  { text:"To err is human; to really foul things up requires a computer.", author:"Paul R. Ehrlich", category:"humor" },
  { text:"Programs must be written for people to read.", author:"Harold Abelson", category:"tech" },
  { text:"Stay hungry, stay foolish.", author:"Steve Jobs", category:"inspirational" },
  { text:"A day without laughter is a day wasted.", author:"Charlie Chaplin", category:"humor" },
  { text:"What we think, we become.", author:"Buddha", category:"inspirational" },
  { text:"There are only two hard things in CS: cache invalidation and naming things.", author:"Phil Karlton", category:"tech" },
  { text:"Talk is cheap. Show me the code.", author:"Linus Torvalds", category:"tech" },
  { text:"Be yourself; everyone else is already taken.", author:"Oscar Wilde", category:"humor" },
  { text:"It always seems impossible until it's done.", author:"Nelson Mandela", category:"inspirational" },
  { text:"Experience is the name everyone gives to their mistakes.", author:"Oscar Wilde", category:"humor" },
  { text:"The best error message is the one that never shows up.", author:"Thomas Fuchs", category:"tech" },
  { text:"Do what you can, with what you have, where you are.", author:"Theodore Roosevelt", category:"inspirational" },
  { text:"Deleted code is debugged code.", author:"Jeff Sickel", category:"tech" }
];

async function loadQuotes(){
  try{
    const res = await fetch("./assets/quotes.json", { cache:"no-store" });
    if(!res.ok) throw new Error("Network");
    const data = await res.json();
    if(!Array.isArray(data) || data.length < 20) throw new Error("Too few quotes");
    allQuotes = data;
  }catch(e){
    // Fallback + inline error state
    allQuotes = FALLBACK_QUOTES;
    console.warn("Using fallback quotes:", e.message);
    notify("Couldn’t load quotes.json — using fallback list.");
  }
}

/* ========== Shuffle & cycle (no repeats until reset) ========== */
function fisherYates(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function rebuildPool(){
  const cat = categorySel.value;
  const list = cat==="all" ? allQuotes : allQuotes.filter(q => q.category===cat);
  pool = fisherYates(list);
  idx = 0;
  progress.textContent = `${idx}/${pool.length}`;
}

/* ========== Render & animate ========== */
function show(q){
  current = q;
  // Save last shown
  localStorage.setItem("inspiro:last", JSON.stringify({ text:q.text, author:q.author, category:q.category }));
  // Animate out -> in
  quoteBox.classList.remove("show");
  setTimeout(()=>{
    quoteText.textContent = `“${q.text}”`;
    quoteAuthor.textContent = `— ${q.author}`;
    quoteBox.classList.add("show");
  }, 60);
}

function next(){
  if(pool.length===0){ notify("No quotes in this category."); return; }
  if(idx >= pool.length){ rebuildPool(); }
  show(pool[idx++]);
  progress.textContent = `${Math.min(idx,pool.length)}/${pool.length}`;
}

/* ========== Clipboard / Tweet ========== */
async function copyQuote(){
  try{
    await navigator.clipboard.writeText(`${quoteText.textContent} ${quoteAuthor.textContent}`);
    notify("Copied to clipboard ✅");
  }catch{
    notify("Clipboard blocked — select and copy manually.");
  }
}

function tweetQuote(){
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${quoteText.textContent} ${quoteAuthor.textContent}`)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ========== Tiny toast ========== */
let toastTimer;
function notify(msg){
  let el = $("#toast");
  if(!el){
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role","status");
    el.style.position="fixed";
    el.style.left="50%"; el.style.bottom="22px"; el.style.transform="translateX(-50%)";
    el.style.background="rgba(0,0,0,.6)";
    el.style.color="#fff"; el.style.padding="10px 14px";
    el.style.borderRadius="12px"; el.style.fontSize="14px"; el.style.boxShadow="0 10px 30px rgba(0,0,0,.35)";
    el.style.backdropFilter="blur(8px)"; el.style.zIndex="5";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.style.opacity="0", 1600);
}

/* ========== Theme toggle ========== */
function applySavedTheme(){
  const t = localStorage.getItem("inspiro:theme");
  if(t==="light") document.body.classList.add("light");
}
function toggleTheme(){
  document.body.classList.toggle("light");
  localStorage.setItem("inspiro:theme", document.body.classList.contains("light") ? "light" : "dark");
}

/* ========== Keyboard shortcuts ========== */
function keyHandler(e){
  if(e.code==="Space"){ e.preventDefault(); next(); }
  else if(e.key?.toLowerCase()==="c"){ copyQuote(); }
  else if(e.key?.toLowerCase()==="t"){ toggleTheme(); }
}

/* ========== Initialize ========== */
(async function init(){
  applySavedTheme();
  await loadQuotes();
  rebuildPool();

  // Restore last quote if any & present in pool
  const last = (()=>{ try{return JSON.parse(localStorage.getItem("inspiro:last"));}catch{return null;} })();
  const match = last && (categorySel.value==="all" || last.category===categorySel.value)
    ? { text:last.text, author:last.author, category:last.category }
    : null;
  if(match){ show(match); }
  else{ next(); }

  on(nextBtn, "click", next);
  on(copyBtn, "click", copyQuote);
  on(tweetBtn, "click", tweetQuote);
  on(themeToggle, "click", toggleTheme);
  on(categorySel, "change", ()=>{ rebuildPool(); next(); });
  addEventListener("keydown", keyHandler);

  // Make card appear animated on first paint
  requestAnimationFrame(()=> quoteBox.classList.add("show"));
})();

  [
  { "text": "Dream big. Start small. Act now.", "author": "Robin Sharma", "category": "inspirational" },
  { "text": "Programs must be written for people to read.", "author": "Harold Abelson", "category": "tech" },
  { "text": "A day without laughter is a day wasted.", "author": "Charlie Chaplin", "category": "humor" },
  { "text": "What we think, we become.", "author": "Buddha", "category": "inspirational" },
  { "text": "Talk is cheap. Show me the code.", "author": "Linus Torvalds", "category": "tech" },
  { "text": "The best way out is always through.", "author": "Robert Frost", "category": "inspirational" },
  { "text": "To iterate is human, to recurse divine.", "author": "L. Peter Deutsch", "category": "tech" },
  { "text": "The minute you get away from fundamentals, the bottom can fall out.", "author": "John Wooden", "category": "inspirational" },
  { "text": "I intend to live forever. So far, so good.", "author": "Steven Wright", "category": "humor" },
  { "text": "Simplicity is the soul of efficiency.", "author": "Austin Freeman", "category": "tech" },
  { "text": "The only way to do great work is to love what you do.", "author": "Steve Jobs", "category": "inspirational" },
  { "text": "Experience is the name everyone gives to their mistakes.", "author": "Oscar Wilde", "category": "humor" },
  { "text": "Deleted code is debugged code.", "author": "Jeff Sickel", "category": "tech" },
  { "text": "It always seems impossible until it’s done.", "author": "Nelson Mandela", "category": "inspirational" },
  { "text": "There are only two hard things: cache invalidation and naming things.", "author": "Phil Karlton", "category": "tech" },
  { "text": "Be yourself; everyone else is already taken.", "author": "Oscar Wilde", "category": "humor" },
  { "text": "Do what you can, with what you have, where you are.", "author": "Theodore Roosevelt", "category": "inspirational" },
  { "text": "First, solve the problem. Then, write the code.", "author": "John Johnson", "category": "tech" },
  { "text": "Make it work, make it right, make it fast.", "author": "Kent Beck", "category": "tech" },
  { "text": "You miss 100% of the shots you don’t take.", "author": "Wayne Gretzky", "category": "inspirational" },
  { "text": "If at first you don’t succeed, then skydiving definitely isn’t for you.", "author": "Steven Wright", "category": "humor" },
  { "text": "The best error message is the one that never shows up.", "author": "Thomas Fuchs", "category": "tech" },
  { "text": "The secret of getting ahead is getting started.", "author": "Mark Twain", "category": "inspirational" },
  { "text": "If debugging is the process of removing bugs, then programming must be the process of putting them in.", "author": "Edsger W. Dijkstra", "category": "tech" }
]

