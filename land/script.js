// Плавная прокрутка для навигации

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Анимация появления элементов при скролле
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Применяем анимацию к карточкам
document.querySelectorAll('.service-card, .portfolio-item, .step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s, transform 0.6s';
    observer.observe(el);
});

// Typewriter effect for hero title
const typewriterText = 'Разработка Telegram Ботов';
const typewriterElem = document.getElementById('typewriter');
let twIndex = 0;
function typeWriter() {
    if (twIndex <= typewriterText.length) {
        typewriterElem.textContent = typewriterText.slice(0, twIndex);
        twIndex++;
        setTimeout(typeWriter, 80);
    }
}
typeWriter(); 