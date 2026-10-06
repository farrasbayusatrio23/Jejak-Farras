"use client";

import { useEffect, useRef } from "react";

type SectionTick = {
  id: string;
  label: string;
};

type JournalAtmosphereProps = {
  /** Sections marked on the route line. Empty array skips drawing the line. */
  sections?: SectionTick[];
};

const SVG_NS = "http://www.w3.org/2000/svg";

/* A gentle switchback: reads as a route, not as a progress meter. */
const ROUTE_PATH =
  "M 50 4 C 22 40 78 74 50 110 C 20 148 80 182 50 220 C 24 254 76 288 50 324 C 34 348 52 372 50 396";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const scrollableHeight = () =>
  Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight,
    document.body.scrollHeight - window.innerHeight
  );

/**
 * Progressive enhancement for the public pages. Markup stays server rendered;
 * this component animates what is already in the DOM (keyed off data
 * attributes) and renders the fixed overlays: grain, pointer light, route line.
 */
export function JournalAtmosphere({ sections = [] }: JournalAtmosphereProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const motionOff = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    root.classList.add("motion-ready");
    /* Tells the inline failsafe in the root layout that motion is live. */
    root.dataset.journalMotion = "true";

    /* --- scroll reveals --------------------------------------------- */
    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    let revealObserver: IntersectionObserver | null = null;
    if (motionOff || !("IntersectionObserver" in window)) {
      revealTargets.forEach((element) => element.classList.add("is-in"));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-in");
            revealObserver?.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
      );
      revealTargets.forEach((element) => revealObserver?.observe(element));
    }

    /* --- active nav link --------------------------------------------- */
    let navObserver: IntersectionObserver | null = null;
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        ".public-header nav a[href^='#']"
      )
    );
    if (navLinks.length && "IntersectionObserver" in window) {
      const sectionEls = navLinks
        .map((link) =>
          document.getElementById(link.getAttribute("href")!.slice(1))
        )
        .filter((element): element is HTMLElement => Boolean(element));
      let active: HTMLElement | null = null;
      navObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const link = navLinks.find(
              (candidate) => candidate.getAttribute("href") === `#${entry.target.id}`
            );
            if (!link) continue;
            active?.classList.remove("is-active");
            link.classList.add("is-active");
            active = link;
          }
        },
        { rootMargin: "-45% 0px -45% 0px" }
      );
      sectionEls.forEach((element) => navObserver?.observe(element));
    }

    /* --- pointer: hero parallax + trailing light ---------------------- */
    const hero = document.querySelector<HTMLElement>(".journal-hero");
    const pointer = { x: 0, y: 0, live: false };
    const onPointerMove = (event: PointerEvent) => {
      if (motionOff || !finePointer) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.live = true;
      schedule();
    };
    if (!motionOff && finePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    /* --- 3D tilt on the archive cards --------------------------------- */
    const cleanups: Array<() => void> = [];
    if (!motionOff && finePointer) {
      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((element) => {
        const max = Number(element.dataset.tiltMax ?? 7);
        const reset = () => {
          element.style.setProperty("--tilt-x", "0");
          element.style.setProperty("--tilt-y", "0");
          element.style.setProperty("--tilt-lift", "0");
          element.style.setProperty("--tilt-px-n", "0");
          element.style.setProperty("--tilt-py-n", "0");
        };
        const move = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          if (!inside) return;
          const nx = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
          const ny = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
          element.style.setProperty("--tilt-x", (ny * max).toFixed(2));
          element.style.setProperty("--tilt-y", (nx * max).toFixed(2));
          element.style.setProperty("--tilt-lift", "1");
          element.style.setProperty(
            "--tilt-px",
            (((event.clientX - rect.left) / rect.width) * 100).toFixed(1)
          );
          element.style.setProperty(
            "--tilt-py",
            (((event.clientY - rect.top) / rect.height) * 100).toFixed(1)
          );
          element.style.setProperty("--tilt-px-n", nx.toFixed(3));
          element.style.setProperty("--tilt-py-n", ny.toFixed(3));
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerleave", reset);
        cleanups.push(() => {
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerleave", reset);
        });
      });
    }

    /* --- route line ---------------------------------------------------- */
    const routeRoot = routeRef.current;
    const drawnPath =
      routeRoot?.querySelector<SVGPathElement>(".route-drawn") ?? null;
    const markerGroup =
      routeRoot?.querySelector<SVGGElement>(".route-marker-group") ?? null;
    const percentText =
      routeRoot?.querySelector<SVGTextElement>(".route-percent") ?? null;
    const routeLength = drawnPath?.getTotalLength() ?? 0;
    if (drawnPath && routeLength) {
      drawnPath.style.strokeDasharray = `${routeLength}`;
      drawnPath.style.strokeDashoffset = `${routeLength}`;
    }

    const tickGroups = sections.map(() => {
      const group = document.createElementNS(SVG_NS, "g") as SVGGElement;
      group.setAttribute("class", "route-tick");
      const dot = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
      dot.setAttribute("r", "2.6");
      const label = document.createElementNS(SVG_NS, "text") as SVGTextElement;
      label.setAttribute("x", "-10");
      label.setAttribute("dy", "3.4");
      label.setAttribute("text-anchor", "end");
      group.append(dot, label);
      routeRoot?.querySelector("svg")?.append(group);
      return { group, label, y: 0 };
    });

    const layoutTicks = () => {
      if (!drawnPath || !routeLength) return;
      const height = scrollableHeight();
      tickGroups.forEach((tick, index) => {
        const section = sections[index];
        const target = document.getElementById(section.id);
        if (!target) return;
        const ratio = clamp(
          (target.getBoundingClientRect().top + window.scrollY - 120) / height
        );
        const point = drawnPath.getPointAtLength(ratio * routeLength);
        tick.y = point.y;
        tick.group.setAttribute(
          "transform",
          `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`
        );
        tick.label.textContent = section.label;
      });
    };
    layoutTicks();

    /* --- one rAF for everything ---------------------------------------- */
    const figures = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax-figure]")
    );
    let frame = 0;

    const paint = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const progress = clamp(scrollY / scrollableHeight());
      root.style.setProperty("--jp-progress", progress.toFixed(4));

      if (!motionOff) {
        document
          .querySelector(".public-header")
          ?.classList.toggle("is-stuck", scrollY > 24);

        if (hero) {
          hero.style.setProperty(
            "--hero-scroll",
            clamp(scrollY / Math.max(1, hero.offsetHeight)).toFixed(4)
          );
          if (pointer.live) {
            hero.style.setProperty(
              "--hero-x",
              clamp((pointer.x / window.innerWidth) * 2 - 1, -1, 1).toFixed(3)
            );
            hero.style.setProperty(
              "--hero-y",
              clamp((pointer.y / window.innerHeight) * 2 - 1, -1, 1).toFixed(3)
            );
          }
        }

        if (glowRef.current && pointer.live) {
          glowRef.current.style.setProperty("--gp-x", `${pointer.x}px`);
          glowRef.current.style.setProperty("--gp-y", `${pointer.y}px`);
          glowRef.current.classList.add("is-live");
        }

        figures.forEach((figure) => {
          const rect = figure.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
          const offset =
            rect.top + rect.height / 2 - window.innerHeight / 2;
          figure.style.setProperty(
            "--fig-shift",
            `${(clamp(offset / window.innerHeight, -1, 1) * 2.6).toFixed(3)}rem`
          );
        });
      }

      if (drawnPath && routeLength) {
        drawnPath.style.strokeDashoffset = `${(
          routeLength *
          (1 - progress)
        ).toFixed(2)}`;
        const point = drawnPath.getPointAtLength(progress * routeLength);
        markerGroup?.setAttribute(
          "transform",
          `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`
        );
        if (percentText) {
          percentText.setAttribute("x", `${(point.x + 12).toFixed(2)}`);
          percentText.setAttribute("y", `${(point.y + 3.4).toFixed(2)}`);
          percentText.textContent = `${Math.round(progress * 100)}%`;
        }
        tickGroups.forEach((tick) => {
          tick.group.classList.toggle("is-passed", point.y >= tick.y);
        });
      }
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }

    const onResize = () => {
      layoutTicks();
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    /* Images land after hydration and move the sections; re-measure once
       the document has settled. */
    window.addEventListener("load", onResize);
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      revealObserver?.disconnect();
      navObserver?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
    // `sections` is static content for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="journal-grain" aria-hidden="true" />
      <div ref={glowRef} className="journal-glow" aria-hidden="true" />
      {sections.length > 0 ? (
        <div ref={routeRef} className="route-progress" aria-hidden="true">
          <svg viewBox="0 0 100 400">
            <path className="route-base" d={ROUTE_PATH} />
            <path className="route-drawn" d={ROUTE_PATH} />
            <g className="route-marker-group">
              <circle className="route-halo" r="7" />
              <circle className="route-marker" r="2.6" />
            </g>
            <text className="route-percent" x="62" y="10" />
          </svg>
        </div>
      ) : null}
    </>
  );
}
