/* القوايم المنسدلة: فتح/قفل بالنقر على الموبايل واللمس، و Esc على الكمبيوتر */
(function(){
  var nav = document.getElementById('nav-links');
  if(!nav) return;
  var touchLike = window.matchMedia('(max-width:768px), (hover:none)');

  function closeAll(except){
    nav.querySelectorAll('.nav-item.open, .nav-sub.open').forEach(function(el){
      if(el === except || (except && el.contains(except))) return;
      el.classList.remove('open');
      var a = el.querySelector(':scope > a'); if(a) a.setAttribute('aria-expanded','false');
    });
  }

  // capture: علشان نمنع كود إغلاق القايمة القديم لما نضغط على عنصر له قايمة فرعية
  nav.addEventListener('click', function(e){
    if(!touchLike.matches) return;                       // الكمبيوتر: الروابط شغالة عادي
    var a = e.target.closest ? e.target.closest('a') : null;
    if(!a || !nav.contains(a)) return;
    if(!(a.classList.contains('nav-parent') || a.classList.contains('nav-sub-link'))) return;
    e.preventDefault(); e.stopPropagation();
    var box = a.parentElement;
    var open = !box.classList.contains('open');
    closeAll(open ? box : null);
    box.classList.toggle('open', open);
    a.setAttribute('aria-expanded', open ? 'true' : 'false');
  }, true);

  document.addEventListener('click', function(e){
    if(!nav.contains(e.target)) closeAll(null);
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      closeAll(null);
      if(document.activeElement && nav.contains(document.activeElement)) document.activeElement.blur();
    }
  });
})();
