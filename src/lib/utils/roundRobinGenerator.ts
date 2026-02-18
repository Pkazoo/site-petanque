export interface GeneratedMatch {
    team1_player_ids: string[];
    team2_player_ids: string[];
    round_number: number;
    type: 'tete-a-tete' | 'doublette' | 'triplettes';
}

/**
 * Tête-à-tête : chaque joueur rencontre tous les autres exactement une fois.
 * Utilise la méthode du cercle (circle method) pour le round-robin.
 */
function generateTeteATete(playerIds: string[]): GeneratedMatch[] {
    const players = [...playerIds];
    if (players.length % 2 !== 0) {
        players.push('__BYE__');
    }
    const n = players.length;
    const matches: GeneratedMatch[] = [];

    for (let round = 0; round < n - 1; round++) {
        for (let i = 0; i < n / 2; i++) {
            const p1 = players[i];
            const p2 = players[n - 1 - i];
            if (p1 === '__BYE__' || p2 === '__BYE__') continue;
            matches.push({
                team1_player_ids: [p1],
                team2_player_ids: [p2],
                round_number: round + 1,
                type: 'tete-a-tete',
            });
        }
        // Rotation : fixer players[0], faire tourner le reste
        const last = players.pop()!;
        players.splice(1, 0, last);
    }
    return matches;
}

/**
 * Génère toutes les combinaisons de k éléments parmi un tableau.
 */
function combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const result: T[][] = [];

    function backtrack(start: number, current: T[]) {
        if (current.length === k) {
            result.push([...current]);
            return;
        }
        for (let i = start; i <= arr.length - (k - current.length); i++) {
            current.push(arr[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }

    backtrack(0, []);
    return result;
}

/**
 * Doublettes / Triplettes "tous contre tous" :
 * - Chaque paire de joueurs est coéquipière au plus une fois (équipes uniques)
 * - Nombre maximum de matchs avec équilibre du nombre de parties par joueur
 * - Attribution correcte des tours (un joueur ne joue qu'une fois par tour)
 *
 * Algorithme :
 * 1. Générer toutes les C(N, teamSize) équipes possibles
 * 2. Appariement glouton équilibré : les équipes dont les joueurs ont le moins
 *    joué sont prioritaires → garantit un écart max de 1 match entre joueurs
 * 3. Chaque équipe n'est utilisée qu'une seule fois → partenariats uniques
 * 4. Attribution des tours par coloration gloutonne du graphe de conflits
 */
function generateTeamMatches(
    playerIds: string[],
    teamSize: 2 | 3,
): GeneratedMatch[] {
    const type = teamSize === 2 ? 'doublette' : 'triplettes';

    // 1. Toutes les équipes possibles
    const allTeams = combinations(playerIds, teamSize);

    // 2. Appariement glouton avec équilibrage
    const playCount = new Map(playerIds.map(p => [p, 0]));
    const matches: GeneratedMatch[] = [];
    let available = allTeams.map((team, idx) => ({ team, idx }));

    while (available.length >= 2) {
        // Trier par nombre total de matchs joués (croissant) → priorité aux sous-représentés
        available.sort((a, b) => {
            const sa = a.team.reduce((s, p) => s + (playCount.get(p) || 0), 0);
            const sb = b.team.reduce((s, p) => s + (playCount.get(p) || 0), 0);
            return sa - sb;
        });

        let matched = false;
        for (let i = 0; i < available.length && !matched; i++) {
            for (let j = i + 1; j < available.length; j++) {
                const t1 = available[i].team;
                const t2 = available[j].team;
                // Vérifier qu'aucun joueur n'est dans les deux équipes
                if (!t1.some(p => t2.includes(p))) {
                    matches.push({
                        team1_player_ids: t1,
                        team2_player_ids: t2,
                        round_number: 0, // assigné plus bas
                        type,
                    });
                    [...t1, ...t2].forEach(p => playCount.set(p, (playCount.get(p) || 0) + 1));
                    available = available.filter((_, idx) => idx !== i && idx !== j);
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) break; // plus d'appariement possible
    }

    // 3. Attribution des tours par coloration gloutonne
    // Deux matchs qui partagent un joueur ne peuvent pas être dans le même tour
    const matchPlayerSets = matches.map(m =>
        new Set([...m.team1_player_ids, ...m.team2_player_ids])
    );

    for (let i = 0; i < matches.length; i++) {
        const usedRounds = new Set<number>();
        for (let j = 0; j < i; j++) {
            for (const p of matchPlayerSets[i]) {
                if (matchPlayerSets[j].has(p)) {
                    usedRounds.add(matches[j].round_number);
                    break;
                }
            }
        }
        let round = 1;
        while (usedRounds.has(round)) round++;
        matches[i].round_number = round;
    }

    matches.sort((a, b) => a.round_number - b.round_number);
    return matches;
}

export function generateRoundRobinMatches(
    playerIds: string[],
    format: 'tete-a-tete' | 'doublette' | 'triplettes',
): GeneratedMatch[] {
    if (format === 'tete-a-tete') {
        return generateTeteATete(playerIds);
    }
    const teamSize = format === 'doublette' ? 2 : 3;
    return generateTeamMatches(playerIds, teamSize);
}

/**
 * Estime le nombre de matchs pour l'aperçu dans l'UI.
 * = floor(C(N, teamSize) / 2) pour doublette/triplettes
 */
export function estimateMatchCount(playerCount: number, format: string): number {
    if (format === 'tete-a-tete') {
        return (playerCount * (playerCount - 1)) / 2;
    }
    const teamSize = format === 'doublette' ? 2 : 3;
    // C(n, teamSize)
    let nCk = 1;
    for (let i = 0; i < teamSize; i++) {
        nCk = nCk * (playerCount - i) / (i + 1);
    }
    return Math.floor(nCk / 2);
}
