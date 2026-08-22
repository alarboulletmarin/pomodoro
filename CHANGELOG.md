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
- **Le manifeste dit sa langue, son identité et ses catégories.** Il annonçait `en` alors que l'application est écrite en français, et n'avait pas d'`id` — deux détails que seul l'installateur lit, et qui décident de ce qu'il affiche.
- **Les icônes sont calculées, plus déposées.** `npm run icons` les redessine toutes depuis une seule géométrie ; changer le rapport travail/pause d'un nombre suffit à reprendre le jeu entier. Sans dépendance : le PNG est encodé à la main, comme dans les autres projets.

### Ajouté — trois images à poster

- **Un 16:9 et un 9:16**, dans `design/social/`, pour un post et pour une story. Ils portent le même logotype, la même phrase et la même horloge que la carte de lien, recomposés pour leur format : le 9:16 grossit son enseigne et empile ses mentions plutôt que d'étirer les écarts d'une carte large.
- **La carte de lien passe par le même gabarit.** Les trois planches vivent dans un seul fichier, capturé par `npm run social` : trois gabarits séparés finissent par ne plus se ressembler, et une identité se juge côte à côte.

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
