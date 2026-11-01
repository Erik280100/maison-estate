-- Optional: Ausstattung für die Beispielobjekte aus 002_demo_daten.sql setzen (nur zum Ausprobieren).
update public.objekte set ausstattung = '{lift,keller,badewanne}'                          where titel = 'Helle Altbauwohnung mit Balkon';
update public.objekte set ausstattung = '{rollstuhlgerecht,keller,regendusche}'            where titel = 'Gartenwohnung im Erdgeschoß';
update public.objekte set ausstattung = '{lift,klimaanlage,regendusche,badewanne}'         where titel = 'Dachgeschoß mit Terrasse';
update public.objekte set ausstattung = '{moebliert,lift}'                                 where titel = 'Garçonniere nahe U-Bahn';
update public.objekte set ausstattung = '{keller,badewanne}'                               where titel = 'Familienwohnung mit Carport';
update public.objekte set ausstattung = '{lift,klimaanlage,rollstuhlgerecht,regendusche,keller}' where titel = 'Dachgeschoß-Maisonette';
