/**
 * Le rechargement, isolé dans son module.
 *
 * `location.reload` n'est pas redéfinissable sous jsdom : sans cette porte,
 * le chemin qui ramène la page ne pourrait pas être vérifié par un test.
 */
export function hardReload(): void {
  window.location.reload();
}
