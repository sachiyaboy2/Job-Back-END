/**
 * Response helpers.
 *
 * Every success body carries `success: true`. Single resources are exposed
 * twice - once under a named key (`job`, `user`, ...) and once under `data` -
 * so a client can read either without guessing. Lists carry `data` plus `meta`.
 */

/** Success body with a payload: { success, message?, data } */
export function ok(res, data, message) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  return res.json(body);
}

/** Success body for one resource: { success, message?, <key>: resource, data: resource } */
export function okResource(res, key, resource, message) {
  const body = { success: true };
  if (message) body.message = message;
  body[key] = resource;
  body.data = resource;
  return res.json(body);
}

/** Created body (201) for one resource. */
export function okCreated(res, key, resource, message) {
  const body = { success: true };
  if (message) body.message = message;
  body[key] = resource;
  body.data = resource;
  return res.status(201).json(body);
}

/** Success body for a list: { success, <key>: items, data: items, meta } */
export function okList(res, key, items, meta) {
  return res.json({ success: true, [key]: items, data: items, meta });
}

export default { ok, okResource, okCreated, okList };
