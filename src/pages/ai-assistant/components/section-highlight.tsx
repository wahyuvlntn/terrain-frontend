import { useEffect } from 'react';
import { Location, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';

import styles from '../ai-assistant.module.scss';
import { isSectionId, SECTION_ATTR, SECTION_PARAM } from '../navigation';

/** how long a page may take to render the section */
const WAIT_MS = 5000;
const POLL_MS = 100;
/** the flash (3 pulses of the `.nav-highlight` animation) */
const FLASH_MS = 2400;
/** a second look once the page's data has loaded and moved the section */
const SETTLE_MS = 800;

/** the first rendered element of a section (one hidden by a closed tab has no box) */
const findSection = (id: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(`[${SECTION_ATTR}="${id}"]`)).find(
    (el) => el.getClientRects().length > 0
  ) ?? null;

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const inView = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
};

const reveal = (el: HTMLElement, smooth: boolean) => {
  // a section taller than most of the window shows its top, a smaller one sits in the middle
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
  el.scrollIntoView?.({ block: tall ? 'start' : 'center', behavior: smooth ? 'smooth' : 'auto' });
};

const flash = (el: HTMLElement) => {
  const name = styles['nav-highlight'];
  el.classList.remove(name);
  void el.offsetWidth; // restart the animation when the same section is asked for again
  el.classList.add(name);
  setTimeout(() => el.classList.remove(name), FLASH_MS);
};

/**
 * The router of the mounted highlighter (the shared Layout may rebuild the router and remount it)
 * and the section request being handled. Module state, so StrictMode's second effect run and a
 * remount continue the request instead of highlighting twice.
 */
const router: { location: Location | null; navigate: NavigateFunction | null } = {
  location: null,
  navigate: null,
};
let request: { key: string; finished: boolean } | null = null;

/**
 * Wait (up to WAIT_MS) for section `id` of the page at `pathname` to render, scroll it into view
 * and flash it, then drop the parameter from the URL (replace). Gives up when the user leaves the
 * page.
 */
const handleSection = (id: string, pathname: string) => {
  const mine = { key: `${pathname}?${id}`, finished: false };
  request = mine;
  const started = Date.now();

  /**
   * Done, with no replace of ours to come (the user left, or the page dropped the parameter): the
   * same link may ask again at once. The highlighter's effect only clears a finished request when
   * it runs, and it ran for the page the user went to while this one was still waiting.
   */
  const abandon = () => {
    mine.finished = true;
    if (request === mine) request = null;
  };

  const finish = () => {
    mine.finished = true;
    const { location, navigate } = router;
    const params = new URLSearchParams(location?.search);
    if (
      !location ||
      !navigate ||
      location.pathname !== pathname ||
      params.get(SECTION_PARAM) !== id
    ) {
      abandon();
      return;
    }
    params.delete(SECTION_PARAM);
    const search = params.toString();
    navigate(
      { pathname, search: search ? `?${search}` : '', hash: location.hash },
      { replace: true, state: location.state }
    );
  };

  const attempt = () => {
    if (request !== mine) return; // a newer request took over
    if (router.location?.pathname !== pathname) {
      abandon();
      return;
    }
    const el = findSection(id);
    if (el) {
      reveal(el, !reducedMotion());
      flash(el);
      setTimeout(() => {
        if (el.isConnected && !inView(el)) reveal(el, false);
      }, SETTLE_MS);
      finish();
    } else if (Date.now() - started < WAIT_MS) {
      setTimeout(attempt, POLL_MS);
    } else {
      finish();
    }
  };
  attempt();
};

/**
 * Generic section highlight on every page: `?section=<id>` (set by the assistant's navigation
 * links) scrolls `[data-nav-section="<id>"]` into view and briefly highlights it, waiting up to
 * 5 s for the page to render it. The parameter is a one-shot instruction: it is removed from the
 * URL (replace) afterwards, so later changes of the page's own parameters don't flash again and
 * opening the same link again does.
 */
export const SectionHighlight = () => {
  const location = useLocation();
  const navigate = useNavigate();
  router.location = location;
  router.navigate = navigate;
  const raw = new URLSearchParams(location.search).get(SECTION_PARAM);
  const section = raw && isSectionId(raw) ? raw : null;
  const { pathname } = location;

  useEffect(() => {
    if (!section) {
      // handled (the parameter was dropped): the same link may ask again
      if (request?.finished) request = null;
      return;
    }
    // StrictMode's second run, a remount, or the same link again while it is still waiting
    if (request?.key === `${pathname}?${section}`) return;
    handleSection(section, pathname);
  }, [section, pathname]);

  return null;
};
