"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvban = exports.withempty = exports.withcomment = exports.withheaderskip3 = exports.simpleskip3 = exports.withheader = exports.withnull = exports.simple = void 0;
const header = 'lon,lat,name,gender,address';
const hp = '-100.000,-100.000,"Harry Potter","Male","52 Privet Drive - Little Whinging"';
const mp = '100.000,100.000,"Mary Poppins","Female","17 Cherry Tree Lane - London"';
const qe = '100.000,-100.000,"Queen Elizabeth II","Female","Buckingham Palace - London"';
const nl = '0,0,,"Unknown","666 Devil\'s Road - Hades"';
exports.simple = `${hp}\n${mp}\n${qe}\n`;
exports.withnull = `${nl}\n${hp}\n${mp}\n${nl}\n${qe}\n${nl}\n`;
exports.withheader = `${header}\n${hp}\n${mp}\n${qe}\n`;
exports.simpleskip3 = `line 1 to skip \nline 2 to skip \nline 3 to skip\n${hp}\n${mp}\n${qe}\n`;
exports.withheaderskip3 = `line 1 to skip \nline 2 to skip \nline 3 to skip\n${header}\n${hp}\n${mp}\n${qe}\n`;
exports.withcomment = `# comment no 1 - \n${hp}\n# comment no 2 -- \n${mp}\n# comment no 3 --- \n# comment no 4 ----\n${qe}\n# comment no 5 -----\n`;
exports.withempty = `\n\n${hp}\n${mp}\n\n${qe}\n\n\n`;
exports.csvban = `id;id_fantoir;numero;rep;nom_voie;code_postal;code_insee;nom_commune;code_insee_ancienne_commune;nom_ancienne_commune;x;y;lon;lat;alias;nom_ld;libelle_acheminement;nom_afnor;source_position;source_nom_voie
59001_nhsgdi_00001;;1;;Chemin Hem Lenglet;59268;59001;Abancourt;;;715617.49;7015153.44;3.218633;50.234188;;;ABANCOURT;CHEMIN HEM LENGLET;arcep;arcep
59001_0030_00001;59001_0030;1;;Rue d'En Haut;59268;59001;Abancourt;;;714959.08;7015284.25;3.209421;50.235379;;;ABANCOURT;RUE D EN HAUT;inconnue;inconnue
59001_0030_00002;59001_0030;2;;Rue d'En Haut;59268;59001;Abancourt;;;714914.52;7015277.45;3.208797;50.235319;;;ABANCOURT;RUE D EN HAUT;inconnue;inconnue
59001_0030_00003;59001_0030;3;;Rue d'En Haut;59268;59001;Abancourt;;;714942.08;7015282.2;3.209183;50.235361;;;ABANCOURT;RUE D EN HAUT;inconnue;inconnue
59001_0030_00005;59001_0030;5;;Rue d'En Haut;59268;59001;Abancourt;;;714920.52;7015278.92;3.208881;50.235332;;;ABANCOURT;RUE D EN HAUT;inconnue;inconnue
59001_0030_00007;59001_0030;7;;Rue d'En Haut;59268;59001;Abancourt;;;714893.68;7015272.39;3.208505;50.235274;;;ABANCOURT;RUE D EN HAUT;inconnue;inconnue
59001_0080_00001;59001_0080;1;;Chemin d'Epinoy;59268;59001;Abancourt;;;713368.71;7015115.21;3.187151;50.233897;;;ABANCOURT;CHEMIN D EPINOY;inconnue;inconnue
59001_0080_00166;59001_0080;166;;Chemin d'Epinoy;59268;59001;Abancourt;;;713368.71;7015115.21;3.187151;50.233897;;;ABANCOURT;CHEMIN D EPINOY;inconnue;inconnue
59001_0200_00001;59001_0200;1;;Grand Place;59268;59001;Abancourt;;;715201.19;7015192.36;3.212807;50.234548;;;ABANCOURT;GRAND PLACE;inconnue;inconnue
59001_0200_00002;59001_0200;2;;Grand Place;59268;59001;Abancourt;;;715147.59;7015203.35;3.212057;50.234648;;;ABANCOURT;GRAND PLACE;inconnue;inconnue
59001_0200_00003;59001_0200;3;;Grand Place;59268;59001;Abancourt;;;715220.63;7015163.12;3.213078;50.234285;;;ABANCOURT;GRAND PLACE;inconnue;inconnue
59001_0200_00004;59001_0200;4;;Grand Place;59268;59001;Abancourt;;;715180.49;7015160.45;3.212516;50.234262;;;ABANCOURT;GRAND PLACE;inconnue;inconnue
59001_0200_00006;59001_0200;6;;Grand Place;59268;59001;Abancourt;;;715207.27;7015163.64;3.212891;50.23429;;;ABANCOURT;GRAND PLACE;inconnue;inconnue
59001_0174_00001;59001_0174;1;;Rue du Petit Bois;59268;59001;Abancourt;;;714912.77;7014753.24;3.208753;50.230612;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00002;59001_0174;2;;Rue du Petit Bois;59268;59001;Abancourt;;;714900.11;7014758.45;3.208576;50.230659;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00003;59001_0174;3;;Rue du Petit Bois;59268;59001;Abancourt;;;714925.68;7014732.01;3.208933;50.230421;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00004;59001_0174;4;;Rue du Petit Bois;59268;59001;Abancourt;;;714914.2;7014723.85;3.208772;50.230348;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00005;59001_0174;5;;Rue du Petit Bois;59268;59001;Abancourt;;;714947.62;7014729.17;3.20924;50.230395;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00006;59001_0174;6;;Rue du Petit Bois;59268;59001;Abancourt;;;714900.58;7014714.35;3.208581;50.230263;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00007;59001_0174;7;;Rue du Petit Bois;59268;59001;Abancourt;;;714954.78;7014724.4;3.20934;50.230352;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00008;59001_0174;8;;Rue du Petit Bois;59268;59001;Abancourt;;;714900.51;7014688.95;3.208579;50.230035;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00009;59001_0174;9;;Rue du Petit Bois;59268;59001;Abancourt;;;714948.43;7014721.04;3.209251;50.230322;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00010;59001_0174;10;;Rue du Petit Bois;59268;59001;Abancourt;;;714912.17;7014708.7;3.208743;50.230212;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0174_00011;59001_0174;11;;Rue du Petit Bois;59268;59001;Abancourt;;;714938.49;7014696.96;3.209111;50.230106;;;ABANCOURT;RUE DU PETIT BOIS;inconnue;inconnue
59001_0220_00002;59001_0220;2;;Rue du Pont;59268;59001;Abancourt;;;715312.33;7015354.25;3.214369;50.235999;;;ABANCOURT;RUE DU PONT;inconnue;inconnue
59001_0180_00001;59001_0180;1;;Rue de la Place;59268;59001;Abancourt;;;715245.28;7015212.63;3.213425;50.234729;;;ABANCOURT;RUE DE LA PLACE;inconnue;inconnue
59001_0180_00003;59001_0180;3;;Rue de la Place;59268;59001;Abancourt;;;715237.31;7015201.14;3.213313;50.234626;;;ABANCOURT;RUE DE LA PLACE;inconnue;inconnue
59001_0180_00005;59001_0180;5;;Rue de la Place;59268;59001;Abancourt;;;715227.21;7015186.97;3.213171;50.234499;;;ABANCOURT;RUE DE LA PLACE;inconnue;inconnue
59001_0180_00007;59001_0180;7;;Rue de la Place;59268;59001;Abancourt;;;715221.09;7015178.38;3.213085;50.234422;;;ABANCOURT;RUE DE LA PLACE;inconnue;inconnue
59001_0020_00001;59001_0020;1;;Rue d'En Bas;59268;59001;Abancourt;;;715130.33;7015298.08;3.211819;50.235499;;;ABANCOURT;RUE D EN BAS;inconnue;inconnue
59001_0020_00003;59001_0020;3;;Rue d'En Bas;59268;59001;Abancourt;;;715150.21;7015318.4;3.212098;50.235681;;;ABANCOURT;RUE D EN BAS;inconnue;inconnue
59001_0020_00005;59001_0020;5;;Rue d'En Bas;59268;59001;Abancourt;;;715165.13;7015319.89;3.212307;50.235694;;;ABANCOURT;RUE D EN BAS;inconnue;inconnue
59001_0020_00009;59001_0020;9;;Rue d'En Bas;59268;59001;Abancourt;;;715213.71;7015344.29;3.212988;50.235912;;;ABANCOURT;RUE D EN BAS;inconnue;inconnue
59001_0020_00011;59001_0020;11;;Rue d'En Bas;59268;59001;Abancourt;;;715210.01;7015364.66;3.212937;50.236095;;;ABANCOURT;RUE D EN BAS;inconnue;inconnue
59001_0020_00013;59001_0020;13;;Rue d'En Bas;59268;59001;Abancourt;;;715193.61;7015302.92;3.212705;50.235541;;;ABANCOURT;RUE D EN BAS;inconnue;inconnue
59001_0100_00001;59001_0100;1;;Rue des Fresnois;59268;59001;Abancourt;;;715443.38;7015126.75;3.216195;50.233953;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00002;59001_0100;2;;Rue des Fresnois;59268;59001;Abancourt;;;715468.71;7015138.18;3.21655;50.234055;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00003;59001_0100;3;;Rue des Fresnois;59268;59001;Abancourt;;;715458.28;7015137.93;3.216404;50.234053;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00004;59001_0100;4;;Rue des Fresnois;59268;59001;Abancourt;;;715483.91;7015146.02;3.216763;50.234125;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00005;59001_0100;5;;Rue des Fresnois;59268;59001;Abancourt;;;715482.03;7015151.8;3.216737;50.234177;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00008;59001_0100;8;;Rue des Fresnois;59268;59001;Abancourt;;;715508.8;7015159.11;3.217112;50.234242;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00009;59001_0100;9;;Rue des Fresnois;59268;59001;Abancourt;;;715454.21;7015215.98;3.21635;50.234754;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00010;59001_0100;10;;Rue des Fresnois;59268;59001;Abancourt;;;715531.77;7015171.65;3.217434;50.234354;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00011;59001_0100;11;;Rue des Fresnois;59268;59001;Abancourt;;;715435.23;7015236.54;3.216085;50.234939;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00012;59001_0100;12;;Rue des Fresnois;59268;59001;Abancourt;;;715498.89;7015177.69;3.216974;50.234409;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00013;59001_0100;13;;Rue des Fresnois;59268;59001;Abancourt;;;715397.4;7015275.74;3.215557;50.235292;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00015;59001_0100;15;;Rue des Fresnois;59268;59001;Abancourt;;;715380.79;7015292.74;3.215325;50.235445;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00017;59001_0100;17;;Rue des Fresnois;59268;59001;Abancourt;;;715357.22;7015317.95;3.214996;50.235672;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00018;59001_0100;18;;Rue des Fresnois;59268;59001;Abancourt;;;715403.47;7015278.99;3.215642;50.235321;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
59001_0100_00020;59001_0100;20;;Rue des Fresnois;59268;59001;Abancourt;;;715386.92;7015296.43;3.215411;50.235478;;;ABANCOURT;RUE DES FRESNOIS;inconnue;inconnue
`;
//# sourceMappingURL=csvdata.js.map