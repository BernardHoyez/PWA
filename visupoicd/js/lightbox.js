(function() {
    let lightboxOverlay = null;
    let lightboxImage = null;

    function initLightbox() {
        lightboxOverlay = document.querySelector('.lightbox-overlay');
        if (!lightboxOverlay) {
            console.warn('Lightbox overlay not found');
            return;
        }
        
        lightboxImage = lightboxOverlay.querySelector('.lightbox-image');
        const closeBtn = lightboxOverlay.querySelector('.lightbox-close');
        
        closeBtn.addEventListener('click', closeLightbox);
        
        lightboxOverlay.addEventListener('click', function(e) {
            if (e.target === lightboxOverlay) {
                closeLightbox();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    function openLightbox(imgSrc, imgAlt) {
        if (!lightboxOverlay) return;
        
        lightboxImage.src = imgSrc;
        lightboxImage.alt = imgAlt || '';
        lightboxOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightboxOverlay) return;
        
        lightboxOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            lightboxImage.src = '';
        }, 300);
    }

    function attachImageClickHandlers() {
        document.addEventListener('click', function(e) {
            const img = e.target;
            
            if (img.tagName === 'IMG' && img.closest('.leaflet-popup-content')) {
                e.preventDefault();
                e.stopPropagation();
                openLightbox(img.src, img.alt);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initLightbox();
            attachImageClickHandlers();
        });
    } else {
        initLightbox();
        attachImageClickHandlers();
    }

    window.visupoiLightbox = {
        open: openLightbox,
        close: closeLightbox
    };
})();