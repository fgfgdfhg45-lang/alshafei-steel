/* ===== تقييم النجوم لكل ماكينة (جوه صفحة الماكينة) =====
   - بيتحمّل فيربيس بس لما الصندوق يقرّب من الشاشة (مفيش تقل على الصفحة).
   - أي عميل مسجّل بحساب (مش ضيف) يقدر يدي نجوم من 1 لـ 5 مرة واحدة للماكينة، وممكن يغيّرها.
   - Firestore: collection machine_ratings، رقم المستند = <اسم-الماكينة>_<uid>. */
(function(){
  var box = document.getElementById('mr-box');
  if(!box) return;
  var EN = /\/en(\/|$)/.test(location.pathname);
  var slug = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  if(!slug) return;
  var T = EN ? {
    first:'No ratings yet — be the first to rate', count:function(n){ return n + (n === 1 ? ' rating' : ' ratings'); },
    hint:'Tap a star to rate this machine', mine:'Your rating: ', change:' — tap a star to change it',
    signin:'Signing in with Google...', fail:'Could not save your rating, please try again.',
    need:'Sign in with your account to rate', saved:'Thanks for rating!'
  } : {
    first:'لسه مفيش تقييمات — كن أول من يقيّم', count:function(n){ return n === 1 ? 'تقييم واحد' : (n === 2 ? 'تقييمان' : n + (n > 10 ? ' تقييم' : ' تقييمات')); },
    hint:'اضغط على نجمة لتقييم الماكينة', mine:'تقييمك: ', change:' — اضغط على نجمة لتغييره',
    signin:'جاري تسجيل الدخول بجوجل...', fail:'تعذر حفظ التقييم، حاول تاني.',
    need:'سجّل دخولك بحسابك علشان تقيّم', saved:'شكرًا لتقييمك!'
  };
  var FB = 'https://www.gstatic.com/firebasejs/12.15.0/';
  var CFG = { apiKey:"AIzaSyDykzp2_4SJr7DjLkAmvHFSnCxXs_Ee9L0", authDomain:"alshafei-steel.firebaseapp.com",
    projectId:"alshafei-steel", storageBucket:"alshafei-steel.firebasestorage.app",
    messagingSenderId:"832213850052", appId:"1:832213850052:web:3ab2444ed8b0df12793691" };
  var ready = null, avg = 0, n = 0, myRating = 0, started = false;

  /* ---------- الشكل ---------- */
  box.style.cssText = 'margin:2px 0 14px;';
  box.innerHTML = '';
  var starsWrap = document.createElement('span');
  starsWrap.style.cssText = 'position:relative;display:inline-block;font-size:26px;line-height:1;letter-spacing:3px;direction:ltr;cursor:pointer;vertical-align:middle;';
  var base = document.createElement('span'); base.textContent = '★★★★★'; base.style.color = 'rgba(255,255,255,0.22)';
  var fill = document.createElement('span'); fill.textContent = '★★★★★';
  fill.style.cssText = 'position:absolute;top:0;left:0;color:#f5c842;overflow:hidden;white-space:nowrap;width:0;pointer-events:none;';
  starsWrap.appendChild(base); starsWrap.appendChild(fill);
  var info = document.createElement('span');
  info.style.cssText = 'color:var(--muted);font-size:13px;margin-inline-start:10px;vertical-align:middle;';
  var msg = document.createElement('div');
  msg.style.cssText = 'font-size:12px;color:var(--muted);margin-top:4px;min-height:16px;';
  box.appendChild(starsWrap); box.appendChild(info); box.appendChild(msg);
  starsWrap.setAttribute('role','group');

  function setFill(v){ fill.style.width = Math.max(0, Math.min(5, v)) / 5 * 100 + '%'; }
  function paint(){
    setFill(myRating || avg);
    if(n){ info.textContent = avg.toFixed(1) + ' ★  (' + T.count(n) + ')'; info.style.color = '#fff'; }
    else { info.textContent = T.first; info.style.color = ''; }
    msg.textContent = myRating ? (T.mine + myRating + ' / 5' + T.change) : T.hint;
  }
  paint();

  function starFromEvent(e){
    var r = starsWrap.getBoundingClientRect();
    var x = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX) - r.left;
    return Math.max(1, Math.min(5, Math.ceil(x / r.width * 5)));
  }
  starsWrap.addEventListener('mousemove', function(e){ setFill(starFromEvent(e)); });
  starsWrap.addEventListener('mouseleave', function(){ setFill(myRating || avg); });
  starsWrap.addEventListener('click', function(e){ rate(starFromEvent(e)); });

  /* ---------- فيربيس ---------- */
  function load(){
    if(ready) return ready;
    ready = Promise.all([
      import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')
    ]).then(function(m){
      var app = m[0].getApps().length ? m[0].getApp() : m[0].initializeApp(CFG);
      var auth = m[1].getAuth(app), db = m[2].getFirestore(app);
      return auth.authStateReady().then(function(){ return { auth:auth, db:db, a:m[1], fs:m[2] }; });
    });
    ready.catch(function(){ ready = null; });
    return ready;
  }

  function refresh(){
    return load().then(function(r){
      return r.fs.getDocs(r.fs.query(r.fs.collection(r.db,'machine_ratings'), r.fs.where('machine','==',slug))).then(function(snap){
        var sum = 0, c = 0, uid = r.auth.currentUser && !r.auth.currentUser.isAnonymous ? r.auth.currentUser.uid : null;
        myRating = 0;
        snap.forEach(function(d){
          var v = d.data(); if(!(v.rating >= 1 && v.rating <= 5)) return;
          sum += v.rating; c++;
          if(uid && v.uid === uid) myRating = v.rating;
        });
        n = c; avg = c ? sum / c : 0; paint();
      });
    }).catch(function(e){ console.log('تعذر تحميل تقييم الماكينة:', e); });
  }

  function rate(stars){
    msg.style.color = '';
    load().then(function(r){
      var u = r.auth.currentUser;
      var step = (u && !u.isAnonymous) ? Promise.resolve(u) : (function(){
        msg.textContent = T.signin;
        return r.a.signInWithPopup(r.auth, new r.a.GoogleAuthProvider()).then(function(cr){ return cr.user; });
      })();
      return step.then(function(user){
        return r.fs.setDoc(r.fs.doc(r.db,'machine_ratings', slug + '_' + user.uid), {
          machine: slug, uid: user.uid, rating: stars, createdAt: r.fs.serverTimestamp()
        });
      }).then(function(){ return refresh(); }).then(function(){ msg.textContent = T.saved + ' ' + msg.textContent; });
    }).catch(function(e){
      console.log('تقييم الماكينة:', e);
      if(e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')){ paint(); return; }
      msg.textContent = (e && e.code === 'auth/popup-blocked') ? T.need : T.fail; msg.style.color = '#ff8a8a';
    });
  }

  function start(){ if(started) return; started = true; refresh(); }
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es, ob){
      if(es[0].isIntersecting){ ob.disconnect(); start(); }
    }, { rootMargin:'300px' }).observe(box);
  } else start();
})();
