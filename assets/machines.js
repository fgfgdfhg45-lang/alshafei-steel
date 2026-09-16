// ===== زرار "أضف للسلة" تلقائي لكل ماكينة ما لهاش زرار بالفعل =====
const CART_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:5px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.machine-card').forEach(function(card){
    const info = card.querySelector('.machine-info');
    if(!info) return;
    if(info.querySelector('.order-btn')) return;

    const h3 = info.querySelector('h3');
    const model = info.querySelector('.machine-model');
    if(!h3) return;

    const machineName = h3.innerText.trim();
    const modelName = model ? model.innerText.trim() : '';
    const msg = encodeURIComponent('مرحبًا،\nأريد الاستفسار عن: ' + machineName + (modelName ? '\nالموديل: ' + modelName : '') + '\nالمصدر: الموقع الرسمي لشركة الشافعي ستيل 🌐');
    const url = 'https://api.whatsapp.com/send?phone=201099747509&text=' + msg;

    const btn = document.createElement('a');
    btn.href = url;
    btn.target = '_blank';
    btn.className = 'order-btn';
    btn.style.marginTop = 'auto';
    btn.innerHTML = CART_ICON_SVG + ' أضف للسلة';

    info.appendChild(btn);
  });
});

// ===== عداد الأرقام في قسم الإحصائيات (لو موجود في الصفحة) =====
document.addEventListener('DOMContentLoaded', function(){
  const statsSection = document.querySelector('.stats');
  const counters = document.querySelectorAll('.counter');
  if(!statsSection || counters.length === 0) return;

  let statsStarted = false;

  function runCounters(){
    counters.forEach(function(counter){
      const target = +counter.getAttribute('data-target');
      let count = 0;
      const increment = Math.max(1, target / 120);
      function update(){
        count += increment;
        if(count < target){
          counter.innerText = Math.ceil(count);
          requestAnimationFrame(update);
        } else {
          counter.innerText = target;
        }
      }
      update();
    });
  }

  function checkStats(){
    const sectionTop = statsSection.offsetTop - 400;
    if(window.scrollY > sectionTop && !statsStarted){
      statsStarted = true;
      runCounters();
    }
  }
  window.addEventListener('scroll', checkStats);
  checkStats(); // في حالة القسم ظاهر من غير سكرول أصلاً
});

// ===== فلتر المنتجات (لو موجود فلتر في الصفحة) =====
document.addEventListener('DOMContentLoaded', function(){
  const filterButtons = document.querySelectorAll('.filter-btn');
  const machineCards = document.querySelectorAll('.machine-card');

  filterButtons.forEach(function(button){
    button.addEventListener('click', function(){
      filterButtons.forEach(function(btn){ btn.classList.remove('active'); });
      button.classList.add('active');
      const filterValue = button.getAttribute('data-filter');

      machineCards.forEach(function(card){
        const cardCategory = card.getAttribute('data-category');
        if(filterValue === 'all' || cardCategory === filterValue){
          card.style.display = 'block';
          setTimeout(function(){
            card.style.opacity = '1';
            card.style.transform = 'translateY(0px) scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px) scale(0.9)';
          setTimeout(function(){ card.style.display = 'none'; }, 250);
        }
      });
    });
  });
});

// ===== نافذة المشاركة =====
(function(){
  const overlay = document.getElementById('shareOverlay');
  if(!overlay) return;
  const nameEl = document.getElementById('shareMachineName');
  const linkInput = document.getElementById('shareLinkInput');
  const copyBtn = document.getElementById('shareCopyBtn');
  const whatsappLink = document.getElementById('shareWhatsapp');
  const moreBtn = document.getElementById('shareMore');
  const closeBtn = document.getElementById('shareClose');
  const pageUrl = window.location.href.split('#')[0];

  function slugify(modelText){
    return modelText.replace(/Model\s*/i, '').trim().replace(/\s+/g, '-');
  }

  function openShareModal(machineName, machineId){
    const shareText = 'شاهد هذه الماكينة من شركة الشافعي ستيل: ' + machineName;
    const cleanUrl = pageUrl.split('#')[0];
    const fullShareUrl = machineId ? (cleanUrl + '#' + machineId) : cleanUrl;
    nameEl.textContent = machineName;
    linkInput.value = fullShareUrl;
    whatsappLink.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText + '\n' + fullShareUrl);
    moreBtn.onclick = function(){
      if(navigator.share){
        navigator.share({ title: machineName, text: shareText, url: fullShareUrl }).catch(function(){});
      } else {
        copyBtn.click();
      }
    };
    overlay.classList.add('active');
  }

  function closeShareModal(){
    overlay.classList.remove('active');
  }

  copyBtn.addEventListener('click', function(){
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(function(){
      copyBtn.textContent = 'تم!';
      setTimeout(function(){ copyBtn.textContent = 'نسخ'; }, 1500);
    }).catch(function(){
      document.execCommand('copy');
    });
  });

  closeBtn.addEventListener('click', closeShareModal);
  overlay.addEventListener('click', function(e){
    if(e.target === overlay) closeShareModal();
  });

  const SHARE_ICON_SVG = '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.machine-card').forEach(function(card){
      const info = card.querySelector('.machine-info');
      if(!info) return;
      const titleEl = info.querySelector('h3');
      if(!titleEl) return;
      const machineName = titleEl.textContent.trim();

      // إديله ID ثابت من رقم الموديل عشان اللينك يوديك للماكينة دي بالظبط
      const modelEl = info.querySelector('.machine-model');
      let machineId = null;
      if(modelEl){
        machineId = slugify(modelEl.textContent);
        if(machineId && !document.getElementById(machineId)){
          card.id = machineId;
        }
      }

      const btn = document.createElement('button');
      btn.className = 'share-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'مشاركة');
      btn.innerHTML = SHARE_ICON_SVG;
      btn.addEventListener('click', function(){
        openShareModal(machineName, machineId);
      });

      const orderBtn = info.querySelector('.order-btn');
      if(orderBtn){
        const wrapper = document.createElement('div');
        wrapper.className = 'machine-actions';
        orderBtn.parentNode.insertBefore(wrapper, orderBtn);
        wrapper.appendChild(orderBtn);
        wrapper.appendChild(btn);
      } else {
        btn.classList.add('share-btn-standalone');
        info.appendChild(btn);
      }
    });

    // لو حد فتح لينك فيه اسم ماكينة (هاش)، ودّيه لها واعمل هايلايت
    if(window.location.hash){
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if(target){
        setTimeout(function(){
          target.scrollIntoView({behavior:'smooth', block:'center'});
          target.style.transition = 'box-shadow 0.4s ease, transform 0.4s ease';
          target.style.boxShadow = '0 0 0 3px var(--secondary), 0 12px 35px rgba(0,0,0,0.4)';
          target.style.transform = 'scale(1.02)';
          setTimeout(function(){
            target.style.boxShadow = '';
            target.style.transform = '';
          }, 2500);
        }, 300);
      }
    }
  });
})();
