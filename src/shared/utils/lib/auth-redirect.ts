/** Return only local application routes, including links produced by the older double encoding. */
export const getPostSigninPath = (redirect: string | null | undefined): string => {
  if (!redirect) return '/';
  let path = redirect;
  try {
    // URLSearchParams already decodes the query once. Older links encoded the whole route twice.
    if (!path.startsWith('/')) path = decodeURIComponent(path);
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f]/.test(path)) return '/';
    const url = new URL(path, 'https://app.invalid');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('//') || /[\\\u0000-\u001f]/.test(pathname) || isSigninPath(pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
};

export const isSigninPath = (pathname: string) => /^\/signin(?:\/|$)/i.test(pathname);

/** Encode a return route exactly once and never make the sign-in page its own destination. */
export const getSigninUrl = (location: Pick<Location, 'pathname' | 'search'> & Partial<Pick<Location, 'hash'>>) => {
  if (isSigninPath(location.pathname)) return '/signin';
  const redirect = getPostSigninPath(location.pathname + location.search + (location.hash || ''));
  return `/signin?${new URLSearchParams({ 'redirect-url': redirect })}`;
};

/** Failed credentials stay on the form; expired sessions on application routes return to sign-in. */
export const redirectToSignin = () => {
  if (isSigninPath(window.location.pathname)) return;
  setTimeout(() => {
    const credentials = window.localStorage.getItem('digital-twin-credentials');
    window.localStorage.clear();
    if (credentials) window.localStorage.setItem('digital-twin-credentials', credentials);
    window.location.replace(getSigninUrl(window.location));
  }, 1000);
};
