export const getAppUrl = (path) => (
  new URL(`${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`, window.location.origin).toString()
);
