/* classic script (works from file:// and from a web server) */
/* ---- عرض الحساب فوراً من الكاش قبل ما Firebase يحمّل (بيمنع شكل "خروج" مؤقت) ---- */
(function(){
  try{
    var raw = localStorage.getItem('shafei_user'); if(!raw) return;
    var u = JSON.parse(raw); if(!u) return;
    var btn = document.getElementById('nav-account-btn'); if(!btn) return;
    var lang = document.body.dataset.lang || 'ar';
    if(u.anon){
      btn.setAttribute('onclick','window.toggleUserMenu&&toggleUserMenu()');
      var g0 = document.getElementById('user-greeting');
      if(g0) g0.textContent = lang==='en' ? 'Browsing as Guest' : 'دخلت كضيف';
      return;
    }
    var name = u.name || 'حسابي';
    var initial = name.trim().charAt(0).toUpperCase();
    btn.innerHTML = '<span style="font-size:14px;font-weight:800;"></span>';
    btn.firstChild.textContent = initial;
    btn.setAttribute('onclick','window.toggleUserMenu&&toggleUserMenu()');
    var g = document.getElementById('user-greeting');
    if(g) g.textContent = (lang==='en' ? 'Hello, ' : 'أهلاً، ') + name;
  }catch(e){}
})();

(async function(){
function __esc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
// نص آمن داخل onclick="..." (قيمة JS + HTML attribute)
function __jsq(v){ return __esc(JSON.stringify(String(v == null ? '' : v))); }

const [ { initializeApp }, { getAnalytics }, {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInAnonymously, onAuthStateChanged, signOut, updateProfile,
  sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider,
  verifyBeforeUpdateEmail, updatePassword,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, sendPasswordResetEmail
}, {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp,
  query, where, getDocs, updateDoc, orderBy, deleteDoc
} ] = await Promise.all([
  import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
  import("https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js"),
  import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
  import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
]);

// بيانات مشروع الفايربيز بتاع الشافعي ستيل
const firebaseConfig = {
  apiKey: "AIzaSyDykzp2_4SJr7DjLkAmvHFSnCxXs_Ee9L0",
  authDomain: "alshafei-steel.firebaseapp.com",
  projectId: "alshafei-steel",
  storageBucket: "alshafei-steel.firebasestorage.app",
  messagingSenderId: "832213850052",
  appId: "1:832213850052:web:3ab2444ed8b0df12793691",
  measurementId: "G-D6GM6Y7EQG"
};

const app = initializeApp(firebaseConfig);
try{ getAnalytics(app); }catch(e){ console.log('Analytics غير متاح هنا:', e); }

const auth = getAuth(app);
const db = getFirestore(app);

// نسيب الأدوات دي متاحة للاستخدام في باقي الموقع (صفحة الطلبات والداشبورد)
window.__auth = auth;
window.__db = db;
window.__fbtools = { doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp };

// ---------- تحميل إعدادات SEO والتواصل المحفوظة من قبل (لو موجودة) وتطبيقها فورًا على الصفحة لكل زائر ----------
(async function applySavedSettings(){
  try{
    const seoSnap = await getDoc(doc(db,'site_settings','seo'));
    if(seoSnap.exists()){
      const s = seoSnap.data();
      if(s.title) document.title = s.title;
      const setMeta=(sel,attr,val)=>{ if(!val) return; const el=document.querySelector(sel); if(el) el[attr]=val; };
      setMeta('meta[name="description"]','content', s.desc);
      setMeta('meta[name="keywords"]','content', s.keywords);
      setMeta('meta[property="og:title"]','content', s.ogTitle);
      setMeta('meta[property="og:description"]','content', s.ogDesc);
      const can=document.querySelector('link[rel="canonical"]');
      if(can && s.canonical) can.href = s.canonical;
    }
  }catch(e){ console.log('تعذر تحميل إعدادات SEO المحفوظة:', e); }

  try{
    const contactSnap = await getDoc(doc(db,'site_settings','contact'));
    if(contactSnap.exists()){
      const c = contactSnap.data();
      if(c.whatsapp){
        document.querySelectorAll('.order-btn, a.float-whatsapp, a[href*="api.whatsapp"], a[href*="wa.me"]').forEach(a=>{
          a.href = a.href.replace(/phone=\d+/,'phone='+c.whatsapp).replace(/wa\.me\/\d+/,'wa.me/'+c.whatsapp);
        });
      }
      if(c.phone){
        document.querySelectorAll('a.float-call').forEach(a=>{ a.href='tel:'+c.phone; const s=a.querySelector('span'); if(s) s.textContent=c.phone; });
        const waSpan=document.querySelector('a.float-whatsapp span');
        if(waSpan) waSpan.textContent = c.phone.startsWith('2') ? c.phone.slice(2) : c.phone;
      }
      if(c.fb) document.querySelectorAll('a.facebook-icon').forEach(a=>a.href=c.fb);
      if(c.ig) document.querySelectorAll('a.instagram-icon').forEach(a=>a.href=c.ig);
    }
  }catch(e){ console.log('تعذر تحميل بيانات التواصل المحفوظة:', e); }
})();

// ---------- تحميل تعديلات/حذف/إضافات الماكينات المحفوظة من الداشبورد وتطبيقها لكل زائر ----------
(async function applyMachineOverrides(){
  try{
    // 1) تعديلات وحذف على الماكينات الأصلية (مفهرسة بنفس ترتيبها في الصفحة)
    const overridesSnap = await getDocs(collection(db,'machine_overrides'));
    const cards = document.querySelectorAll('.machine-card');
    overridesSnap.forEach(d=>{
      const idx = parseInt(d.id.replace('m',''), 10);
      const card = cards[idx];
      if(!card) return;
      const o = d.data();
      if(o.deleted){ card.style.display='none'; card.setAttribute('data-deleted','1'); return; }
      if(o.name){ const h3=card.querySelector('h3'); if(h3) h3.innerText=o.name; }
      if(o.model){ const m=card.querySelector('.machine-model'); if(m) m.innerText=o.model; }
      if(o.desc){ const p=card.querySelector('p'); if(p) p.innerText=o.desc; }
      if(o.img){ const img=card.querySelector('img'); if(img){ img.src=o.img; if(o.name) img.alt=o.name+' — الشافعي ستيل'; } }
      if(o.cat) card.setAttribute('data-category', o.cat);
      if(o.name || o.model){
        const orderBtn = card.querySelector('.order-btn');
        if(orderBtn){
          const msg = encodeURIComponent('مرحبًا،\nأريد الاستفسار عن: '+(o.name||card.querySelector('h3').innerText)+'\nالموديل: '+(o.model||'')+'\nالمصدر: الموقع الرسمي لشركة الشافعي ستيل 🌐');
          orderBtn.href = orderBtn.href.replace(/text=.*/, 'text='+msg);
        }
      }
    });

    // 2) ماكينات جديدة اتضافت من الداشبورد
    const newSnap = await getDocs(query(collection(db,'machines_new'), orderBy('createdAt','asc')));
    if(!newSnap.empty){
      const targetGrid = document.querySelector('.additional-machines .machines-grid') || document.querySelector('.machines-grid');
      newSnap.forEach(d=>{
        const m = d.data();
        const msg = encodeURIComponent('مرحبًا،\nأريد الاستفسار عن: '+m.name+'\nالموديل: '+(m.model||'')+'\nالمصدر: الموقع الرسمي لشركة الشافعي ستيل 🌐');
        const newCard = document.createElement('div');
        newCard.className = 'machine-card';
        newCard.setAttribute('data-category', m.cat || 'other');
        newCard.setAttribute('data-fs-id', d.id);
        newCard.innerHTML = `
          <img loading="lazy" decoding="async" src="${m.img||'https://res.cloudinary.com/dtr0ktugl/image/fetch/https://i.imgur.com/8Km9tLL.png'}" alt="${m.name} — الشافعي ستيل">
          <div class="machine-info">
            <h3>${m.name}</h3>
            <span class="machine-model">${m.model||''}</span>
            <div class="machine-divider"></div>
            <p>${m.desc||''}</p>
            <a class="order-btn" target="_blank" href="https://api.whatsapp.com/send?phone=201099747509&text=${msg}">🛒 اطلب الآن</a>
          </div>
        `;
        if(targetGrid) targetGrid.appendChild(newCard);
      });
    }
  }catch(e){ console.log('تعذر تحميل تعديلات الماكينات المحفوظة:', e); }
})();

// ---------- تبديل التابات ----------
window.switchAuthTab = function(tab){
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('panel-login').classList.toggle('active', tab==='login');
  document.getElementById('panel-register').classList.toggle('active', tab==='register');
};

window.openAuthModal = function(){
  document.getElementById('user-menu').classList.remove('active');
  document.getElementById('auth-modal').classList.add('active');
};

// لو المستخدم جاي من صفحة تانية (زي صفحة ماكينة) وداس على "حسابي"،
// بيترجع هنا بـ ?auth=1 عشان نفتحله اللوجن أوتوماتيك من غير ما يدوس تاني
if (new URLSearchParams(window.location.search).get('auth') === '1') {
  window.__pendingAuthOpen = true;
}

window.closeAuthModal = function(){
  document.getElementById('auth-modal').classList.remove('active');
  ['login-error','reg-error'].forEach(id=>{
    const e=document.getElementById(id);
    e.style.display='none';
    e.textContent='';
  });
  const ok = document.getElementById('login-success');
  if(ok){ ok.style.display='none'; ok.textContent=''; }
};

// قفل الفورم لو ضغط على الخلفية الغامقة بره صندوق الفورم نفسه
document.getElementById('auth-modal').addEventListener('click', function(e){
  if(e.target.id === 'auth-modal') closeAuthModal();
});

function showAuthError(id,msg){
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display='block';
}

function arabicAuthError(err){
  const map = {
    'auth/invalid-email':'البريد الإلكتروني غير صحيح',
    'auth/user-not-found':'لا يوجد حساب بهذا البريد',
    'auth/wrong-password':'كلمة السر غير صحيحة',
    'auth/invalid-credential':'البريد الإلكتروني أو كلمة السر غير صحيحة',
    'auth/email-already-in-use':'البريد الإلكتروني مستخدم من قبل',
    'auth/weak-password':'كلمة السر لازم تكون 6 أحرف على الأقل',
    'auth/too-many-requests':'محاولات كتير، حاول بعد قليل',
    'auth/network-request-failed':'فيه مشكلة في الاتصال بالإنترنت',
    'auth/requires-recent-login':'لازم تأكد كلمة السر الحالية تاني عشان دي عملية حساسة',
    'auth/popup-blocked':'المتصفح منع نافذة جوجل، اسمح بالنوافذ المنبثقة وحاول تاني',
    'auth/account-exists-with-different-credential':'الإيميل ده مسجل بطريقة تانية (بكلمة سر مثلًا)، سجّل دخول بيها'
  };
  return map[err.code] || 'حصل خطأ، حاول تاني';
}

// ---------- تسجيل الدخول ----------
// إيميل صاحب الموقع — مستثنى من شرط تأكيد الإيميل عشان مشاكل وصول الإيميلات متوقفش دخوله لحسابه
const SITE_ADMIN_EMAIL = 'alshafystyl@gmail.com';

// ---------- تسجيل دخول بحساب جوجل (بيتأكد تلقائي، مفيش داعي للينك تأكيد) ----------
const googleProvider = new GoogleAuthProvider();
window.fbGoogleLogin = function(){
  const btn = document.querySelector('.auth-google-btn');
  if(btn){ btn.disabled = true; }
  signInWithPopup(auth, googleProvider)
    .then(async (result)=>{
      const user = result.user;
      // أول مرة يدخل بيها بجوجل، نسجّل بياناته في users لو مكنش موجود قبل كده
      const snap = await getDoc(doc(db,'users',user.uid));
      if(!snap.exists()){
        await setDoc(doc(db,'users',user.uid), {
          name: user.displayName || '',
          phone: '',
          email: user.email,
          createdAt: serverTimestamp()
        });
      }
      closeAuthModal();
    })
    .catch(err=>{
      if(err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request'){
        showAuthError('login-error', arabicAuthError(err));
      }
    })
    .finally(()=>{ if(btn) btn.disabled = false; });
};

// ---------- تسجيل الدخول بحساب أبل (Sign in with Apple) — نفس منطق جوجل بالظبط ----------
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

window.fbAppleLogin = function(){
  const btn = document.querySelector('.auth-apple-btn');
  if(btn){ btn.disabled = true; }
  signInWithPopup(auth, appleProvider)
    .then(async (result)=>{
      const user = result.user;
      const snap = await getDoc(doc(db,'users',user.uid));
      if(!snap.exists()){
        await setDoc(doc(db,'users',user.uid), {
          name: user.displayName || '',
          phone: '',
          email: user.email || '',
          createdAt: serverTimestamp()
        });
      }
      closeAuthModal();
    })
    .catch(err=>{
      if(err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request'){
        showAuthError('login-error', arabicAuthError(err));
      }
    })
    .finally(()=>{ if(btn) btn.disabled = false; });
};

// ---------- نسيت كلمة السر ----------
window.fbForgotPassword = function(){
  const email = document.getElementById('login-email').value.trim();
  const errEl = document.getElementById('login-error');
  const okEl  = document.getElementById('login-success');
  errEl.style.display='none'; okEl.style.display='none';

  if(!email){
    errEl.textContent = 'اكتب بريدك الإلكتروني فوق الأول، وبعدين دوس "نسيت كلمة السر؟"';
    errEl.style.display='block';
    return;
  }
  sendPasswordResetEmail(auth, email)
    .then(()=>{
      okEl.textContent = '✅ بعتنا لينك إعادة تعيين كلمة السر على بريدك، افتحه واتبع الخطوات.';
      okEl.style.display='block';
    })
    .catch(err=>{
      errEl.textContent = arabicAuthError(err);
      errEl.style.display='block';
    });
};

window.fbLogin = function(){
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');
  if(!email || !password){ showAuthError('login-error','اكتب البريد وكلمة السر'); return; }
  btn.disabled = true; btn.textContent='⏳ جاري الدخول...';
  signInWithEmailAndPassword(auth, email, password)
    .then(async (cred)=>{
      const isAdmin = cred.user.email && cred.user.email.toLowerCase() === SITE_ADMIN_EMAIL;
      if(!cred.user.isAnonymous && !cred.user.emailVerified && !isAdmin){
        // مش هنسمحله يدخل غير لما يأكد الإيميل — نبعتله لينك تأكيد جديد ونعمله تسجيل خروج فورًا
        try{ await sendEmailVerification(cred.user); }catch(e){ console.log('تعذر إعادة إرسال رابط التأكيد:', e); }
        await signOut(auth);
        showAuthError('login-error','لازم تأكد بريدك الإلكتروني الأول قبل الدخول. بعتنا لينك تأكيد جديد على إيميلك (دوّر في الـ Spam لو ملقتهوش).');
        return;
      }
      closeAuthModal();
    })
    .catch(err=>{ showAuthError('login-error', arabicAuthError(err)); })
    .finally(()=>{ btn.disabled=false; btn.textContent='دخول'; });
};

// ---------- إنشاء حساب جديد ----------
window.fbRegister = function(){
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('reg-submit-btn');
  if(!name || !phone || !email || !password){ showAuthError('reg-error','من فضلك اكمل كل البيانات'); return; }
  btn.disabled = true; btn.textContent='⏳ جاري إنشاء الحساب...';
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (cred)=>{
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db,'users',cred.user.uid), {
        name, phone, email, createdAt: serverTimestamp()
      });
      // نبعت لينك تأكيد إيميل
      try{ await sendEmailVerification(cred.user); }catch(e){ console.log('تعذر إرسال إيميل التأكيد:', e); }
      // الحساب لسه مش مفعّل، فمنسيبهوش داخل — نعمله تسجيل خروج ونطلب منه يفعّل الإيميل الأول
      await signOut(auth);
      document.getElementById('login-email').value = email;
      switchAuthTab('login');
      showAuthError('login-error','تم إنشاء حسابك! بعتنا لينك تأكيد على بريدك — افتحه وبعدين سجّل دخول من هنا.');
      if(typeof showToast==='function') showToast('✅ بعتنا لينك تأكيد على بريدك الإلكتروني');
    })
    .catch(err=>{ showAuthError('reg-error', arabicAuthError(err)); })
    .finally(()=>{ btn.disabled=false; btn.textContent='إنشاء الحساب'; });
};

// ---------- المتابعة كضيف ----------
window.fbGuestLogin = function(){
  signInAnonymously(auth)
    .then(()=>{ closeAuthModal(); })
    .catch(err=>{ showAuthError('login-error', arabicAuthError(err)); });
};

// ---------- تسجيل خروج ----------
window.fbLogout = function(){
  signOut(auth).then(()=>{
    document.getElementById('user-menu').classList.remove('active');
  });
};

// ---------- صفحة "طلباتي" — بترجع كل الطلبات اللي مسجلة باسم اليوزر ده في Firestore ----------
window.openMyRequests = async function(){
  const menu = document.getElementById('user-menu');
  if(menu) menu.classList.remove('active');
  const user = auth.currentUser;
  if(!user){ openAuthModal(); return; }
  await renderMyOrdersPage(user);
};

async function renderMyOrdersPage(user){
  const overlay = document.getElementById('page-overlay');
  const content = document.getElementById('page-content');
  const __t = (window.UI_TR||{})[getCurrentLang()] || (window.UI_TR||{ar:{}}).ar;
  content.innerHTML = `
    <h1 style="color:white;font-size:32px;margin-bottom:8px;">${__t.myOrders}</h1>
    <div style="width:60px;height:4px;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:4px;margin-bottom:30px;"></div>
    <p style="color:var(--muted);">${__t.loading}</p>
  `;
  overlay.style.display = 'block';
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';

  let orders = [];
  try{
    const q = query(collection(db,'orders'), where('uid','==',user.uid));
    const snap = await getDocs(q);
    snap.forEach(d=>orders.push({ id:d.id, ...d.data() }));
    orders.sort((a,b)=>{
      const ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
      const tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
  }catch(e){
    console.log('تعذر تحميل الطلبات (تحقّق من Firestore Rules لمجموعة orders):', e);
  }

  const guestNote = user.isAnonymous
    ? `<div style="margin-bottom:20px;padding:14px 18px;background:rgba(245,147,10,0.08);border:1px solid rgba(232,160,32,0.25);border-radius:14px;color:var(--secondary-light);font-size:13px;">أنت متابع كضيف — لو عملت حساب دائم، طلباتك هتفضل محفوظة باسمك حتى لو غيّرت الجهاز أو المتصفح.</div>`
    : '';

  if(orders.length === 0){
    content.innerHTML = `
      <h1 style="color:white;font-size:32px;margin-bottom:8px;">${__t.myOrders}</h1>
      <div style="width:60px;height:4px;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:4px;margin-bottom:30px;"></div>
      ${guestNote}
      <p style="color:var(--muted);">${__t.noOrders}</p>
      <a href="machines/index.html" class="btn-primary" style="margin-top:18px;display:inline-block;">${__t.browseMachines}</a>
    `;
    return;
  }

  // تحقّق من أي طلب مضى عليه 48 ساعة بدون تأكيد — وألغيه تلقائيًا
  const now = Date.now();
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
  for(const o of orders){
    if((o.status === 'قيد المراجعة') && o.createdAt && o.createdAt.toMillis){
      const age = now - o.createdAt.toMillis();
      if(age >= FORTY_EIGHT_HOURS){
        try{
          const fb = window.__fbtools, db = window.__db;
          await fb.updateDoc(fb.doc(db,'orders',o.id), { status: 'ملغي تلقائياً' });
          o.status = 'ملغي تلقائياً';
        }catch(e){ console.log('تعذر الإلغاء التلقائي:', e); }
      }
    }
  }

  const statusConfig = (s)=>{
    if(s === 'تم التواصل') return { color:'#f5930a', label:__t.statusAccepted, dot:'🟠' };
    if(s === 'ملغي') return { color:'#ff6b6b', label:__t.statusCancelled, dot:'🔴' };
    if(s === 'ملغي تلقائياً') return { color:'#ff6b6b', label:__t.statusAutoCancelled, dot:'🔴' };
    return { color:'#7b93c8', label:__t.statusPending, dot:'⚪' };
  };

  // إخفاء الطلبات اللي ألغاها العميل بنفسه — بتختفي من قائمته نهائياً
  const visibleOrders = orders.filter(o => !o.canceledByUser);

  if(visibleOrders.length === 0){
    content.innerHTML = `
      <h1 style="color:white;font-size:32px;margin-bottom:8px;">${__t.myOrders}</h1>
      <div style="width:60px;height:4px;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:4px;margin-bottom:30px;"></div>
      ${guestNote}
      <p style="color:var(--muted);">${__t.noOrders}</p>
      <a href="machines/index.html" class="btn-primary" style="margin-top:18px;display:inline-block;">${__t.browseMachines}</a>
    `;
    return;
  }

  const cancelBtnLabel = __t.cancelBtn || 'إلغاء الطلب';
  const rows = visibleOrders.map(o=>{
    let dateStr = '—';
    try{ if(o.createdAt && o.createdAt.toDate) dateStr = o.createdAt.toDate().toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){}
    const status = o.status || 'قيد المراجعة';
    const cfg = statusConfig(status);
    const canCancel = status === 'قيد المراجعة';
    const isAccepted = status === 'تم التواصل';
    const dotAnim = canCancel ? 'animation:pulse-dot 1.4s infinite;' : '';
    const safeName = (o.machineName||'').replace(/'/g,"&#39;");
    const cancelBtnHtml = canCancel ? `<button onclick="openCancelModal(${__jsq(o.id)},${__jsq(o.machineName||'')})" style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);color:#ff6b6b;padding:5px 14px;border-radius:20px;font-size:12px;font-family:Cairo,sans-serif;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.1)'">` + cancelBtnLabel + `</button>` : '';

    return `
      <div style="background:var(--card);border:1px solid ${isAccepted ? 'rgba(245,147,10,0.35)' : 'var(--border)'};border-radius:16px;padding:20px 22px;margin-bottom:14px;transition:0.3s;" id="order-card-${o.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:${isAccepted ? '16px' : '0'};">
          <div>
            <h3 style="color:white;font-size:16px;margin-bottom:6px;">${__esc(o.machineName||'—')}</h3>
            <span style="color:var(--secondary-light);font-size:13px;">${__esc(o.machineModel||'')}</span>
            <div style="color:var(--muted);font-size:12px;margin-top:6px;">${dateStr}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <span style="background:${cfg.color}22;color:${cfg.color};padding:6px 14px;border-radius:30px;font-size:12px;font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:6px;">
              <span style="width:9px;height:9px;border-radius:50%;background:${cfg.color};display:inline-block;flex-shrink:0;${dotAnim}"></span>
              ${cfg.label}
            </span>
            ${cancelBtnHtml}
          </div>
        </div>
        ${isAccepted ? `
          <div style="border-top:1px solid rgba(245,147,10,0.2);padding-top:16px;margin-top:4px;">
            <p style="color:var(--secondary-light);font-size:13.5px;margin-bottom:14px;font-weight:700;">${__t.acceptedMsg}</p>
            <div id="booking-form-${o.id}" style="display:flex;flex-direction:column;gap:10px;">
              <input type="text" id="book-name-${o.id}" placeholder="${__t.yourName}" style="padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;font-family:'Cairo',sans-serif;outline:none;">
              <input type="tel" id="book-phone-${o.id}" placeholder="${__t.yourPhone}" style="padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;font-family:'Cairo',sans-serif;outline:none;">
              <input type="email" id="book-email-${o.id}" placeholder="${__t.yourEmail}" style="padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;font-family:'Cairo',sans-serif;outline:none;">
              <button onclick="sendBookingEmail(${__jsq(o.id)},${__jsq(o.machineName||'')},${__jsq(o.machineModel||'')})" style="padding:12px;background:linear-gradient(45deg,var(--primary),var(--secondary));border:none;border-radius:25px;color:#fff;font-weight:700;font-size:14px;font-family:'Cairo',sans-serif;cursor:pointer;transition:0.3s;" id="book-btn-${o.id}">${__t.bookBtn}</button>
              <p id="book-msg-${o.id}" style="font-size:12.5px;text-align:center;display:none;"></p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <style>@keyframes pulse-dot{0%,100%{opacity:1;}50%{opacity:0.35;}}</style>
    <h1 style="color:white;font-size:32px;margin-bottom:8px;">طلباتي</h1>
    <div style="width:60px;height:4px;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:4px;margin-bottom:30px;"></div>
    ${guestNote}
    ${rows}
  `;
}

// ===== مودال إلغاء الطلب مع سبب =====
window.openCancelModal = function(orderId, machineName){
  // أنشئ المودال لو مش موجود
  let modal = document.getElementById('cancel-reason-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'cancel-reason-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,22,0.92);backdrop-filter:blur(16px);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif;';
    modal.innerHTML = `
      <div style="background:var(--card);border:1px solid rgba(255,107,107,0.3);border-radius:20px;padding:30px 26px;width:380px;max-width:92vw;position:relative;">
        <h3 id="cancel-modal-title" style="color:#fff;font-size:17px;margin-bottom:6px;"></h3>
        <p id="cancel-reason-label" style="color:var(--muted);font-size:13px;margin-bottom:14px;"></p>
        <textarea id="cancel-reason-input" rows="3"
          style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;font-family:Cairo,sans-serif;outline:none;resize:vertical;margin-bottom:12px;"></textarea>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <button id="cancel-confirm-btn" style="flex:1;padding:12px;background:linear-gradient(45deg,#dc2626,#ef4444);border:none;border-radius:25px;color:#fff;font-weight:700;font-size:14px;font-family:Cairo,sans-serif;cursor:pointer;"></button>
          <button onclick="closeCancelModal()" id="cancel-back-btn" style="flex:1;padding:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:25px;color:var(--text);font-size:14px;font-family:Cairo,sans-serif;cursor:pointer;"></button>
        </div>
        <button id="cancel-skip-btn" style="width:100%;padding:10px;background:transparent;border:1px dashed rgba(255,255,255,0.15);border-radius:25px;color:var(--muted);font-size:13px;font-family:Cairo,sans-serif;cursor:pointer;transition:0.2s;" onmouseover="this.style.borderColor='rgba(255,107,107,0.4)';this.style.color='#ff6b6b';" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='var(--muted)';"></button>
        <p id="cancel-modal-err" style="color:#ff6b6b;font-size:12.5px;text-align:center;margin-top:10px;display:none;"></p>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e=>{ if(e.target===modal) closeCancelModal(); });
  }

  const __tc = (window.UI_TR && (window.UI_TR[getCurrentLang()] || window.UI_TR.ar)) || {};
  document.getElementById('cancel-modal-title').textContent = __tc.cancelTitle + ': ' + machineName;
  document.getElementById('cancel-reason-label').textContent = __tc.cancelReason;
  document.getElementById('cancel-reason-input').placeholder = __tc.cancelReasonPH;
  document.getElementById('cancel-confirm-btn').textContent = __tc.cancelConfirm;
  document.getElementById('cancel-back-btn').textContent = __tc.cancelBack;
  document.getElementById('cancel-skip-btn').textContent = getCurrentLang()==='en' ? 'Skip & Cancel Order' : 'تخطي وإلغاء الطلب فوراً';
  document.getElementById('cancel-reason-input').value = '';
  document.getElementById('cancel-modal-err').style.display = 'none';

  const confirmBtn = document.getElementById('cancel-confirm-btn');
  const skipBtn    = document.getElementById('cancel-skip-btn');
  // استبدل listeners القديمة بجديدة
  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirm);
  const newSkip = skipBtn.cloneNode(true);
  skipBtn.replaceWith(newSkip);
  newConfirm.addEventListener('click', ()=> doCancel(orderId, machineName, false));
  newSkip.addEventListener('click',    ()=> doCancel(orderId, machineName, true));

  modal.style.display = 'flex';
};

window.closeCancelModal = function(){
  const modal = document.getElementById('cancel-reason-modal');
  if(modal) modal.style.display = 'none';
};

async function doCancel(orderId, machineName, skipReason){
  const reason = skipReason ? 'تخطى كتابة السبب' : (document.getElementById('cancel-reason-input').value || '').trim();
  const errEl  = document.getElementById('cancel-modal-err');
  const btn    = skipReason ? document.getElementById('cancel-skip-btn') : document.getElementById('cancel-confirm-btn');
  errEl.style.display = 'none';

  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ جاري الإلغاء...';

  const fb   = window.__fbtools, db = window.__db;
  const user = window.__auth ? window.__auth.currentUser : null;

  let firestoreOk = false;

  // 1) حاول تحديث Firestore
  try{
    await fb.updateDoc(fb.doc(db,'orders',orderId), {
      status: 'ملغي',
      cancelReason: reason || 'لم يذكر سبباً',
      canceledAt: fb.serverTimestamp(),
      canceledByUser: true
    });
    firestoreOk = true;
  }catch(fsErr){
    console.log('Firestore cancel blocked (Rules?):', fsErr.code, fsErr.message);
    // نكمّل — هنبعت إيميل للشركة كبديل
  }

  // 2) إرسال إيميل للشركة في كل الحالات
  try{
    const userName = (user && (user.displayName || user.email)) || 'ضيف';
    await emailjs.send('service_by1zuyk', 'template_tw737x3', {
      from_name : userName,
      phone     : '—',
      from_email: (user && user.email) || '—',
      to_name   : 'الشافعي ستيل',
      message   : `🔴 طلب إلغاء\nالماكينة: ${machineName}\nرقم الطلب: ${orderId}\nالسبب: ${reason || 'لم يذكر سبباً'}\nالعميل: ${userName}\n${firestoreOk ? '✅ تم تحديثه تلقائياً في Firestore' : '⚠ لم يُحدَّث في Firestore (راجع Rules) — يرجى التعديل يدوياً'}`,
    });
  }catch(mailErr){
    console.log('EmailJS cancel notification failed:', mailErr);
  }

  // 3) تحديث الـ UI فورًا بغض النظر عن Firestore
  closeCancelModal();
  const card = document.getElementById('order-card-'+orderId);
  if(card){
    card.style.border = '1px solid rgba(239,68,68,0.35)';
    const badgeEl = card.querySelector('span[style*="border-radius:30px"]');
    if(badgeEl){
      badgeEl.style.color='#ef4444';
      badgeEl.style.background='rgba(239,68,68,0.12)';
      badgeEl.innerHTML='<span style="width:9px;height:9px;border-radius:50%;background:#ef4444;display:inline-block;flex-shrink:0;"></span>ملغي';
    }
    card.querySelectorAll('button').forEach(b=>{ if(b.textContent.includes('إلغاء')) b.remove(); });
  }
  if(typeof showToast==='function') showToast('✅ تم إلغاء الطلب');
  // إخفاء الكارت فوراً من صفحة العميل
  if(card){
    card.style.transition = 'opacity 0.4s ease';
    card.style.opacity = '0';
    setTimeout(()=>{ card.remove(); }, 400);
  }
}

// إرسال بيانات الحجز عبر EmailJS
window.sendBookingEmail = async function(orderId, machineName, machineModel){
  const name  = (document.getElementById('book-name-'+orderId) ||{}).value?.trim();
  const phone = (document.getElementById('book-phone-'+orderId)||{}).value?.trim();
  const email = (document.getElementById('book-email-'+orderId)||{}).value?.trim();
  const msgEl = document.getElementById('book-msg-'+orderId);
  const btn   = document.getElementById('book-btn-'+orderId);

  if(!name || !phone || !email){
    if(msgEl){ msgEl.textContent='⚠ من فضلك اكمل اسمك ورقمك وإيميلك'; msgEl.style.color='#ff6b6b'; msgEl.style.display='block'; }
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...';

  try{
    // إرسال عبر EmailJS (نفس الـ service_id و template موجودين في الموقع)
    await emailjs.send('service_by1zuyk', 'template_tw737x3', {
      from_name : name,
      phone     : phone,
      from_email: email,
      message   : `طلب حجز موعد\nالماكينة: ${machineName}\nالموديل: ${machineModel}\nالاسم: ${name}\nالهاتف: ${phone}\nالإيميل: ${email}`,
      to_name   : 'الشافعي ستيل',
    });
    const form = document.getElementById('booking-form-'+orderId);
    if(form) form.innerHTML = '<p style="color:#22c55e;font-size:14px;font-weight:700;text-align:center;padding:10px 0;">✅ تم إرسال بياناتك بنجاح! سنتواصل معك قريباً لتأكيد الموعد.</p>';
  }catch(err){
    console.log('تعذر إرسال الحجز:', err);
    btn.disabled = false; btn.textContent = '📅 إرسال وحجز موعد';
    if(msgEl){ msgEl.textContent='❌ حصل خطأ في الإرسال، حاول تاني'; msgEl.style.color='#ff6b6b'; msgEl.style.display='block'; }
  }
};

// ---------- صفحة "حسابي" — تعديل الاسم / الهاتف / الإيميل / كلمة السر ----------
window.openAccountSettings = function(){
  const menu = document.getElementById('user-menu');
  if(menu) menu.classList.remove('active');
  const user = auth.currentUser;
  if(!user){ openAuthModal(); return; }
  if(user.isAnonymous){
    alert('عشان تعدّل بيانات حساب، لازم تعمل حساب دائم الأول (مش بمتابعة كضيف).');
    openAuthModal();
    return;
  }
  renderAccountSettingsPage(user);
};

async function renderAccountSettingsPage(user){
  const overlay = document.getElementById('page-overlay');
  const content = document.getElementById('page-content');

  let phone = '';
  try{
    const snap = await getDoc(doc(db,'users',user.uid));
    if(snap.exists()) phone = snap.data().phone || '';
  }catch(e){
    console.log('تعذر تحميل بيانات الحساب (تحقّق من Firestore Rules لمجموعة users):', e);
  }

  const __ta = (window.UI_TR||{})[getCurrentLang()] || (window.UI_TR||{ar:{}}).ar;
  content.innerHTML = `
    <h1 style="color:white;font-size:32px;margin-bottom:8px;">${__ta.myAccount}</h1>
    <div style="width:60px;height:4px;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:4px;margin-bottom:30px;"></div>

    <div id="acct-verify-box" style="display:${user.emailVerified ? 'none' : 'flex'};margin-bottom:24px;padding:16px 20px;background:rgba(245,147,10,0.08);border:1px solid rgba(232,160,32,0.25);border-radius:14px;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
      <span style="color:var(--secondary-light);font-size:14px;">${__ta.verifyWarning}</span>
      <button onclick="resendVerification()" id="acct-resend-btn" style="background:var(--secondary);border:none;color:#090f1a;padding:8px 18px;border-radius:30px;font-weight:700;font-size:13px;cursor:pointer;">${__ta.resendVerify}</button>
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:18px;padding:30px;max-width:480px;display:flex;flex-direction:column;gap:16px;">

      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="acct-label">${__ta.nameLabel}</label>
        <input type="text" id="acct-name" class="acct-input" value="${(user.displayName||'').replace(/"/g,'&quot;')}">
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="acct-label">${__ta.phoneLabel}</label>
        <input type="tel" id="acct-phone" class="acct-input" value="${phone.replace(/"/g,'&quot;')}">
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="acct-label">${__ta.emailLabel}</label>
        <input type="email" id="acct-email" class="acct-input" value="${(user.email||'').replace(/"/g,'&quot;')}">
        <span style="font-size:12px;color:var(--muted);">${__ta.emailNote}</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="acct-label">${__ta.newPassLabel} <span style="color:var(--muted);">${__ta.newPassNote}</span></label>
        <input type="password" id="acct-newpass" class="acct-input" placeholder="6+">
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--border);padding-top:16px;">
        <label class="acct-label">${__ta.currPassLabel} <span style="color:var(--secondary-light);">${__ta.currPassNote}</span></label>
        <input type="password" id="acct-currentpass" class="acct-input">
      </div>

      <span class="auth-error" id="acct-error"></span>
      <span id="acct-success" style="color:#22c55e;font-size:13px;display:none;text-align:center;"></span>

      <button class="auth-submit-btn" id="acct-save-btn" onclick="saveAccountSettings()">${__ta.saveBtn}</button>
    </div>
  `;

  overlay.style.display = 'block';
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

window.resendVerification = async function(){
  const user = auth.currentUser;
  if(!user) return;
  const btn = document.getElementById('acct-resend-btn');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }
  try{
    await sendEmailVerification(user);
    if(typeof showToast==='function') showToast('✅ تم إرسال رابط التأكيد، تحقّق من بريدك');
  }catch(err){
    if(typeof showToast==='function') showToast('❌ '+arabicAuthError(err));
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = 'إعادة إرسال رابط التأكيد'; }
  }
};

window.saveAccountSettings = async function(){
  const user = auth.currentUser;
  if(!user) return;

  const btn   = document.getElementById('acct-save-btn');
  const errEl = document.getElementById('acct-error');
  const okEl  = document.getElementById('acct-success');
  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  const newName  = document.getElementById('acct-name').value.trim();
  const newPhone = document.getElementById('acct-phone').value.trim();
  const newEmail = document.getElementById('acct-email').value.trim();
  const newPass  = document.getElementById('acct-newpass').value;
  const curPass  = document.getElementById('acct-currentpass').value;

  if(!newName || !newPhone || !newEmail){
    errEl.textContent = 'من فضلك اكمل الاسم والهاتف والإيميل';
    errEl.style.display = 'block';
    return;
  }

  const emailChanged    = newEmail !== user.email;
  const wantsPassChange = newPass.length > 0;

  if((emailChanged || wantsPassChange) && !curPass){
    errEl.textContent = 'اكتب كلمة السر الحالية لتأكيد تغيير الإيميل أو كلمة السر';
    errEl.style.display = 'block';
    return;
  }
  if(wantsPassChange && newPass.length < 6){
    errEl.textContent = 'كلمة السر الجديدة لازم تكون 6 أحرف على الأقل';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';

  try{
    if(emailChanged || wantsPassChange){
      const cred = EmailAuthProvider.credential(user.email, curPass);
      await reauthenticateWithCredential(user, cred);
    }

    if(newName !== (user.displayName||'')){
      await updateProfile(user, { displayName: newName });
    }

    await setDoc(doc(db,'users',user.uid), { name:newName, phone:newPhone, email:user.email }, { merge:true });

    let emailMsg = '';
    if(emailChanged){
      await verifyBeforeUpdateEmail(user, newEmail);
      emailMsg = ' وبعتنا لينك تأكيد على إيميلك الجديد — الإيميل هيتغيّر فعليًا بعد ما تفتح اللينك.';
    }

    if(wantsPassChange){
      await updatePassword(user, newPass);
    }

    updateAccountUI(auth.currentUser);
    okEl.textContent = '✅ تم حفظ التعديلات.' + emailMsg;
    okEl.style.display = 'block';
    document.getElementById('acct-currentpass').value = '';
    document.getElementById('acct-newpass').value = '';
    if(typeof showToast==='function') showToast('✅ تم حفظ بيانات الحساب');
  }catch(err){
    errEl.textContent = arabicAuthError(err);
    errEl.style.display = 'block';
  }finally{
    btn.disabled = false; btn.textContent = 'حفظ التعديلات';
  }
};

// ---------- تسجيل كل طلب "اطلب الآن" في Firestore عشان يظهر في صفحة "طلباتي" ----------
document.addEventListener('click', function(e){
  const btnEl = e.target.closest('.order-btn');
  if(!btnEl) return;
  const user = auth.currentUser;
  if(!user) return; // زائر مش مسجل دخول أصلاً — مفيش حساب نربط الطلب بيه

  let machineName = '', machineModel = '';
  if(btnEl.id === 'qv-order-btn'){
    machineName  = (document.getElementById('qv-name')  || {}).innerText || '';
    machineModel = (document.getElementById('qv-model') || {}).innerText || '';
  } else {
    const card = btnEl.closest('.machine-card');
    if(card){
      machineName  = (card.querySelector('h3') || {}).innerText || '';
      machineModel = (card.querySelector('.machine-model') || {}).innerText || '';
    }
  }
  if(!machineName) return;

  const clientName  = user.displayName || user.email || 'عميل';
  const clientEmail = user.email || '';

  addDoc(collection(db,'orders'), {
    uid: user.uid,
    userName: clientName,
    userEmail: clientEmail,
    machineName, machineModel,
    status: 'قيد المراجعة',
    createdAt: serverTimestamp()
  }).then(()=>{
    // إشعار للشركة بالطلب الجديد
    try{
      emailjs.send('service_by1zuyk','template_tw737x3',{
        from_name: clientName, name: clientName, phone: '—',
        from_email: clientEmail || '—', email: clientEmail || '—', to_name: 'الشافعي ستيل',
        message: `🟢 طلب جديد (قيد المراجعة)\nالماكينة: ${machineName}\nالموديل: ${machineModel}\nالعميل: ${clientName}\nالإيميل: ${clientEmail || '—'}`
      }).catch(e=>console.log('تعذر إرسال إشعار الطلب للشركة:',e));
    }catch(e){ console.log('EmailJS:',e); }
    // إرسال تأكيد استلام للعميل
    if(clientEmail){
      emailjs.send('service_by1zuyk','template_hb5d728',{
        client_email : clientEmail,
        client_name  : clientName,
        subject      : '✅ استلمنا طلبك — شركة الشافعي ستيل',
        message      : `تم استلام طلبك بنجاح!\n\nالماكينة: ${machineName}\nالموديل: ${machineModel}\n\nسنتواصل معك خلال 48 ساعة.`
      }).catch(e=>console.log('تعذر إرسال تأكيد الطلب:',e));
    }
  }).catch(err=>console.log('تعذر تسجيل الطلب (تحقّق من Firestore Rules لمجموعة orders):', err));
});

// ---------- تتبع حالة الدخول وتحديث شكل أيقونة الناف بار ----------
const accountIconSVG = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

function updateAccountUI(user){
  const btn = document.getElementById('nav-account-btn');
  if(!btn) return;

  // إظهار/إخفاء زرار الداشبورد بناءً على الإيميل
  const trigger = document.getElementById('admin-trigger');
  if(trigger){
    const isAdmin = user && user.email && user.email.toLowerCase() === SITE_ADMIN_EMAIL.toLowerCase();
    trigger.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
  }

  if(user && !user.isAnonymous){
    const name = user.displayName || user.email || 'حسابي';
    const initial = name.trim().charAt(0).toUpperCase();
    if(user.photoURL){
      btn.innerHTML = '<img loading="lazy" decoding="async" src="'+user.photoURL+'" alt="'+initial+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
    } else {
      btn.innerHTML = '<span style="font-size:14px;font-weight:800;">'+initial+'</span>';
    }
    btn.setAttribute('onclick','toggleUserMenu()');
    const greetWord = getCurrentLang()==='en' ? 'Hello, ' : 'أهلاً، ';
    document.getElementById('user-greeting').textContent = greetWord+name;
  } else if(user && user.isAnonymous){
    btn.innerHTML = accountIconSVG;
    btn.setAttribute('onclick','toggleUserMenu()');
    const greetLang = getCurrentLang();
    document.getElementById('user-greeting').textContent = greetLang==='en' ? 'Browsing as Guest' : 'دخلت كضيف';
  } else {
    btn.innerHTML = accountIconSVG;
    btn.setAttribute('onclick','openAuthModal()');
  }
}

// ---------- توست بسيط (مش إجباري) بيظهر تحت الشاشة بدل ما نفتح مودال إجباري ----------
function afterPageLoad(fn){
  if(document.readyState === 'complete') fn();
  else window.addEventListener('load', fn);
}

var __promptShownMem = false;
function promptAlreadyShown(){
  try{ return !!sessionStorage.getItem('authPromptShown'); }catch(e){ return __promptShownMem; }
}
function markPromptShown(){
  __promptShownMem = true;
  try{ sessionStorage.setItem('authPromptShown','1'); }catch(e){}
}

function tryAutoOpenAuthPrompt(user){
  if(user) return; // مسجل دخول أصلاً (حتى لو كضيف) — مفيش داعي نضايقه
  if(promptAlreadyShown()) return; // ظهرله قبل كده في الزيارة دي
  afterPageLoad(function(){
    setTimeout(function(){
      if(promptAlreadyShown()) return;
      if(document.getElementById('auth-modal').classList.contains('active')) return;
      markPromptShown();
      showLoginToast();
    }, 1200);
  });
}

function showLoginToast(){
  const toast = document.getElementById('login-toast');
  if(!toast) return;
  toast.classList.add('active');
}

window.closeLoginToast = function(){
  const toast = document.getElementById('login-toast');
  if(toast) toast.classList.remove('active');
};

window.acceptLoginToast = function(){
  closeLoginToast();
  pointArrowToAccountIcon();
};

function pointArrowToAccountIcon(){
  const btn = document.getElementById('nav-account-btn');
  const arrow = document.getElementById('account-pointer-arrow');
  if(!btn || !arrow) return;
  const rect = btn.getBoundingClientRect();
  arrow.style.top = (rect.bottom + window.scrollY + 8) + 'px';
  arrow.style.left = (rect.left + rect.width/2) + 'px';
  arrow.classList.add('active');
  setTimeout(function(){ arrow.classList.remove('active'); }, 5000);
  btn.addEventListener('click', function(){ arrow.classList.remove('active'); }, {once:true});
}

let __authStateResolvedOnce = false;
onAuthStateChanged(auth, (user)=>{
  updateAccountUI(user);
  try{
    if(!user) localStorage.removeItem('shafei_user');
    else if(user.isAnonymous) localStorage.setItem('shafei_user', JSON.stringify({anon:1}));
    else localStorage.setItem('shafei_user', JSON.stringify({name: user.displayName || user.email || '', anon:0}));
  }catch(e){}
  if(window.__pendingAuthOpen){
    window.__pendingAuthOpen = false;
    if(user && !user.isAnonymous){
      var um = document.getElementById('user-menu'); if(um) um.classList.add('active');
    } else if(typeof window.openAuthModal === 'function'){
      window.openAuthModal();
    }
  }
  if(!__authStateResolvedOnce){
    __authStateResolvedOnce = true;
    tryAutoOpenAuthPrompt(user);
  }
});

window.toggleUserMenu = function(){
  document.getElementById('user-menu').classList.toggle('active');
};

document.addEventListener('click', function(e){
  const menu = document.getElementById('user-menu');
  const btn = document.getElementById('nav-account-btn');
  if(menu && menu.classList.contains('active') && !menu.contains(e.target) && !btn.contains(e.target)){
    menu.classList.remove('active');
  }
});
})().catch(function(e){ console.error(e); });
