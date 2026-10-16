/* يعرض الحساب المسجَّل (من الكاش) في الصفحات الداخلية بدل أيقونة "غير مسجل" */
(function(){
  try{
    var raw = localStorage.getItem('shafei_user'); if(!raw) return;
    var u = JSON.parse(raw); if(!u || u.anon) return;
    var btn = document.getElementById('nav-account-btn'); if(!btn) return;
    var name = u.name || 'حسابي';
    btn.innerHTML = '<span style="font-size:14px;font-weight:800;"></span>';
    btn.firstChild.textContent = name.trim().charAt(0).toUpperCase();
    btn.setAttribute('title', name);
  }catch(e){}
})();
