-- Optional: Zustand für die Beispielobjekte aus 002_demo_daten.sql setzen (nur zum Ausprobieren).
update public.objekte set zustand = 'saniert'                 where titel = 'Helle Altbauwohnung mit Balkon';
update public.objekte set zustand = 'neuwertig'               where titel = 'Gartenwohnung im Erdgeschoß';
update public.objekte set zustand = 'vollstaendig_renoviert'  where titel = 'Dachgeschoß mit Terrasse';
update public.objekte set zustand = 'renovierungsbeduerftig'  where titel = 'Garçonniere nahe U-Bahn';
update public.objekte set zustand = 'modernisiert'            where titel = 'Familienwohnung mit Carport';
update public.objekte set zustand = 'erstbezug'               where titel = 'Dachgeschoß-Maisonette';
