-- Optional: Mieten für die Beispielobjekte aus 002_demo_daten.sql setzen (nur zum Ausprobieren).
-- Voraussetzung: 009_miete.sql wurde ausgeführt.
update public.objekte set miete = 1150 where titel = 'Helle Altbauwohnung mit Balkon';
update public.objekte set miete = 1050 where titel = 'Gartenwohnung im Erdgeschoß';
update public.objekte set miete = 1450 where titel = 'Dachgeschoß mit Terrasse';
update public.objekte set miete = 580  where titel = 'Garçonniere nahe U-Bahn';
update public.objekte set miete = 950  where titel = 'Familienwohnung mit Carport';
update public.objekte set miete = 1900 where titel = 'Dachgeschoß-Maisonette';
