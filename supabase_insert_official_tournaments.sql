
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
(
        '6943c4c7-a30a-4cfc-a223-78a1e2783971',
        'SÉNIOR TRIPLETTE OPEN  - TOURS',
        'Frais d''inscription/pers :10 € - Paiement sortie de poule AMICALE PETANQUE TOURS NORD Mr Ronan CAUDAL - 06 03 38 64 08 aptn37@gmail.com',
        '2026-01-11 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "TOURS", "address": "TOURS (37)", "lat": 47.0257, "lng": 2.9898}'::jsonb
    ),
(
        '6317a212-eb71-441b-bf46-e5e148ac618b',
        'SÉNIOR TRIPLETTE OPEN - TOURS',
        'Frais d''inscription/pers :10 € - Paiement sortie de poule AMICALE PETANQUE TOURS NORD Mr Ronan CAUDAL - 06 03 38 64 08 aptn37@gmail.com',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "TOURS", "address": "TOURS (37)", "lat": 46.0346, "lng": 2.8114}'::jsonb
    ),
(
        'daf5a809-72d0-4af8-837e-23f4d5483aa0',
        'SÉNIOR TRIPLETTE OPEN - CHOLET',
        'Frais d''inscription/pers :15 € CAEB CHOLET Mr Patrick CROIZER - 06 80 10 94 24 cholet.nationalpetanque@orange.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "CHOLET", "address": "CHOLET (49)", "lat": 46.4446, "lng": 2.0405}'::jsonb
    ),
(
        '32e5aabf-f485-45bd-b22e-7fb758b85687',
        'SÉNIOR TRIPLETTE OPEN - ROUEN',
        'Frais d''inscription/pers :12 € - Paiement sortie de poule ROUEN SAPINS PETANQUE Mme Nicolle CINGAL - 06 84 23 82 20 nicolle.cingal1949@orange.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "ROUEN", "address": "ROUEN (76)", "lat": 45.0538, "lng": 4.1275}'::jsonb
    ),
(
        '629879ac-eca3-455e-a4f8-09cbaeb46d64',
        'SÉNIOR TRIPLETTE OPEN - ROUEN',
        'Frais d''inscription/pers :12 € - Paiement sortie de poule ROUEN SAPINS PETANQUE Mme Nicolle CINGAL - 06 84 23 82 20 nicolle.cingal1949@orange.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "ROUEN", "address": "ROUEN (76)", "lat": 47.3893, "lng": 1.1860}'::jsonb
    ),
(
        '440650ae-f5d4-4381-99d9-61a3696e1504',
        'SÉNIOR TRIPLETTE OPEN - VIERZON',
        'Frais d''inscription/pers :10 € - Pas de paiement sortie de poule BOIS D''YÈVRE Mr Fabrice HEUSICOM - 06 70 63 18 91 heusicomfabrice@aol.com',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "VIERZON", "address": "VIERZON (18)", "lat": 43.8545, "lng": 0.9720}'::jsonb
    ),
(
        'e7dc4fb4-e47a-4fc7-b62c-66d983e8dd2f',
        'SÉNIOR TRIPLETTE OPEN - PIERREFEU DU VAR',
        'Frais d''inscription/pers :15 € SOCIETE BOULISTE LEI RIMA Mr Marc BENINTENDI - 06 87 76 80 11 leirima.boules@hotmail.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "PIERREFEU DU VAR", "address": "PIERREFEU DU VAR (83)", "lat": 47.4473, "lng": 1.8684}'::jsonb
    ),
(
        '66ee49bd-23bf-496c-ae39-27cd68d63e73',
        'SÉNIOR TRIPLETTE OPEN - GRASSE',
        'Frais d''inscription/pers :12 € - Paiement sortie de poule GRASSE PETANQUE Mr Claude BORSOTTO - 06 12 29 62 83 grassepetanque06@sfr.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "GRASSE", "address": "GRASSE (06)", "lat": 47.0909, "lng": 0.2568}'::jsonb
    ),
(
        '8c631b4d-9123-4e05-9770-edd52103d9ea',
        'SÉNIOR TRIPLETTE OPEN - SETE',
        'Frais d''inscription/pers :10 € - Paiement sortie de poule AS’S PETANQ’S SETE Mr Robert MALZIEU - 06 34 38 57 09 nationalsete@orange.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "SETE", "address": "SETE (34)", "lat": 45.5405, "lng": 2.5008}'::jsonb
    ),
(
        'b5e5d29a-7bbc-4e8b-8fda-5a9fef28af97',
        'SÉNIOR TRIPLETTE OPEN - SETE',
        'Frais d''inscription/pers :12 € - Paiement sortie de poule AS’S PETANQ’S SETE Mr Robert MALZIEU - 06 34 38 57 09 nationalsete@orange.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "SETE", "address": "SETE (34)", "lat": 48.4083, "lng": 2.5336}'::jsonb
    ),
(
        'ff39b403-197c-44b0-b8d2-93983eb8b470',
        'SÉNIOR TRIPLETTE OPEN - DRAGUIGNAN',
        'Frais d''inscription/pers :10 € - Pas de paiement sortie de poule ASSOCIATION BOULISTE DES CLUBS DE DRAGUIGNAN Mme Anne-Marie OLIVIERI-GARRUS - 06 49 47 15 78 abcdraguignan@gmail.com',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "DRAGUIGNAN", "address": "DRAGUIGNAN (83)", "lat": 45.2851, "lng": 2.0352}'::jsonb
    ),
(
        'f085a0af-9156-4207-a8e8-29c0d8b02162',
        'SÉNIOR TRIPLETTE OPEN - DRAGUIGNAN',
        'Frais d''inscription/pers :10 € - Pas de paiement sortie de poule ASSOCIATION BOULISTE DES CLUBS DE DRAGUIGNAN Mme Anne-Marie OLIVIERI-GARRUS - 06 49 47 15 78 abcdraguignan@gmail.com',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "DRAGUIGNAN", "address": "DRAGUIGNAN (83)", "lat": 45.6305, "lng": 1.3375}'::jsonb
    ),
(
        '2d2ee453-2340-4a2a-9a3f-bb5a5d3b7daa',
        'SÉNIOR TRIPLETTE OPEN - DRAGUIGNAN',
        'Frais d''inscription/pers :10 € ASSOCIATION BOULISTE DES CLUBS DE DRAGUIGNAN Mme Anne-Marie OLIVIERI-GARRUS - 06 49 47 15 78 abcdraguignan@gmail.com',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "DRAGUIGNAN", "address": "DRAGUIGNAN (83)", "lat": 45.4631, "lng": -0.1713}'::jsonb
    ),
(
        '1826b42a-d6b2-435c-8097-c6bea2dc59ea',
        'SÉNIOR TRIPLETTE OPEN - CANNES',
        'Frais d''inscription/pers :12 € - Pas de paiement sortie de poule CANNES AEROSPORTS Mme Patricia LOMBARDO - 06 24 69 09 85 cannesaerosports@free.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "CANNES", "address": "CANNES (06)", "lat": 46.2144, "lng": 1.8540}'::jsonb
    ),
(
        '536f869d-049e-4dd6-9ffd-751f74a89320',
        'SÉNIOR TRIPLETTE OPEN - CANNES',
        'Frais d''inscription/pers :15 € - Pas de paiement sortie de poule CANNES AEROSPORTS Mme Patricia LOMBARDO - 06 24 69 09 85 cannesaerosports@free.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "CANNES", "address": "CANNES (06)", "lat": 44.3716, "lng": 0.1719}'::jsonb
    ),
(
        '94bc3134-12ff-42c3-9600-834a29244752',
        'SÉNIOR TRIPLETTE OPEN - CANNES',
        'Frais d''inscription/pers :15 € - Pas de paiement sortie de poule CANNES AEROSPORTS Mme Patricia LOMBARDO - 06 24 69 09 85 cannesaerosports@free.fr',
        '2026-01-01 09:00:00'::timestamp,
        'triplettes',
        'upcoming',
        true,
        NULL, -- No real user account needed for official tournaments
        256,
        '{"city": "CANNES", "address": "CANNES (06)", "lat": 44.4684, "lng": 2.0964}'::jsonb
    );
