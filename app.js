/* ===== PETAL CANVAS ===== */
(function(){
  const canvas = document.getElementById('petalCanvas');
  const ctx = canvas.getContext('2d');
  const petals = [];
  const PETAL_COLORS = ['rgba(232,165,192,.55)','rgba(232,165,192,.35)','rgba(255,255,255,.4)','rgba(201,148,58,.3)','rgba(196,181,165,.4)'];
  const NUM = 38;

  function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  for(let i=0;i<NUM;i++) petals.push(makePetal(true));

  function makePetal(random){
    const size = 4+Math.random()*8;
    return {
      x: Math.random()*window.innerWidth,
      y: random ? Math.random()*window.innerHeight : -size,
      size,
      speedY: .4+Math.random()*.8,
      speedX: (Math.random()-.5)*.5,
      rot: Math.random()*Math.PI*2,
      rotSpeed: (Math.random()-.5)*.03,
      opacity: .3+Math.random()*.5,
      color: PETAL_COLORS[Math.floor(Math.random()*PETAL_COLORS.length)],
      sway: Math.random()*Math.PI*2,
      swaySpeed: .008+Math.random()*.012
    };
  }

  function drawPetal(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0,0, p.size*.4, p.size, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    petals.forEach(p=>{
      p.sway += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.sway)*.4;
      p.y += p.speedY;
      p.rot += p.rotSpeed;
      if(p.y > canvas.height+20) Object.assign(p, makePetal(false));
      drawPetal(p);
    });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ===== HEADER SCROLL ===== */
const header = document.getElementById('header');
window.addEventListener('scroll', ()=>{
  header.classList.toggle('scrolled', window.scrollY > 60);
});

/* ===== HAMBURGER ===== */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', ()=> mobileMenu.classList.toggle('open'));
document.querySelectorAll('.mobile-link').forEach(l=> l.addEventListener('click', ()=> mobileMenu.classList.remove('open')));

/* ===== SCROLL REVEAL ===== */
const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('revealed'); revealObserver.unobserve(e.target); }
  });
},{threshold:0.12});
document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right').forEach(el=> revealObserver.observe(el));

/* ===== COUNTER ANIMATION ===== */
function animateCount(el){
  const target = +el.dataset.target;
  const duration = 1600;
  const start = performance.now();
  function step(now){
    const progress = Math.min((now-start)/duration, 1);
    const ease = 1 - Math.pow(1-progress, 3);
    el.textContent = Math.round(ease*target);
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const counterObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ animateCount(e.target); counterObserver.unobserve(e.target); }
  });
},{threshold:0.5});
document.querySelectorAll('.stat-num').forEach(el=> counterObserver.observe(el));

/* ===== GALLERY FILTER ===== */
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    filterBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.gallery-item').forEach(item=>{
      const show = filter==='all' || item.dataset.cat===filter;
      item.style.transition = 'opacity .3s ease, transform .3s ease';
      if(show){ item.classList.remove('hidden'); item.style.opacity='1'; item.style.transform='scale(1)'; }
      else { item.style.opacity='0'; item.style.transform='scale(.95)'; setTimeout(()=> item.classList.add('hidden'), 300); }
    });
  });
});

/* ===== GALLERY LOADER + LIGHTBOX ===== */
(function(){
  if(!window.GALLERY_DATA || !window.GALLERY_DATA.length) return;

  // --- lightbox elements ---
  var lb      = document.getElementById('lightbox');
  var lbImg   = document.getElementById('lbImg');
  var lbLabel = document.getElementById('lbLabel');
  var lbImgs  = []; // list of {src, label}
  var lbCur   = 0;

  function lbOpen(index){
    lbCur = Math.max(0, Math.min(index, lbImgs.length - 1));
    lbImg.src             = lbImgs[lbCur].src;
    lbLabel.textContent   = lbImgs[lbCur].label;
    lb.style.display      = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function lbClose(){
    lb.style.display = 'none';
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  document.getElementById('lbClose').addEventListener('click', lbClose);
  document.getElementById('lbPrev').addEventListener('click', function(){ lbOpen(lbCur - 1); });
  document.getElementById('lbNext').addEventListener('click', function(){ lbOpen(lbCur + 1); });
  lb.addEventListener('click', function(e){ if(e.target === lb) lbClose(); });
  document.addEventListener('keydown', function(e){
    if(lb.style.display !== 'flex') return;
    if(e.key === 'Escape')     lbClose();
    if(e.key === 'ArrowLeft')  lbOpen(lbCur - 1);
    if(e.key === 'ArrowRight') lbOpen(lbCur + 1);
  });

  // --- build gallery ---
  var grid = document.querySelector('.gallery-grid');
  grid.innerHTML = '';

  window.GALLERY_DATA.forEach(function(img, index){
    var item = document.createElement('div');
    item.className = 'gallery-item reveal-up' + (img.size === 'tall' ? ' tall' : '');
    item.dataset.cat = img.category;
    item.innerHTML = '<div class="gal-img" style="background:#ede8e2">'
      + '<img src="' + img.data + '" alt="' + (img.label||'') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">'
      + '<div class="gal-overlay"><span>✶</span><p>' + (img.label||'') + '</p></div>'
      + '</div>';
    grid.appendChild(item);
    revealObserver.observe(item);

    lbImgs.push({ src: img.data, label: img.label || '' });
    item.addEventListener('click', (function(i){ return function(){ lbOpen(i); }; })(index));
  });
})();

/* ===== TESTIMONIALS SLIDER ===== */
const track = document.getElementById('testiTrack');
const dotsWrap = document.getElementById('testiDots');
const prevBtn = document.getElementById('testiPrev');
const nextBtn = document.getElementById('testiNext');
if(track){
  const cards = track.querySelectorAll('.testi-card');
  const visible = ()=> window.innerWidth <= 700 ? 1 : 3;
  let current = 0;
  let total = Math.ceil(cards.length / visible());

  function buildDots(){
    dotsWrap.innerHTML='';
    total = Math.ceil(cards.length / visible());
    for(let i=0;i<total;i++){
      const d=document.createElement('div');
      d.className='testi-dot'+(i===current?' active':'');
      d.addEventListener('click',()=>goTo(i));
      dotsWrap.appendChild(d);
    }
  }

  function goTo(n){
    current=Math.max(0,Math.min(n,total-1));
    const cardW = track.querySelector('.testi-card').offsetWidth+24;
    track.style.transform=`translateX(-${current*visible()*cardW}px)`;
    dotsWrap.querySelectorAll('.testi-dot').forEach((d,i)=>d.classList.toggle('active',i===current));
  }

  prevBtn.addEventListener('click',()=>goTo(current-1));
  nextBtn.addEventListener('click',()=>goTo(current+1));
  window.addEventListener('resize', buildDots);
  buildDots();

  // auto-play
  let autoPlay = setInterval(()=>{ current=current<total-1?current+1:0; goTo(current); }, 4500);
  track.parentElement.addEventListener('mouseenter',()=>clearInterval(autoPlay));
  track.parentElement.addEventListener('mouseleave',()=>{ autoPlay=setInterval(()=>{ current=current<total-1?current+1:0; goTo(current); },4500); });
}
/* ===== SERVICE CARDS → WHATSAPP ===== */
const WA_MSGS = {
  'Corte de cabello':    'Hola Mon Ciel! Me gustaría agendar un *corte de cabello*. ¿Tienen disponibilidad?',
  'Coloración':          'Hola Mon Ciel! Me gustaría agendar una *coloración*. ¿Tienen disponibilidad?',
  'Tratamiento capilar': 'Hola Mon Ciel! Me gustaría hacer un *tratamiento capilar*. ¿Tienen disponibilidad?',
  'Lavado y peinado':    'Hola Mon Ciel! Me gustaría agendar un *lavado y peinado*. ¿Tienen disponibilidad?',
  'Manicure':            'Hola Mon Ciel! Me gustaría hacerme las uñas (*manicure*). ¿Tienen disponibilidad?',
  'Pedicure':            'Hola Mon Ciel! Me gustaría hacerme un *pedicure*. ¿Tienen disponibilidad?',
};

document.querySelectorAll('.service-card').forEach(card=>{
  const service = card.dataset.service;
  const msg = WA_MSGS[service] || 'Hola Mon Ciel! 👋 Me gustaría reservar una cita. ¿Tienen disponibilidad?';
  const url = 'https://wa.me/50688346266?text=' + encodeURIComponent(msg);

  // Convert the span button to a real <a> link (works reliably on mobile Safari)
  const btn = card.querySelector('.service-back .btn-white');
  if(btn){
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = btn.className;
    a.textContent = btn.textContent;
    btn.replaceWith(a);
  }

  // Tapping anywhere on the card (outside the link) also opens WhatsApp
  card.addEventListener('click', e=>{
    if(e.target.closest('a')) return;
    const tmp = document.createElement('a');
    tmp.href = url;
    tmp.target = '_blank';
    tmp.rel = 'noopener noreferrer';
    document.body.appendChild(tmp);
    tmp.click();
    document.body.removeChild(tmp);
  });
});


/* ===== HERO PARALLAX ===== */
const heroContent = document.querySelector('.hero-content');
window.addEventListener('scroll',()=>{
  if(window.scrollY < window.innerHeight){
    heroContent.style.transform=`translateY(${window.scrollY*0.25}px)`;
  }
},{passive:true});
