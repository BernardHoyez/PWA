document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox.querySelector('img');
  const lbClose = lightbox.querySelector('.lightbox-close');

  function showLightbox(src){
    lbImg.src = src;
    lightbox.classList.add('show');
  }

  function hideLightbox(){
    lightbox.classList.remove('show');
    lbImg.src = '';
  }

  lbClose.addEventListener('click', hideLightbox);
  lightbox.addEventListener('click', (e) => {
    if(e.target === lightbox) hideLightbox();
  });

  document.body.addEventListener('click', (e)=>{
    const img = e.target.closest('img.popup-image');
    if(img && img.src){
      showLightbox(img.src);
    }
  });
});
