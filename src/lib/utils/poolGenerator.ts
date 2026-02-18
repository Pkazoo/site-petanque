/**
 * Utilitaires pour la generation de poules et le calcul des classements
 */

export interface PoolMatch {
    team1Id: string;
    team2Id: string;
    round: number;
}

export interface PoolStanding {
    teamId: string;
    played: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDiff: number;
}

/**
 * Repartit les equipes dans des poules equilibrees.
 * Si le reste est < 2, les equipes restantes sont ajoutees aux dernieres poules.
 */
export function distributeTeamsIntoPools(teamIds: string[], poolSize: number): string[][] {
    const pools: string[][] = [];
    const poolCount = Math.floor(teamIds.length / poolSize);

    // Creer les poules de base
    for (let i = 0; i < poolCount; i++) {
        pools.push(teamIds.slice(i * poolSize, (i + 1) * poolSize));
    }

    // Distribuer le reste
    const remainder = teamIds.slice(poolCount * poolSize);
    if (remainder.length > 0) {
        if (remainder.length >= 2) {
            // Assez pour une poule supplementaire (poule plus petite)
            pools.push(remainder);
        } else {
            // 1 equipe restante : l'ajouter a la derniere poule
            if (pools.length > 0) {
                pools[pools.length - 1].push(...remainder);
            } else {
                pools.push(remainder);
            }
        }
    }

    return pools;
}

/**
 * Genere les matchs round-robin pour une poule (methode du cercle).
 * Pour N equipes : N*(N-1)/2 matchs.
 */
export function generatePoolRoundRobin(teamIds: string[]): PoolMatch[] {
    const matches: PoolMatch[] = [];
    const n = teamIds.length;

    if (n < 2) return matches;

    // Methode du cercle pour le round-robin
    const teams = [...teamIds];
    const hasBye = n % 2 !== 0;
    if (hasBye) {
        teams.push('BYE');
    }

    const totalTeams = teams.length;
    const rounds = totalTeams - 1;

    for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < totalTeams / 2; i++) {
            const home = teams[i];
            const away = teams[totalTeams - 1 - i];

            // Ignorer les matchs avec BYE
            if (home === 'BYE' || away === 'BYE') continue;

            matches.push({
                team1Id: home,
                team2Id: away,
                round: round + 1,
            });
        }

        // Rotation : le premier reste fixe, les autres tournent
        const last = teams.pop()!;
        teams.splice(1, 0, last);
    }

    return matches;
}

/**
 * Calcule le classement d'une poule a partir des matchs termines.
 * Tri : victoires desc, difference de points desc, points marques desc.
 */
export function calculatePoolStandings(
    matches: { team1Id?: string; team2Id?: string; score1?: number; score2?: number; winnerId?: string; status: string; poolId?: string }[],
    poolId: string
): PoolStanding[] {
    const statsMap = new Map<string, PoolStanding>();

    const poolMatches = matches.filter(m => m.poolId === poolId && m.status === 'completed');

    for (const m of poolMatches) {
        if (!m.team1Id || !m.team2Id) continue;

        // Init stats si necessaire
        if (!statsMap.has(m.team1Id)) {
            statsMap.set(m.team1Id, { teamId: m.team1Id, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 });
        }
        if (!statsMap.has(m.team2Id)) {
            statsMap.set(m.team2Id, { teamId: m.team2Id, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 });
        }

        const s1 = statsMap.get(m.team1Id)!;
        const s2 = statsMap.get(m.team2Id)!;

        s1.played++;
        s2.played++;
        s1.pointsFor += m.score1 ?? 0;
        s1.pointsAgainst += m.score2 ?? 0;
        s2.pointsFor += m.score2 ?? 0;
        s2.pointsAgainst += m.score1 ?? 0;

        if (m.winnerId === m.team1Id) {
            s1.wins++;
            s2.losses++;
        } else if (m.winnerId === m.team2Id) {
            s2.wins++;
            s1.losses++;
        }
    }

    // Calculer les diffs et trier
    const standings = Array.from(statsMap.values());
    for (const s of standings) {
        s.pointDiff = s.pointsFor - s.pointsAgainst;
    }

    standings.sort((a, b) => {
        // 1. Victoires
        if (b.wins !== a.wins) return b.wins - a.wins;
        // 2. Difference de points
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        // 3. Points marques
        return b.pointsFor - a.pointsFor;
    });

    return standings;
}

/**
 * Retourne le nom de la poule (A, B, C, ...) a partir de son index.
 */
export function getPoolName(index: number): string {
    return String.fromCharCode(65 + index); // A=0, B=1, C=2...
}
