import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

interface PillNavItem {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface PillNavProps {
  logo?: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
}

const PillNav: React.FC<PillNavProps> = ({
  items,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#fff',
  pillColor = '#060010',
  hoveredPillTextColor = '#060010',
  pillTextColor,
  initialLoadAnimation = true
}) => {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<gsap.core.Timeline[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Resize refs arrays to match items length
    circleRefs.current = circleRefs.current.slice(0, items.length);
    tlRefs.current = tlRefs.current.slice(0, items.length);
    activeTweenRefs.current = activeTweenRefs.current.slice(0, items.length);
  }, [items]);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement as HTMLElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        
        // Prevent calculation errors if elements aren't rendered yet
        if (w === 0 || h === 0) return;

        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        
        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${D - delta}px`
        });

        const label = pill.querySelector('.pill-label');
        const white = pill.querySelector('.pill-label-hover');

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        // Kill existing timeline for this index
        if (tlRefs.current[index]) tlRefs.current[index].kill();
        
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, duration: 0.3, ease }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 0.3, ease }, 0);
        if (white) tl.to(white, { y: 0, opacity: 1, duration: 0.3, ease }, 0);

        tlRefs.current[index] = tl;
      });
    };

    layout();
    const debouncedLayout = () => setTimeout(layout, 100);
    window.addEventListener('resize', debouncedLayout);

    if (document.fonts?.ready) {
        document.fonts.ready.then(layout).catch(() => {});
    }

    // Fix for GSAP target not found warning
    if (initialLoadAnimation && navItemsRef.current) {
        const navItemsList = navItemsRef.current.querySelector('.pill-list');
        
        if (navItemsList && navItemsList.children.length > 0) {
            const targets = gsap.utils.toArray(navItemsList.children);
            if (targets.length > 0) {
                gsap.fromTo(targets, 
                    { y: 20, opacity: 0}, 
                    { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.05, delay: 0.4 }
                );
            }
        }
    }

    return () => window.removeEventListener('resize', debouncedLayout);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    tl.timeScale(1).play();
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    tl.timeScale(1.5).reverse();
  };

  const isActive = (itemHref: string) => {
    // Normalize paths by removing trailing slashes
    const normalize = (p: string) => p === '/' ? '/' : p.replace(/\/$/, "");
    const targetPath = normalize(itemHref);
    const currentPath = normalize(location.pathname);
    return currentPath === targetPath;
  };

  const cssVars = {
    '--base': baseColor,
    '--pill-bg': pillColor,
    '--hover-text': hoveredPillTextColor,
    '--pill-text': resolvedPillTextColor
  } as React.CSSProperties;

  return (
    <>
      <style>{`
        .pill-nav-container {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          -webkit-tap-highlight-color: transparent;
        }
        .pill-nav {
          --nav-h: 48px;
          --pill-pad-x: 20px;
          --pill-gap: 6px;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          background: rgba(17, 17, 17, 0.5);
          backdrop-filter: blur(10px);
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .pill-nav-items {
          position: relative;
          display: flex;
          align-items: center;
          height: var(--nav-h);
        }
        .pill-list {
          list-style: none;
          display: flex;
          align-items: stretch;
          gap: var(--pill-gap);
          margin: 0;
          padding: 0;
          height: 100%;
        }
        .pill-list > li {
          display: flex;
          height: 100%;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 var(--pill-pad-x);
          background: var(--pill-bg, #fff);
          color: var(--pill-text, var(--base, #000));
          text-decoration: none;
          border-radius: 9999px;
          box-sizing: border-box;
          font-weight: 500;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: color 0.3s ease;
        }
        .pill.is-active {
          background: var(--base, #000);
          color: var(--hover-text, #fff);
        }
        .pill:not(.is-active):hover {
          color: var(--pill-text, #000)
        }
        .pill .hover-circle {
          position: absolute;
          left: 50%;
          bottom: 0;
          border-radius: 50%;
          background: var(--base, #000);
          z-index: 1;
          display: block;
          pointer-events: none;
          will-change: transform;
        }
        .pill .label-stack {
          position: relative;
          display: inline-block;
          line-height: 1;
          z-index: 2;
        }
        .pill .pill-label {
          position: relative;
          z-index: 2;
          display: inline-block;
          line-height: 1;
          will-change: transform;
          color: inherit;
          transition: color 0.3s ease;
        }
        .pill .pill-label-hover {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--hover-text, #fff);
          z-index: 3;
          will-change: transform, opacity;
        }
        @media (max-width: 640px) {
          .pill-nav-container {
            bottom: 1rem;
            width: calc(100% - 2rem);
            left: 1rem;
            transform: none;
          }
          .pill-nav {
            width: 100%;
            --nav-h: 42px;
            --pill-pad-x: 12px;
            --pill-gap: 4px;
            padding: 4px;
          }
          .pill-list {
            width: 100%;
            justify-content: space-between;
          }
          .pill {
            flex-grow: 1;
            font-size: 12px;
          }
        }
      `}</style>
      <div className="pill-nav-container">
        <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
          <div className="pill-nav-items" ref={navItemsRef}>
            <ul className="pill-list" role="menubar">
              {items.map((item, i) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href || `item-${i}`} role="none">
                    <div
                      role="menuitem"
                      onClick={() => navigate(item.href)}
                      className={`pill${active ? ' is-active' : ''}`}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                      tabIndex={0}
                    >
                      <span
                        className="hover-circle"
                        aria-hidden="true"
                        ref={el => { circleRefs.current[i] = el; }}
                      />
                      <span className="label-stack">
                        <span className="pill-label">{item.label}</span>
                        <span className="pill-label-hover" aria-hidden="true">
                          {item.label}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
};

export default PillNav;