# Journal des versions

Écrit à la main, dans la voix du projet : ce que chaque version change pour la personne qui se sert de l'application, pas quels fichiers ont bougé. Les dates sont celles de la publication.

Rien n'est encore publié : tout ce qui suit est sous « Non publié », et le restera jusqu'à la première mise en ligne.

## Non publié

### Ajouté — une marque, et des icônes qu'on voit une fois l'application installée

- **L'application a un logo.** Un cadran, deux courses : la longue vaut les 25 minutes de travail, la courte les 5 minutes de pause, sur un tour de 30. Le rapport n'est pas décoratif, c'est le rythme que l'app arme au lancement — le dessin dit ce que fait le produit, sans légende et sans tomate. Il se tient à côté du nom, qui reste écrit en Clash Display, la police d'affichage de l'interface.
- **Installer l'application donne enfin une icône.** L'ancienne était un motif crème sur un fond crème : posée sur un écran d'accueil, elle avait l'aspect exact d'une tuile vide. La nouvelle est une tuile rouge pleine, et elle se reconnaît de loin dans une grille d'icônes.
- **L'icône « maskable » en est une.** Le fichier livré sous ce nom était la copie octet pour octet de l'icône ordinaire : les lanceurs Android, qui appliquent leur propre masque rond ou en écusson, rognaient donc un motif dessiné pour un carré. Elle est désormais dessinée pour ça — fond à fond perdu, cadran rentré dans la zone sûre.
- **Une icône monochrome**, pour les lanceurs Android qui teintent l'écran d'accueil aux couleurs du fond d'écran.
- **L'icône d'iOS ne peut plus tomber sur du noir.** iOS ne compose pas l'image qu'on lui donne, il la pose et l'arrondit lui-même : un coin transparent y devient un coin noir. L'`apple-touch-icon` est donc carrée et opaque.
- **Un téléphone qui a déjà l'application reprend la nouvelle icône.** Le dessin d'une icône change sans que son chemin bouge, et ni Safari ni le cache d'icônes d'iOS n'ont alors de raison de redemander le fichier : une app posée sur l'écran d'accueil garde le carré vide d'avant, indéfiniment, et sans rien à cliquer pour la forcer. L'adresse des icônes porte maintenant une empreinte de leur contenu, donc elle change quand le dessin change, et jamais autrement.
- **Le manifeste dit sa langue, son identité et ses catégories.** Il annonçait `en` alors que l'application est écrite en français, et n'avait pas d'`id` — deux détails que seul l'installateur lit, et qui décident de ce qu'il affiche.
- **Les icônes sont calculées, plus déposées.** `npm run icons` les redessine toutes depuis une seule géométrie ; changer le rapport travail/pause d'un nombre suffit à reprendre le jeu entier. Sans dépendance : le PNG est encodé à la main, comme dans les autres projets.
- **Un test interdit à la marque de se dédoubler.** Le script de génération ne peut pas lire du TypeScript, il recopie donc les accents et les surfaces de l'application ; le test relit le fichier, le favicon et les planches sociales, et échoue dès que l'un cesse d'être d'accord avec les autres.

### Ajouté — des images à poster, dans les couleurs de chacun

- **Un 16:9 et un 9:16**, dans `design/social/`, pour un post et pour une story. Ils portent le même logotype, la même phrase et la même horloge que la carte de lien, recomposés pour leur format : le 9:16 grossit son enseigne et empile ses mentions plutôt que d'étirer les écarts d'une carte large.
- **Clair et sombre, et les trois accents livrés** — douze fichiers, aux jetons exacts de l'application. Une image qu'on poste dit ce que le produit a l'air d'être ; le montrer dans un seul thème serait en cacher la moitié.
- **N'importe quelle couleur**, avec `npm run social -- --accent '#7A5AF8'` : l'app laisse choisir la sienne dans les réglages, les visuels aussi.
- **L'horloge et la barre décrivent enfin le même instant.** La première version affichait `25:00` au-dessus d'une barre déjà au tiers — une capture de quelque chose qui n'arrive jamais. La barre se déduit maintenant des chiffres, dans le même sens que l'app : le remplissage est le temps écoulé, les chiffres le temps restant.
- **La carte de lien passe par le même gabarit.** Toutes les planches vivent dans un seul fichier, capturé par `npm run social` : trois gabarits séparés finissent par ne plus se ressembler, et une identité se juge côte à côte.

### Ajouté — un film pour présenter le projet

- **Trente secondes montées**, en 16:9 et en 9:16. Le film ouvre sur le geste déjà commencé : ce qui arrête un pouce, c'est un chiffre qui bouge, pas un logo qu'on trace. Puis la promesse tient son carton, la session démarre et l'écran se vide, un carton dit que rien ne sort de l'appareil, les couleurs changent à l'écran, un carton sombre énumère ce que l'app refuse de faire, et la marque se trace à la fin, au-dessus d'un bouton qui dit « installe-le depuis ton navigateur ». Le logotype signe, il n'accueille pas — au début, il ne dit rien à personne.
- **Les plans durent de deux secondes et demie à six.** Un film dont chaque plan fait quatre secondes n'a pas de rythme, et on le quitte avant la fin de son argument.
- **Les plans se recouvrent, et le recouvrement est le fondu.** La sortie de chacun dure exactement ce que le suivant met à entrer, calculé au chargement depuis les deux bornes : une durée de sortie écrite à la main est fausse au premier déplacement d'une coupe. Les cartons partent vers le haut, dans le sens où le suivant arrive ; un plan filmé et un fond de couleur ne font que s'effacer, parce que l'un ou l'autre qui glisse laisserait voir le papier derrière lui. Avant, chaque plan cessait simplement d'être affiché — trente secondes de sautes.
- **Chaque plan est cadré**, et il bouge. Il dit son point de mire dans les coordonnées du tournage et dérive entre deux échelles sur toute sa durée : le geste se resserre sur le cadran et sort la colonne de statistiques du champ, la session s'ouvre à mesure que l'écran se vide. Il commence aussi là où il a quelque chose à montrer : chaque prise s'ouvrait sur une application immobile et un curseur qui arrive, et rien de tout cela n'est du film.
- **La légende a quitté l'image.** C'était un bandeau blanc en travers du sixième inférieur, posé exactement sur le bouton qu'on était en train de regarder. Elle vit maintenant dans une bande de papier sous l'image, où elle ne masque rien et ne change pas d'aspect selon le thème que le plan est en train de prendre.
- **Le 9:16 n'est pas le 16:9 avec d'autres corps.** L'application y occupe déjà toute la largeur de son écran : au-delà de 3 % de grossissement, le cadre lui coupe les flancs. Le format prend donc sa propre composition — une bande de légende plus haute, la légende rangée en haut de celle-ci, hors du nom de compte et des boutons sous lesquels une story se lit, et une enseigne plus grande au carton de fin.
- **Le découpage vit dans une page**, `design/film/film.html`. Les animations y sont écrites en vraies `@keyframes` mais mises en pause : chaque plan porte le temps écoulé depuis son entrée, et un délai négatif échantillonne l'animation à l'instant voulu. Le film est donc reproductible à l'image près, ce qu'une lecture en temps réel ne serait jamais.
- **Un plan montre les couleurs.** Thème sombre, puis vert, puis bleu — les accents se voient mieux posés sur un fond sombre, et c'est l'ordre qu'annonce la légende. Le carton qui suit garde ce fond : il reprend les jetons du thème sombre de l'application, aux mêmes valeurs, et la coupe se fait sur la même couleur.
- **L'affiche montre le produit.** C'est l'image qu'un lecteur vidéo pose avant qu'on appuie sur lecture : le cadran en plein geste, légendé, plutôt qu'une phrase seule sur du papier.
- **Ce que les deux scripts de tournage ont en commun vit à un seul endroit** (`scripts/stage.mjs`) : le navigateur ouvert sur un état connu, le curseur dessiné, les gestes adoucis. Deux copies auraient fini par ne plus tourner la même application.

### Ajouté — un film du geste

- **La durée se règle en glissant sur les chiffres**, et c'est ce qu'aucune image fixe ne montre. `npm run demo` filme la vraie application — pas une reconstitution — pendant tout le geste : on saisit les chiffres, on monte à 45 minutes, on redescend, on lâche, on démarre, et l'écran se réduit à ce qu'une session en cours demande.
- **Un GIF pour le README et les conversations**, un MP4 en 16:9 et un en 9:16 pour les réseaux — qui refusent presque tous le WebM que produit l'enregistreur.
- **Le film dessine son propre curseur**, parce qu'une capture n'enregistre pas le pointeur du système : des chiffres qui défilent sans que rien ne les touche ne se lisent pas comme un geste.
- **Il sème un mois de sessions** avant de tourner. Un relevé à zéro laisserait la moitié de l'écran vide, alors que c'est justement ce que l'application a à montrer. Le semis est calculé, pas tiré au sort : deux tournages donnent la même semaine.

### Ajouté — la licence

- **Le projet est sous AGPL-3.0-only.** Reprendre, modifier, héberger, y compris pour gagner sa vie : librement. Une seule condition, ferme : ce qui part d'ici reste ouvert. L'article 13 étend l'obligation à la simple mise en ligne — servir cette application, c'est en distribuer le code au navigateur.

### Ajouté — la première version de l'application

- **Un minuteur qui te laisse partir.** Une durée qu'on règle en glissant sur les chiffres, une session, une pause. Aucune notification pendant qu'elle tourne, aucun son pour te rappeler, aucune série à tenir : quand la session est finie, il n'y a rien à faire ici.
- **Pendant une session, l'écran se réduit** aux chiffres, à la barre et à deux boutons. Le reste n'a rien à offrir tant que tu n'es pas revenu·e.
- **La durée est un réglage, pas une constante** : session de 5 à 90 minutes, pause de 1 à 30, objectif de 1 à 12 sessions par jour. C'est ce que l'app arme au lancement et ce que comptent les statistiques.
- **Les statistiques se lisent un jour à la fois.** Chaque barre de la semaine porte son compte, chaque case du mois se touche, et le jour choisi s'écrit en toutes lettres sous les graphiques.
- **Quatre mises en page**, trois thèmes, quatre accents, français et anglais, tout retenu et appliqué sans rechargement. Le thème « système » suit l'appareil en direct, même en pleine session.
- **Une session ne se perd pas.** Le temps restant se déduit d'une échéance, pas d'un compteur qu'on décrémente : un onglet laissé en arrière-plan vingt-cinq minutes retombe exactement sur zéro, et une session arrivée à terme pendant que l'app était fermée est soldée et comptée au lancement suivant.
- **Une présentation à la première visite**, dans la langue que demande le navigateur : un lien envoyé à quelqu'un arrive sur une explication, pas sur une horloge nue. `?intro` la rappelle.
- **Ça s'installe et ça marche hors ligne.** Une nouvelle version s'installe puis attend : rien n'est remplacé sous une session en cours, et le bandeau qui la propose ne passe jamais par-dessus.
