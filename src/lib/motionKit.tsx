import { ReactNode, RefObject, useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring } from 'motion/react';

// Lenguaje de movimiento común para la landing, el panel y la app de estudiantes y familias.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Aparece subiendo y desenfocado a nítido cuando entra en pantalla. */
export function Reveal({ children, delay = 0, className = '', y = 36 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Barra fina arriba de la ventana que se llena al bajar. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: progress }}
      className="fixed top-0 left-0 right-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-orange-500 via-amber-400 to-orange-300 pointer-events-none print:hidden"
    />
  );
}

/** Titular cuyas palabras suben una tras otra desde detrás de una máscara. */
export function MaskedWords({ text, className = '', start = 0.15 }: { text: string; className?: string; start?: number }) {
  const reduce = useReducedMotion();
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i}>
          <span className="inline-block overflow-hidden align-bottom pb-[0.08em]">
            <motion.span
              className={`inline-block ${className}`}
              initial={reduce ? false : { y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, delay: start + i * 0.07, ease: EASE_OUT }}
            >
              {word}
            </motion.span>
          </span>{' '}
        </span>
      ))}
    </>
  );
}

/** Botón que se inclina hacia el cursor. */
export function MagneticButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.18);
        y.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/**
 * Luz que sigue al cursor en las tarjetas (.card-fx y .spotlight).
 * Un solo oyente para toda la página; las tarjetas leen --mx y --my en su CSS.
 */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover)').matches) return;
    let last: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.card-fx, .spotlight') as HTMLElement | null;
      if (last && last !== el) last.classList.remove('spot-on');
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.classList.add('spot-on');
    };
    const leave = () => { last?.classList.remove('spot-on'); last = null; };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      leave();
    };
  }, []);
}

/**
 * Revela las secciones de cualquier pantalla al bajar, sin tocar cada módulo.
 * `selector` elige las secciones desde el contenedor; solo se animan las que están bajo el pliegue.
 * Las clases se quitan al terminar, así no queda ningún transform (los modales fijos siguen bien).
 */
export function useAutoReveal(ref: RefObject<HTMLElement | null>, resetKey: unknown, selector = ':scope > *') {
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduce || typeof IntersectionObserver === 'undefined') return;

    const seen = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    const finish = (el: HTMLElement) => {
      el.classList.remove('auto-reveal', 'auto-reveal-in');
      pending.delete(el);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.classList.add('auto-reveal-in');
          window.setTimeout(() => finish(el), 900);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0 },
    );

    const scan = () => {
      const vh = window.innerHeight;
      root.querySelectorAll(selector).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.top < vh * 0.92) return;
        if (el.closest('[role="dialog"]') || getComputedStyle(el).position === 'fixed') return;
        el.classList.add('auto-reveal');
        pending.add(el);
        observer.observe(el);
      });
    };

    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); };
    const timer = window.setTimeout(scan, 480);
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      pending.forEach(finish);
    };
  }, [ref, resetKey, reduce, selector]);
}

/** Partículas tenues que flotan hacia arriba (fondo oscuro del panel y de la app). */
export function Particles({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reduce) return;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const count = Math.min(28, Math.floor(window.innerWidth / 45));
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.45 - 0.15,
      a: Math.random() * 0.5 + 0.2,
      p: Math.random() * Math.PI * 2,
      ps: Math.random() * 0.02 + 0.01,
      c: Math.random() > 0.4 ? '251, 146, 60' : '252, 211, 77',
    }));

    let raf = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy; d.p += d.ps;
        if (d.y < -10) { d.y = height + 10; d.x = Math.random() * width; }
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.c}, ${d.a * (0.6 + 0.4 * Math.sin(d.p))})`;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, [reduce]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`absolute inset-0 w-full h-full ${className}`} />;
}
