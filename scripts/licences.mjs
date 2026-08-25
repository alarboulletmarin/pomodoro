// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les licences de ce qui voyage dans l'app construite.
 *
 * Deux fontes et deux paquets, pas davantage, et pourtant rien de tout cela ne
 * peut être recopié à la main. Une liste écrite une fois dans un écran de
 * mentions légales est fausse au premier `npm update` et au premier changement
 * de graisse, et c'est justement celle-là qu'on ne relit jamais.
 *
 * Les fontes commandent. Clash Display est sous ITF Free Font License, Inter
 * sous SIL Open Font License 1.1, et l'une comme l'autre demandent que le
 * logiciel de fonte soit distribué **avec le texte de sa licence et sa notice
 * de copyright**. Or les `.woff2` de `public/fonts/` partent dans `dist/` et
 * sont servis à chaque visite : sans ce fichier, l'app distribuait deux fontes
 * sans leur licence. C'est la raison première de ce script.
 *
 * Le préambule sert une seconde fin. Le dépôt est sous AGPL-3.0-only, et
 * l'article 13 demande que le programme offre sa source à qui s'en sert par le
 * réseau. Un `LICENSE` resté sur GitHub ne le fait pas ; une adresse servie
 * avec l'app, si.
 *
 * La sortie vit dans `public/`, donc Vite la copie dans `dist/` : elle voyage
 * avec les fontes qu'elle couvre, ce qui est exactement ce qu'elles demandent.
 * En `.txt` et non en `.md` : un navigateur affiche l'un et télécharge l'autre,
 * et une licence qu'il faut télécharger pour lire n'est pas mise à disposition.
 *
 * `--check` rejoue la génération sans écrire et échoue si le fichier commité a
 * pris du retard. C'est ce que la CI appelle, avant de construire : le jour où
 * une dépendance change de licence ou une fonte de fichier, la porte de sortie
 * crie avant que le dépôt ne mente.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/licences-tierces.txt';
const FONTS_DIR = 'public/fonts';

const ROOT = JSON.parse(readFileSync('package.json', 'utf8'));

/* L'adresse de la source, lue sur le manifeste et non recopiée : c'est l'offre
   que l'article 13 de l'AGPL demande, et une URL fausse dans un fichier servi
   avec l'app serait pire que pas d'URL du tout. Le `git+` et le `.git` sont la
   forme que npm attend, pas celle qu'on ouvre dans un navigateur. */
const REPO_URL = ROOT.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

/* Le nom du fichier de licence n'est normalisé nulle part : chaque paquet
   choisit sa casse, son extension et son orthographe. On les essaie dans
   l'ordre du plus courant, et on échoue bruyamment plutôt que d'omettre une
   notice. */
const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'license',
  'license.md',
];

/**
 * Les fontes embarquées, nommées une par une.
 *
 * Elles ne viennent pas de `node_modules` : les `.woff2` sont sous-ensemblés et
 * posés à la main dans `public/fonts/`, avec le texte de leur licence à côté.
 * Rien dans l'arborescence ne dit quelle notice couvre quel fichier, donc c'est
 * écrit ici, et la génération recoupe cette liste avec ce que le dossier
 * contient vraiment.
 */
const FONTS = [
  {
    name: 'Clash Display',
    author: 'Indian Type Foundry',
    licence: 'ITF Free Font License',
    home: 'https://www.fontshare.com/fonts/clash-display',
    files: ['clash-display-500.woff2', 'clash-display-600.woff2'],
    notice: 'clash-display-LICENSE.txt',
  },
  {
    name: 'Inter',
    author: 'The Inter Project Authors',
    licence: 'SIL Open Font License 1.1',
    home: 'https://rsms.me/inter/',
    files: ['inter-variable.woff2'],
    notice: 'inter-LICENSE.txt',
  },
];

/**
 * Les paquets qui voyagent vraiment.
 *
 * Les `dependencies` du manifeste et, transitivement, les leurs : `react-dom`
 * embarque `scheduler`, les deux embarquent `loose-envify`. Les
 * `devDependencies` sont exclues, elles construisent l'app et ne partent pas
 * avec elle ; les inscrire ferait passer pour distribué ce qui ne l'est pas.
 */
function shippedPackages() {
  const found = new Map();

  const visit = (name) => {
    if (found.has(name)) return;
    const dir = join('node_modules', name);
    if (!existsSync(join(dir, 'package.json'))) {
      throw new Error(`Paquet absent de node_modules : ${name}. Lance « npm ci » d'abord.`);
    }
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    found.set(name, { dir, manifest });
    for (const dependency of Object.keys(manifest.dependencies ?? {})) visit(dependency);
  };

  for (const dependency of Object.keys(ROOT.dependencies ?? {})) visit(dependency);
  return [...found.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));
}

/** Le texte de licence posé à la racine d'un dossier de paquet. */
function licenseTextOf(dir, name) {
  for (const file of LICENSE_FILES) {
    const path = join(dir, file);
    if (existsSync(path)) return readFileSync(path, 'utf8').trimEnd();
  }
  /* Aucun repli : une notice manquante est le problème que ce fichier existe
     pour régler, et la remplacer par « voir le paquet » ne la rend pas. */
  throw new Error(`Aucun fichier de licence trouvé pour ${name} dans ${dir}.`);
}

/**
 * Les notices des fontes, recoupées avec le dossier qui les sert.
 *
 * La comparaison va dans les deux sens à dessein. Une fonte ajoutée sans son
 * entrée serait servie sans licence, ce que ni l'OFL ni la FFL n'autorisent ;
 * une entrée restée là après le retrait d'un fichier ferait dire au dépôt qu'il
 * distribue ce qu'il ne distribue plus.
 */
function fontNotices() {
  const served = readdirSync(FONTS_DIR)
    .filter((file) => file.endsWith('.woff2'))
    .sort();
  const declared = FONTS.flatMap((font) => font.files).sort();
  if (served.join('|') !== declared.join('|')) {
    throw new Error(
      `Les fontes servies et celles déclarées dans scripts/licences.mjs divergent.\n` +
        `  servies  : ${served.join(', ')}\n` +
        `  déclarées : ${declared.join(', ')}`,
    );
  }
  return FONTS.map((font) => ({
    ...font,
    text: readFileSync(join(FONTS_DIR, font.notice), 'utf8').trimEnd(),
  }));
}

const RULE = '='.repeat(78);

function render(packages, fonts) {
  const lines = [
    'Licences des composants tiers, Pomodoro',
    RULE,
    '',
    'Pomodoro est publié sous licence GNU Affero General Public License, version 3',
    'seulement. Le texte intégral est dans le fichier LICENSE du dépôt, et la source',
    "complète du programme tel qu'il tourne est ici :",
    '',
    `  ${REPO_URL}`,
    '',
    "Les composants ci-dessous sont l'œuvre de tiers, portent leur propre licence, et",
    "voyagent dans la version construite de l'app : leur code ou leurs fichiers de",
    "fonte sont servis au navigateur de qui l'ouvre.",
    '',
    'Les deux fontes demandent que le logiciel de fonte soit distribué avec sa licence',
    "et sa notice de copyright. C'est la raison première de ce fichier ; les licences",
    'de tous les composants sont reproduites intégralement plus bas.',
    '',
    'Il est produit par « npm run licences », jamais écrit à la main, et la CI échoue',
    "s'il a pris du retard.",
    '',
    RULE,
    '',
  ];

  for (const font of fonts) {
    lines.push(`  ${font.name} (fonte) : ${font.licence}`);
  }
  for (const [name, { manifest }] of packages) {
    lines.push(`  ${name} ${manifest.version} : ${manifest.license ?? 'licence non déclarée'}`);
  }

  lines.push('');
  for (const font of fonts) {
    lines.push(
      '',
      RULE,
      `${font.name} (fonte)`,
      `Auteur : ${font.author}`,
      `Licence déclarée : ${font.licence}`,
      `Page du projet : ${font.home}`,
      `Fichiers servis : ${font.files.join(', ')}`,
      RULE,
      '',
      font.text,
      '',
    );
  }
  for (const [name, { dir, manifest }] of packages) {
    lines.push(
      '',
      RULE,
      `${name} ${manifest.version}`,
      `Licence déclarée : ${manifest.license ?? 'non déclarée'}`,
      ...(typeof manifest.homepage === 'string' ? [`Page du projet : ${manifest.homepage}`] : []),
      RULE,
      '',
      licenseTextOf(dir, name),
      '',
    );
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

const expected = render(shippedPackages(), fontNotices());

if (process.argv.includes('--check')) {
  const actual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (actual !== expected) {
    console.error(`${OUT} n'est plus à jour. Lance « npm run licences » et commite le résultat.`);
    process.exit(1);
  }
  console.log(`${OUT} : à jour.`);
} else {
  writeFileSync(OUT, expected);
  console.log(`${OUT} : écrit.`);
}
