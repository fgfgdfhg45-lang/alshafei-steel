// ========== بحث الموقع الموحد (شغال من أي صفحة) ==========
(function(){
  const prefix = (typeof window.SITE_PREFIX === 'string') ? window.SITE_PREFIX : '';
  const rawData = window.SITE_SEARCH_DATA || [];
  const searchIndex = rawData.map(function(item){
    return {
      name: item.name,
      model: item.model,
      cat: item.cat,
      img: item.img,
      url: prefix + item.path
    };
  });

  const overlay = document.getElementById('site-search-overlay');
  if(!overlay) return;
  const input = document.getElementById('site-search-input');
  const resultsBox = document.getElementById('site-search-results');
  const closeBtn = document.getElementById('site-search-close');

  window.openSiteSearch = function(){
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    input.value = '';
    renderResults('');
    setTimeout(function(){ input.focus(); }, 100);
  };

  window.closeSiteSearch = function(){
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  function escapeHTML(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderResults(query){
    const q = query.trim().toLowerCase();
    resultsBox.innerHTML = '';

    if(!q){
      resultsBox.innerHTML = '<div class="search-hint-state">✍️ اكتب اسم الماكينة، الموديل، أو نوعها (مثل: سوائل، بودر، شيكولاتة، طحن...)</div>';
      return;
    }

    const matches = searchIndex.filter(function(item){
      return item.name.toLowerCase().includes(q) ||
             item.model.toLowerCase().includes(q) ||
             item.cat.toLowerCase().includes(q);
    }).slice(0,12);

    if(matches.length === 0){
      resultsBox.innerHTML = '<div class="search-empty-state">😕 مفيش نتائج مطابقة، جرب كلمة تانية</div>';
      return;
    }

    matches.forEach(function(item){
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML =
        '<img loading="lazy" decoding="async" src="'+item.img+'" alt="'+escapeHTML(item.name)+'">' +
        '<div class="search-result-info">' +
          '<h4>'+escapeHTML(item.name)+'</h4>' +
          '<span>'+escapeHTML(item.model)+'</span>' +
        '</div>' +
        (item.cat ? '<span class="search-result-cat">'+escapeHTML(item.cat)+'</span>' : '');
      div.addEventListener('click', function(){
        window.location.href = item.url;
      });
      resultsBox.appendChild(div);
    });
  }

  input.addEventListener('input', function(e){ renderResults(e.target.value); });
  closeBtn.addEventListener('click', closeSiteSearch);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeSiteSearch(); });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && overlay.classList.contains('active')) closeSiteSearch();
    if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
      e.preventDefault();
      openSiteSearch();
    }
  });
})();
