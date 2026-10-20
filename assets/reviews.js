/* ===== تقييمات العملاء — الرئيسية (عربي / إنجليزي) =====
   - أي عميل مسجّل بحساب (مش ضيف) يقدر يكتب تقييم واحد (نجوم + تعليق) ويعدّله بعدين.
   - التقييمات بتتخزن في Firestore (collection: reviews، رقم المستند = uid العميل).
   - المتوسط والعدد والأعمدة اللي فوق بتتحسب من التقييمات الأصلية (14) + التقييمات الجديدة.
   - الإدارة بتحذف أي تقييم من الداشبورد (تاب التقييمات). */
(function(){
  var EN = /\/en(\/|$)/.test(location.pathname);
  // التقييمات الأصلية الموجودة في الصفحة: 11 × 5 نجوم، 2 × 4 نجوم، 1 × 3 نجوم
  var BASE = {5:11, 4:2, 3:1, 2:0, 1:0};
  var T = EN ? {
    based:'Based on %n real reviews', write:'Write your review', edit:'Edit your review',
    title:'Rate your experience with us', name:'Your name', ph:'Tell us about your experience (10 characters minimum)',
    send:'Submit review', cancel:'Cancel', thanks:'Thank you! Your review has been published.',
    need:'Please sign in with your account to write a review.', pickStars:'Please choose a star rating.',
    short:'Please write at least 10 characters.', err:'Could not save your review, please try again.',
    sending:'Sending...', member:'Customer', country:'Select your country', needCountry:'Please select your country.'
  } : {
    based:'بناءً على %n تقييم حقيقي', write:'اكتب تقييمك', edit:'عدّل تقييمك',
    title:'قيّم تجربتك معنا', name:'اسمك', ph:'احكي لنا عن تجربتك (10 حروف على الأقل)',
    send:'نشر التقييم', cancel:'إلغاء', thanks:'شكرًا لك! تم نشر تقييمك.',
    need:'سجّل دخولك بحسابك الأول علشان تكتب تقييم.', pickStars:'اختار عدد النجوم.',
    short:'اكتب 10 حروف على الأقل.', err:'تعذر حفظ التقييم، حاول تاني.',
    sending:'جاري الإرسال...', member:'عميل', country:'اختر دولتك', needCountry:'اختار دولتك.'
  };
  var COLORS = ['linear-gradient(135deg,#1a6b3c,#22c55e)','linear-gradient(135deg,#7c3aed,#a78bfa)',
                'linear-gradient(135deg,#b45309,#f59e0b)','linear-gradient(135deg,#0369a1,#38bdf8)',
                'linear-gradient(135deg,#be123c,#fb7185)'];

  // [كود الدولة، عربي، إنجليزي]
  var COUNTRIES = [
    ['EG','مصر','Egypt'],['SA','السعودية','Saudi Arabia'],['AE','الإمارات','United Arab Emirates'],['KW','الكويت','Kuwait'],
    ['QA','قطر','Qatar'],['BH','البحرين','Bahrain'],['OM','عُمان','Oman'],['JO','الأردن','Jordan'],['LB','لبنان','Lebanon'],
    ['SY','سوريا','Syria'],['IQ','العراق','Iraq'],['PS','فلسطين','Palestine'],['YE','اليمن','Yemen'],['SD','السودان','Sudan'],
    ['LY','ليبيا','Libya'],['TN','تونس','Tunisia'],['DZ','الجزائر','Algeria'],['MA','المغرب','Morocco'],['MR','موريتانيا','Mauritania'],
    ['SO','الصومال','Somalia'],['DJ','جيبوتي','Djibouti'],['KM','جزر القمر','Comoros'],
    ['TR','تركيا','Turkey'],['NG','نيجيريا','Nigeria'],['KE','كينيا','Kenya'],['ET','إثيوبيا','Ethiopia'],['GH','غانا','Ghana'],
    ['ZA','جنوب أفريقيا','South Africa'],['IT','إيطاليا','Italy'],['DE','ألمانيا','Germany'],['FR','فرنسا','France'],
    ['ES','إسبانيا','Spain'],['GB','المملكة المتحدة','United Kingdom'],['US','الولايات المتحدة','United States'],
    ['CA','كندا','Canada'],['RU','روسيا','Russia'],['IN','الهند','India'],['PK','باكستان','Pakistan'],['CN','الصين','China'],
    ['ID','إندونيسيا','Indonesia'],['MY','ماليزيا','Malaysia'],['GR','اليونان','Greece'],['RO','رومانيا','Romania'],['UA','أوكرانيا','Ukraine']
  ];
  function cname(code){
    for(var i = 0; i < COUNTRIES.length; i++) if(COUNTRIES[i][0] === code) return EN ? COUNTRIES[i][2] : COUNTRIES[i][1];
    return '';
  }
  // صورة علم (بتشتغل على كل الأجهزة، وويندوز مبيعرضش الإيموجي كعلم)
  function flagImg(code){
    var i = document.createElement('img'); var c = code.toLowerCase();
    i.src = 'https://flagcdn.com/24x18/' + c + '.png';
    i.srcset = 'https://flagcdn.com/48x36/' + c + '.png 2x';
    i.width = 18; i.height = 14; i.alt = code; i.loading = 'lazy';
    i.style.cssText = 'vertical-align:middle;border-radius:2px;margin-inline-end:5px;';
    return i;
  }
  // تحويل إيموجي الأعلام في التقييمات الأصلية لصور علم (عشان تظهر على ويندوز)
  function upgradeStaticFlags(){
    var cards = document.querySelectorAll('#rv-grid .review-card:not(.rv-dyn)');
    Array.prototype.forEach.call(cards, function(card){
      var divs = card.querySelectorAll('div');
      Array.prototype.forEach.call(divs, function(d){
        if(d.children.length) return;
        var m = d.textContent.match(/^\s*([\uD83C][\uDDE6-\uDDFF])([\uD83C][\uDDE6-\uDDFF])\s*(.*)$/);
        if(!m) return;
        var code = String.fromCharCode(m[1].charCodeAt(1) - 0xDDE6 + 65, m[2].charCodeAt(1) - 0xDDE6 + 65);
        d.textContent = '';
        d.appendChild(flagImg(code));
        d.appendChild(document.createTextNode(m[3]));
      });
    });
  }
  var rows = [], mine = null, rating = 0;

  function $(id){ return document.getElementById(id); }
  function stars(n){ n = Math.max(0, Math.min(5, Math.round(n))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  function el(tag, css, txt){ var e = document.createElement(tag); if(css) e.style.cssText = css; if(txt != null) e.textContent = txt; return e; }

  function ready(cb){
    var tries = 0;
    (function wait(){
      if(window.__db && window.__auth && window.__fbtools) return cb();
      if(++tries > 80) return;           // بنحاول ~20 ثانية ونوقف
      setTimeout(wait, 250);
    })();
  }

  /* ---------- الملخص اللي فوق ---------- */
  function renderSummary(){
    var c = { 5:BASE[5], 4:BASE[4], 3:BASE[3], 2:BASE[2], 1:BASE[1] };
    rows.forEach(function(r){ if(c[r.rating] != null) c[r.rating]++; });
    var total = 0, sum = 0;
    for(var k = 1; k <= 5; k++){ total += c[k]; sum += c[k] * k; }
    if(!total) return;
    var avg = (sum / total).toFixed(1);
    if($('rv-avg'))   $('rv-avg').textContent = avg;
    if($('rv-stars')) $('rv-stars').textContent = stars(sum / total);
    if($('rv-count')){
      $('rv-count').removeAttribute('data-translate');   // عشان المترجم ما يرجّع الرقم القديم
      $('rv-count').textContent = T.based.replace('%n', total);
    }
    var bars = $('rv-bars');
    if(!bars) return;
    bars.innerHTML = '';
    [5,4,3,2,1].forEach(function(s){
      if(!c[s] && s < 3) return;
      var row = el('div','display:flex;align-items:center;gap:8px;');
      row.appendChild(el('span','color:#f5c842;font-size:13px;', stars(s)));
      var track = el('div','width:120px;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;');
      track.appendChild(el('div','height:100%;background:linear-gradient(90deg,#f5c842,#f5930a);border-radius:4px;width:' + (c[s] / total * 100).toFixed(1) + '%;'));
      row.appendChild(track);
      row.appendChild(el('span','color:var(--muted);font-size:12px;', String(c[s])));
      bars.appendChild(row);
    });
  }

  /* ---------- كروت التقييمات الجديدة ---------- */
  function renderCards(){
    var grid = $('rv-grid');
    if(!grid) return;
    Array.prototype.slice.call(grid.querySelectorAll('.rv-dyn')).forEach(function(n){ n.remove(); });
    var first = grid.firstChild;
    rows.forEach(function(r){
      var card = el('div','background:linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:26px;position:relative;overflow:hidden;');
      card.className = 'review-card rv-dyn';
      var head = el('div','display:flex;align-items:center;gap:12px;margin-bottom:16px;');
      var nm = (r.name || T.member).trim();
      var h = 0; for(var i = 0; i < r.id.length; i++) h = (h * 31 + r.id.charCodeAt(i)) >>> 0;
      head.appendChild(el('div','width:46px;height:46px;border-radius:50%;background:' + COLORS[h % COLORS.length] + ';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;flex-shrink:0;', nm.charAt(0).toUpperCase()));
      var who = el('div');
      who.appendChild(el('div','color:white;font-weight:700;font-size:15px;', nm));
      if(r.country && cname(r.country)){
        var cl = el('div','color:var(--muted);font-size:12px;');
        cl.appendChild(flagImg(r.country)); cl.appendChild(document.createTextNode(cname(r.country)));
        who.appendChild(cl);
      }
      head.appendChild(who);
      head.appendChild(el('div','margin-inline-start:auto;color:#f5c842;font-size:16px;', stars(r.rating)));
      card.appendChild(head);
      card.appendChild(el('p','color:rgba(255,255,255,0.75);font-size:13.5px;line-height:1.7;margin:0;white-space:pre-line;', '"' + r.text + '"'));
      grid.insertBefore(card, first);
    });
  }

  function load(){
    var fb = window.__fbtools, db = window.__db;
    return fb.getDocs(fb.query(fb.collection(db,'reviews'), fb.orderBy('createdAt','desc'))).then(function(snap){
      rows = [];
      snap.forEach(function(d){
        var v = d.data();
        if(v && v.rating >= 1 && v.rating <= 5 && v.text) rows.push({ id:d.id, name:v.name, rating:v.rating, text:v.text, country:(typeof v.country === 'string' ? v.country.toUpperCase() : '') });
      });
      var u = window.__auth.currentUser;
      mine = null;
      if(u) rows.forEach(function(r){ if(r.id === u.uid) mine = r; });
      renderSummary(); renderCards(); renderButton();
    }).catch(function(e){ console.log('تعذر تحميل التقييمات:', e); });
  }

  /* ---------- زرار + نموذج كتابة التقييم ---------- */
  function realUser(){
    var u = window.__auth.currentUser;
    return (u && !u.isAnonymous) ? u : null;
  }

  function renderButton(){
    var wrap = $('rv-form-wrap');
    if(!wrap) return;
    wrap.innerHTML = '';
    var btn = el('button','background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:none;border-radius:50px;padding:13px 34px;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer;', mine ? T.edit : T.write);
    btn.type = 'button';
    btn.addEventListener('click', function(){
      if(!realUser()){
        if(typeof window.openAuthModal === 'function') window.openAuthModal();
        else alert(T.need);
        return;
      }
      openForm();
    });
    wrap.appendChild(btn);
  }

  function openForm(){
    var wrap = $('rv-form-wrap'), u = realUser();
    if(!u) return;
    wrap.innerHTML = '';
    rating = mine ? mine.rating : 0;
    var box = el('div','max-width:560px;margin:0 auto;text-align:start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;');
    box.appendChild(el('div','color:#fff;font-weight:800;font-size:17px;margin-bottom:14px;text-align:center;', T.title));

    var starRow = el('div','display:flex;gap:6px;justify-content:center;margin-bottom:16px;direction:ltr;');
    var starBtns = [];
    function paint(){ starBtns.forEach(function(b, i){ b.textContent = i < rating ? '★' : '☆'; b.style.color = i < rating ? '#f5c842' : 'rgba(255,255,255,0.35)'; }); }
    for(var i = 1; i <= 5; i++){
      (function(n){
        var b = el('button','background:none;border:none;font-size:34px;line-height:1;cursor:pointer;padding:2px;');
        b.type = 'button'; b.setAttribute('aria-label', n + ' / 5');
        b.addEventListener('click', function(){ rating = n; paint(); });
        starBtns.push(b); starRow.appendChild(b);
      })(i);
    }
    paint();
    box.appendChild(starRow);

    var inputCss = 'width:100%;box-sizing:border-box;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.15);border-radius:12px;color:#fff;font-family:inherit;font-size:14px;padding:12px 14px;margin-bottom:12px;';
    var nameIn = el('input', inputCss); nameIn.type = 'text'; nameIn.maxLength = 40; nameIn.placeholder = T.name;
    nameIn.value = (mine && mine.name) || u.displayName || (u.email ? u.email.split('@')[0] : '');
    box.appendChild(nameIn);
    var sel = el('select', inputCss + 'appearance:auto;');
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = T.country; sel.appendChild(o0);
    COUNTRIES.forEach(function(c){
      var o = document.createElement('option'); o.value = c[0]; o.textContent = EN ? c[2] : c[1];
      o.style.color = '#000'; sel.appendChild(o);
    });
    sel.value = (mine && mine.country) || '';
    box.appendChild(sel);
    var txt = el('textarea', inputCss + 'min-height:110px;resize:vertical;'); txt.maxLength = 500; txt.placeholder = T.ph;
    txt.value = mine ? mine.text : '';
    box.appendChild(txt);

    var msg = el('div','min-height:20px;font-size:13px;margin-bottom:10px;color:#ff8a8a;');
    box.appendChild(msg);

    var actions = el('div','display:flex;gap:10px;justify-content:center;flex-wrap:wrap;');
    var send = el('button','background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:none;border-radius:50px;padding:12px 30px;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer;', T.send);
    send.type = 'button';
    var cancel = el('button','background:transparent;color:var(--muted);border:1px solid rgba(255,255,255,0.2);border-radius:50px;padding:12px 24px;font-size:14px;font-family:inherit;cursor:pointer;', T.cancel);
    cancel.type = 'button';
    cancel.addEventListener('click', renderButton);
    send.addEventListener('click', function(){
      var text = txt.value.trim(), name = nameIn.value.trim() || T.member;
      if(!rating){ msg.textContent = T.pickStars; return; }
      if(!sel.value){ msg.textContent = T.needCountry; return; }
      if(text.length < 10){ msg.textContent = T.short; return; }
      msg.textContent = ''; send.disabled = true; send.textContent = T.sending;
      var fb = window.__fbtools, db = window.__db;
      fb.setDoc(fb.doc(db,'reviews',u.uid), {
        uid: u.uid, name: name, rating: rating, text: text, country: sel.value, createdAt: fb.serverTimestamp()
      }).then(function(){
        return load();
      }).then(function(){
        var ok = el('div','color:#4ade80;font-weight:700;font-size:14px;margin-bottom:14px;', T.thanks);
        var w = $('rv-form-wrap'); w.innerHTML = ''; w.appendChild(ok);
        var again = el('button','background:none;border:none;color:var(--secondary-light);text-decoration:underline;cursor:pointer;font-family:inherit;font-size:13px;', T.edit);
        again.type = 'button'; again.addEventListener('click', openForm);
        w.appendChild(again);
      }).catch(function(e){
        console.log('تعذر حفظ التقييم (راجع Firestore Rules لمجموعة reviews):', e);
        msg.textContent = T.err; send.disabled = false; send.textContent = T.send;
      });
    });
    actions.appendChild(send); actions.appendChild(cancel);
    box.appendChild(actions);
    wrap.appendChild(box);
  }

  upgradeStaticFlags();
  ready(function(){
    renderButton();
    load();
    try{ window.__auth.onAuthStateChanged(function(){ load(); }); }catch(e){}
  });
})();
