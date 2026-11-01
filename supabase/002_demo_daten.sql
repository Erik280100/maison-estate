-- Optional: Beispielobjekte zum Ausprobieren (später wieder löschen: delete from public.objekte;)
insert into public.objekte (titel, status, objekttyp, strasse, plz, ort, bezirk, preis, wohnflaeche, zimmer, freiflaechen, parken, beschreibung) values
('Helle Altbauwohnung mit Balkon', 'verfuegbar', 'sonstige',    'Musterstraße 1', '1020', 'Wien', 'Leopoldstadt', 389000, 74, 3, '{balkon}',              '{}',                    'Beispielobjekt'),
('Gartenwohnung im Erdgeschoß',    'verfuegbar', 'erdgeschoss', 'Beispielgasse 5','8010', 'Graz', 'Jakomini',     329000, 98, 4, '{garten,terrasse}',     '{freistellplatz}',      'Beispielobjekt'),
('Dachgeschoß mit Terrasse',       'reserviert', 'dachgeschoss','Probeweg 12',    '1090', 'Wien', 'Alsergrund',   529000, 88, 3, '{terrasse}',            '{garage}',              'Beispielobjekt'),
('Garçonniere nahe U-Bahn',        'verfuegbar', 'garconniere', 'Teststraße 7',   '1150', 'Wien', 'Rudolfsheim',  149000, 28, 1, '{}',                    '{}',                    'Beispielobjekt'),
('Familienwohnung mit Carport',    'verfuegbar', 'erdgeschoss', 'Demoplatz 3',    '4040', 'Linz', 'Urfahr',       289000, 92, 4, '{garten}',              '{carport}',             'Beispielobjekt'),
('Dachgeschoß-Maisonette',         'verfuegbar', 'dachgeschoss','Hauptstraße 40', '5020', 'Salzburg', 'Altstadt',  610000, 105,4, '{terrasse,balkon}',     '{garage,freistellplatz}','Beispielobjekt');
