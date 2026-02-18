const fs = require('fs');

// Full data from prompt
const rawData = `5 TOURS
(37)
6 TOURS
(37)
7 CHOLET
(49)
8 ROUEN
(76)
9 ROUEN
(76)
10 VIERZON
(18)
11
PIERREFEU
DU VAR
(83)
12 GRASSE
(06)
13 SETE
(34)
14 SETE
(34)
15 DRAGUIGNAN
(83)
16 DRAGUIGNAN
(83)
17 DRAGUIGNAN
(83)
18 CANNES
(06)
19 CANNES
(06)
20 CANNES
(06)
JANVIER 2026
SÉNIOR TRIPLETTE OPEN
10 et 11 janvier 2026 Par poules 9h00 Limité à 384 FÉMININ TRIPLETTE
10 et 11 janvier 2026 9h00 Par poules Limité à 128 FÉVRIER 2026
SÉNIOR TRIPLETTE OPEN
7 et 8 février 2026 Elimination directe 8h00 Limité à 384 MIXTE DOUBLETTE
7 et 8 février 2026 9h00 Par poules Limité à 256 SÉNIOR TRIPLETTE OPEN
14 et 15 février 2026 9h00 Par poules Limité à 256 SÉNIOR TRIPLETTE OPEN
21 et 22 février 2026 9h00 Par poules Limité à 256 MARS 2026
JEU PROVENÇAL TRIPLETTE OPEN
13 au 15 mars 2026 Elimination directe 9h00 Limité à 256 MIXTE TRIPLETTE
14 et 15 mars 2026 9h30 Par poules Limité à 128 MAI 2026
VÉTÉRAN TRIPLETTE OPEN
7 et 8 maI 2026 Par poules 9h30 Limité à 192 FÉMININ TRIPLETTE
9 et 10 maI 2026 9h30 Par poules Limité à 256 SÉNIOR TRIPLETTE OPEN
14 et 15 mai 2026 9h00 Par poules Limité à 320 FÉMININ DOUBLETTE
14 et 15 mai 2026 10h00 Par poules Limité à 128 JEU PROVENÇAL TRIPLETTE OPEN
16 et 17 mai 2026 9h00 Elimination directe Limité à 128 VÉTÉRAN TRIPLETTE OPEN
21 et 22 mai 2026 10h00 Par poules Limité à 128 SÉNIOR TRIPLETTE OPEN
23 et 24 mai 2026 9h00 Par poules Limité à 256 FÉMININ DOUBLETTE
23 et 24 mai 2026 14h00 Par poules Limité à 128 Frais d'inscription/pers : 10 € - Paiement sortie de poule
AMICALE PETANQUE TOURS NORD
Mr Ronan CAUDAL - 06 03 38 64 08
aptn37@gmail.com
Frais d'inscription/pers : 10 € - Paiement sortie de poule
AMICALE PETANQUE TOURS NORD
Mr Ronan CAUDAL - 06 03 38 64 08
aptn37@gmail.com
Frais d'inscription/pers : 15 €
CAEB CHOLET
Mr Patrick CROIZER - 06 80 10 94 24
cholet.nationalpetanque@orange.fr
Frais d'inscription/pers : 12 € - Paiement sortie de poule
ROUEN SAPINS PETANQUE
Mme Nicolle CINGAL - 06 84 23 82 20
nicolle.cingal1949@orange.fr
Frais d'inscription/pers : 12 € - Paiement sortie de poule
ROUEN SAPINS PETANQUE
Mme Nicolle CINGAL - 06 84 23 82 20
nicolle.cingal1949@orange.fr
Frais d'inscription/pers : 10 € - Pas de paiement sortie de poule
BOIS D'YÈVRE
Mr Fabrice HEUSICOM - 06 70 63 18 91
heusicomfabrice@aol.com
Frais d'inscription/pers : 15 €
SOCIETE BOULISTE LEI RIMA
Mr Marc BENINTENDI - 06 87 76 80 11
leirima.boules@hotmail.fr
Frais d'inscription/pers : 12 € - Paiement sortie de poule
GRASSE PETANQUE
Mr Claude BORSOTTO - 06 12 29 62 83
grassepetanque06@sfr.fr
Frais d'inscription/pers : 10 € - Paiement sortie de poule
AS’S PETANQ’S SETE
Mr Robert MALZIEU - 06 34 38 57 09
nationalsete@orange.fr
Frais d'inscription/pers : 12 € - Paiement sortie de poule
AS’S PETANQ’S SETE
Mr Robert MALZIEU - 06 34 38 57 09
nationalsete@orange.fr
Frais d'inscription/pers : 10 € - Pas de paiement sortie de poule
ASSOCIATION BOULISTE DES CLUBS DE DRAGUIGNAN
Mme Anne-Marie OLIVIERI-GARRUS - 06 49 47 15 78
abcdraguignan@gmail.com
Frais d'inscription/pers : 10 € - Pas de paiement sortie de poule
ASSOCIATION BOULISTE DES CLUBS DE DRAGUIGNAN
Mme Anne-Marie OLIVIERI-GARRUS - 06 49 47 15 78
abcdraguignan@gmail.com
Frais d'inscription/pers : 10 €
ASSOCIATION BOULISTE DES CLUBS DE DRAGUIGNAN
Mme Anne-Marie OLIVIERI-GARRUS - 06 49 47 15 78
abcdraguignan@gmail.com
Frais d'inscription/pers : 12 € - Pas de paiement sortie de poule
CANNES AEROSPORTS
Mme Patricia LOMBARDO - 06 24 69 09 85
cannesaerosports@free.fr
Frais d'inscription/pers : 15 € - Pas de paiement sortie de poule
CANNES AEROSPORTS
Mme Patricia LOMBARDO - 06 24 69 09 85
cannesaerosports@free.fr
Frais d'inscription/pers : 15 € - Pas de paiement sortie de poule
CANNES AEROSPORTS
Mme Patricia LOMBARDO - 06 24 69 09 85
cannesaerosports@free.fr`;

const escapeSql = (str) => str ? str.replace(/'/g, "''").replace(/\n/g, " ") : '';

// 1. Extract IDs and Locations from top of file
const idMap = new Map();
const lines = rawData.split('\n');
let idBuffer = [];

// Determine where the ID block ends (ends at "JANVIER 2026")
const startOfDataIndex = lines.findIndex(l => l.includes('JANVIER 2026'));
const idBlock = lines.slice(0, startOfDataIndex);
const contentBlock = lines.slice(startOfDataIndex).join('\n');

// Parse IDs
let currentId = null;
for (let i = 0; i < idBlock.length; i++) {
    const line = idBlock[i].trim();
    if (!line) continue;

    // "5 TOURS"
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
        currentId = match[1];
        let city = match[2];
        let dept = '';

        // Peek next line for dept or continuation
        if (i + 1 < idBlock.length) {
            let next = idBlock[i + 1].trim();
            if (next.match(/^\(\d+\)$/)) {
                dept = next.replace(/[()]/g, '');
                i++;
            } else if (!next.match(/^\d+\s+/)) {
                // Continuation "PIERREFEU / DU VAR"
                city += ' ' + next;
                i++;
                if (i + 1 < idBlock.length && idBlock[i + 1].trim().match(/^\(\d+\)$/)) {
                    dept = idBlock[i + 1].trim().replace(/[()]/g, '');
                    i++;
                }
            }
        }
        idMap.set(currentId, { id: currentId, city, dept });
    } else if (line.match(/^\d+$/)) {
        // "11" on its own line
        currentId = line;
        let city = "";
        let dept = "";
        // Next lines are city
        if (i + 1 < idBlock.length) {
            city = idBlock[i + 1].trim();
            i++;
            // Maybe more city or dept
            if (i + 1 < idBlock.length) {
                const next = idBlock[i + 1].trim();
                if (next.match(/^\(\d+\)$/)) {
                    dept = next.replace(/[()]/g, '');
                    i++;
                } else {
                    city += " " + next;
                    i++;
                    if (i + 1 < idBlock.length && idBlock[i + 1].trim().match(/^\(\d+\)$/)) {
                        dept = idBlock[i + 1].trim().replace(/[()]/g, '');
                        i++;
                    }
                }
            }
        }
        idMap.set(currentId, { id: currentId, city, dept });
    }
}

// 2. Parse Content Block
// Split by "Frais d'inscription"
const parts = contentBlock.split(/Frais d'inscription\/pers\s*:/);

// part[0] contains T1 Info (and header)
// part[1] starts with T1 Fees... ends with T2 Info
// part[k] starts with Tk Fees... ends with Tk+1 Info

const parsedTournaments = [];
const ids = Array.from(idMap.keys()).sort((a, b) => parseInt(a) - parseInt(b));

// Helper to extract Type and Date from a text block
// We look for patterns like "SÉNIOR", "FÉMININ" etc to start the type.
const extractInfo = (text) => {
    // Clean text
    text = text.replace(/JANVIER 2026|NICE|OCTOBRE 2026|MAI 2026|JUIN 2026|MARS 2026|FÉVRIER 2026|AVRIL 2026|AOUT 2026|JUILLET 2026|SEPTEMBRE 2026|NOVEMBRE 2026|DECEMBRE 2026|\d+\s+\d+\s+\d+\s+\d+/g, ' ');
    // The user data sometimes has row numbers "21 22 23..." mixed in, we assume we ignore them or they are separators.

    // Find Type. Types are usually uppercase.
    // "SÉNIOR TRIPLETTE OPEN"
    // "FÉMININ DOUBLETTE"
    const typeMatch = text.match(/(SÉNIOR|FÉMININ|MIXTE|VÉTÉRAN|JEU PROVENÇAL|INDIVIDUEL)\s+([A-ZÀ-ÿ\s]+)/);
    let type = typeMatch ? typeMatch[0] : "SÉNIOR TRIPLETTE OPEN"; // Default

    // Find Date
    // "10 et 11 janvier 2026"
    const dateMatch = text.match(/\d{1,2}.+\d{4}/);
    let date = dateMatch ? dateMatch[0] : "2026-01-01";

    return { type, date, raw: text.trim().replace(/\s+/g, ' ') };
};

// Processing Loop
// We have parts.length segments.
// part[0] -> Info for T1
// part[1] -> Fees T1 ... Info T2
// ...
// part[N] -> Fees TN ... Info T(N+1)?? No, last part is just Fees TN.

// However, rawData split creates N+1 parts if there are N "Frais..." separators?
// If we have 16 tournaments, likely 16 "Frais..." lines.
// So we get 17 parts?
// Let's check part count vs ID count.
// idMap size ~ 16.
// parts length should be ~ 17?

// Logic:
// T1 Info is in parts[0]
// T1 Fees is in start of parts[1]
// T2 Info is in end of parts[1]
// T2 Fees is in start of parts[2]
// ...
// Ti Info is in end of parts[i-1]
// Ti Fees is in start of parts[i]

for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const location = idMap.get(id);

    // Info matches part i (if 0-indexed matches ID sequence)
    // T1 (i=0) info in parts[0].
    // Fees in parts[1].

    if (i + 1 >= parts.length) break; // Safety

    // Extract Info from parts[i] (searching from end or strictly finding the Type pattern)
    // Actually, parts[0] contains ONLY T1 Info + Header.
    // parts[1] contains T1 Fees/Org + T2 Info.

    // So for Ti (index i):
    // Info source = parts[i]
    // Fees source = parts[i+1]

    const infoSource = parts[i];
    const feesSource = parts[i + 1];

    // Parse Info
    // We look for the LAST occurrence of a Type/Date pattern in infoSource?
    // No, parts[0] has T1 Info.
    // parts[1] has T1 Fees... T2 Info.
    // So T2 Info is at the END of parts[1].

    // For T1 (i=0): Info in parts[0].

    let infoText = infoSource;
    // If i > 0, infoText contains Tk Fees/Org at start. We want the END part.
    // We can try to split infoSource by "Mr" or "Mme" contact? No.
    // We can look for the Start of Type.

    if (i > 0) {
        // Find split point between Org (previous tourney) and Info (current tourney)
        // Org usually ends with email address or phone.
        // Info starts with Header or Type.
        const splitMatch = infoSource.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        if (splitMatch) {
            const emailIndex = splitMatch.index + splitMatch[0].length;
            infoText = infoSource.substring(emailIndex);
        }
    }

    const info = extractInfo(infoText);

    // Parse Fees/Org
    // feesSource starts with " 10 €..."
    // Ends at start of next tourney info (or end of string).
    // We take everything up to the next Type pattern?
    // Actually we split by "Frais..." so feesSource DOES NOT contain next "Frais...".
    // It contains Fees... Org... NextInfo.
    // We want Fees... Org...

    let feesOrgText = feesSource;
    // Cut off Next Info
    const nextTypeMatch = feesSource.match(/(JANVIER|FÉVRIER|MARS|MAI|JUIN|SÉNIOR|FÉMININ|MIXTE|VÉTÉRAN|JEU PROVENÇAL)/);
    if (nextTypeMatch && nextTypeMatch.index > 20) { // Safety margin
        feesOrgText = feesSource.substring(0, nextTypeMatch.index);
    }

    // Clean feesOrgText
    feesOrgText = "Frais d'inscription/pers :" + feesOrgText.trim();

    // Construct Object
    parsedTournaments.push({
        id: id,
        city: location.city,
        dept: location.dept,
        type: info.type,
        date: info.date,
        details: feesOrgText.replace(/\s+/g, ' ').trim()
    });
}

// Generate SQL
const parseDateSQL = (d) => {
    const months = { 'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12' };
    const text = d.toLowerCase().replace(/au/g, ' ').replace(/et/g, ' ');
    const parts = text.split(/[^a-z0-9]+/);

    let day = '01';
    let month = '01';

    for (const p of parts) {
        if (p.match(/^\d{1,2}$/)) day = p.padStart(2, '0');
        if (months[p]) month = months[p];
    }
    return `2026-${month}-${day} 09:00:00`;
};

const mapType = (t) => {
    t = t.toUpperCase();
    if (t.includes('TRIPLETTE')) return 'triplettes';
    if (t.includes('DOUBLETTE')) return 'doublettes';
    return 'tete-a-tete';
};

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

let sql = `
-- Fix: ensure is_official column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'is_official') THEN 
        ALTER TABLE tournaments ADD COLUMN is_official BOOLEAN DEFAULT FALSE; 
    END IF; 
END $$;

INSERT INTO tournaments (
    id, name, description, date, type, status, is_official, organizer_id, max_participants, location
) VALUES
`;

const sqlValues = parsedTournaments.map(t => {
    const uuid = generateUUID();
    const ts = parseDateSQL(t.date);
    const type = mapType(t.type);
    const desc = escapeSql(t.details);

    // Coordinates (Mock for now, or could map cities to lat/long if we had a list)
    // Random coords near France center to spread them out on map
    const lat = 46.0 + (Math.random() - 0.5) * 5;
    const lng = 2.0 + (Math.random() - 0.5) * 5;

    return `(
        '${uuid}',
        '${escapeSql(t.type)} - ${escapeSql(t.city)}',
        '${desc}',
        '${ts}'::timestamp,
        '${type}',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "${escapeSql(t.city)}", "address": "${escapeSql(t.city)} (${t.dept})", "lat": ${lat.toFixed(4)}, "lng": ${lng.toFixed(4)}}'::jsonb
    )`;
});

sql += sqlValues.join(',\n') + ';';
console.log(sql);
