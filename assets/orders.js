/* ===== تسجيل طلبات "اطلب عبر واتساب" في Firestore من أي صفحة (ماكينات / منتجات / من نحن) =====
   بيتحمّل فيربيس بس لما العميل يضغط على زرار طلب (أو يقرّب منه)، فمفيش تقل على الصفحة.
   الطلب بيتسجل لو العميل مسجّل دخول (حساب أو ضيف)، وبيظهر في "طلباتي" وفي لوحة التحكم. */
(function(){
  var FB = 'https://www.gstatic.com/firebasejs/12.15.0/';
  var CFG = {
    apiKey: "AIzaSyDykzp2_4SJr7DjLkAmvHFSnCxXs_Ee9L0",
    authDomain: "alshafei-steel.firebaseapp.com",
    projectId: "alshafei-steel",
    storageBucket: "alshafei-steel.firebasestorage.app",
    messagingSenderId: "832213850052",
    appId: "1:832213850052:web:3ab2444ed8b0df12793691"
  };
  var ready = null, last = {};

  function load(){
    if(ready) return ready;
    ready = Promise.all([
      import(FB + 'firebase-app.js'),
      import(FB + 'firebase-auth.js'),
      import(FB + 'firebase-firestore.js')
    ]).then(function(m){
      var app  = m[0].initializeApp(CFG);          // نفس الـ default app عشان الجلسة تتعرف
      var auth = m[1].getAuth(app);
      var db   = m[2].getFirestore(app);
      return auth.authStateReady().then(function(){ return { auth: auth, db: db, fs: m[2] }; });
    });
    ready.catch(function(){ ready = null; });
    return ready;
  }

  function clean(t){ return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }

  // لو الرابط رابط واتساب بسؤال عن ماكينة، بيرجّع اسمها وموديلها
  function parse(a){
    var href = a.getAttribute('href') || '';
    if(!/(wa\.me\/\d+|api\.whatsapp\.com\/send\?[^#]*phone=)/.test(href)) return null;
    var text = '';
    try{ text = new URL(href, location.href).searchParams.get('text') || ''; }
    catch(e){ try{ text = decodeURIComponent((href.split('text=')[1] || '')); }catch(_){} }
    if(!/الاستفسار|inquire|inquiry/i.test(text)) return null;

    var name = '', model = '';
    var card = a.closest('.machine-card');
    if(card){
      var h3 = card.querySelector('h3'), mm = card.querySelector('.machine-model');
      name  = h3 ? clean(h3.textContent) : '';
      model = mm ? clean(mm.textContent).replace(/^Model\s*/i, '') : '';
    }else{
      var h1 = document.querySelector('h1');
      name = h1 ? clean(h1.textContent) : '';
    }
    if(!model){
      var m = text.match(/Model\s*:?\s*(ASH-[A-Za-z0-9]+)/i) || text.match(/الموديل\s*:?\s*(\S+)/);
      if(m) model = m[1];
    }
    if(!name){
      var n = text.match(/(?:الاستفسار عن:?|inquire about(?: the)?)\s*([^\n]+?)(?:\s*Model|\s*\n|$)/i);
      if(n) name = clean(n[1]);
    }
    return name ? { name: name, model: model } : null;
  }

  function sendConfirm(u, info){
    function go(){
      try{
        window.emailjs.init('WSWaB5SCkxRR4nwLe');
        // إشعار للشركة بالطلب الجديد
        window.emailjs.send('service_by1zuyk', 'template_tw737x3', {
          from_name: u.displayName || u.email || 'ضيف', name: u.displayName || u.email || 'ضيف', phone: '—',
          from_email: u.email || '—', email: u.email || '—', to_name: 'الشافعي ستيل',
          message: '🟢 طلب جديد (قيد المراجعة)\nالماكينة: ' + info.name + '\nالموديل: ' + info.model +
                   '\nالعميل: ' + (u.displayName || u.email || 'ضيف') + '\nالإيميل: ' + (u.email || '—')
        }).catch(function(e){ console.log('تعذر إرسال إشعار الطلب للشركة:', e); });
      }catch(e){ console.log('EmailJS:', e); }
      if(!u.email || u.isAnonymous) return;
      try{
        window.emailjs.init('WSWaB5SCkxRR4nwLe');
        window.emailjs.send('service_by1zuyk', 'template_hb5d728', {
          client_email: u.email,
          client_name:  u.displayName || u.email,
          subject: '✅ استلمنا طلبك — شركة الشافعي ستيل',
          message: 'تم استلام طلبك بنجاح!\n\nالماكينة: ' + info.name + '\nالموديل: ' + info.model + '\n\nسنتواصل معك خلال 48 ساعة.'
        }).catch(function(e){ console.log('تعذر إرسال تأكيد الطلب:', e); });
      }catch(e){ console.log('EmailJS:', e); }
    }
    if(window.emailjs) return go();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = go;
    document.head.appendChild(s);
  }

  function record(info){
    load().then(function(r){
      var u = r.auth.currentUser;
      if(!u) return; // زائر مش مسجّل دخول — مفيش حساب نربط الطلب بيه
      return r.fs.addDoc(r.fs.collection(r.db, 'orders'), {
        uid: u.uid,
        userName: u.displayName || u.email || 'ضيف',
        userEmail: u.email || '',
        machineName: info.name,
        machineModel: info.model,
        status: 'قيد المراجعة',
        createdAt: r.fs.serverTimestamp()
      }).then(function(){ sendConfirm(u, info); });
    }).catch(function(err){
      console.log('تعذر تسجيل الطلب (تحقّق من Firestore Rules لمجموعة orders):', err);
    });
  }

  function linkOf(e){ return e.target && e.target.closest ? e.target.closest('a[href]') : null; }

  // تحميل مسبق لما العميل يقرّب من زرار الطلب، عشان يبقى جاهز وقت الضغط
  ['pointerover', 'touchstart', 'focusin'].forEach(function(ev){
    document.addEventListener(ev, function(e){
      var a = linkOf(e);
      if(a && parse(a)) load();
    }, { capture: true, passive: true });
  });

  document.addEventListener('click', function(e){
    var a = linkOf(e);
    if(!a) return;
    var info = parse(a);
    if(!info) return;
    var key = info.name + '|' + info.model, now = Date.now();
    if(last[key] && now - last[key] < 15000) return; // منع التسجيل المكرر لنفس الماكينة
    last[key] = now;
    record(info);
  }, true);
})();
