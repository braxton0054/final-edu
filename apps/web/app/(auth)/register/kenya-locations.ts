// Kenya administrative data for cascading location selects.
// Sub-counties: county assemblies dataset (cleaned). Postal codes: county HQ GPO.
// Towns: major towns per county (suggestions — free text still allowed).

export type KenyaCounty = { name: string; postal: string; towns: string[]; subs: string[] };

export const KENYA_COUNTIES: KenyaCounty[] = [
  { name: 'Baringo', postal: '30400', towns: ['Kabarnet', 'Eldama Ravine', 'Marigat', 'Mogotio'], subs: ['Baringo Central', 'Baringo North', 'Baringo South', 'Eldama Ravine', 'Mogotio', 'Tiaty'] },
  { name: 'Bomet', postal: '20400', towns: ['Bomet', 'Sotik', 'Longisa', 'Mulot'], subs: ['Bomet Central', 'Bomet East', 'Chepalungu', 'Konoin', 'Sotik'] },
  { name: 'Bungoma', postal: '50200', towns: ['Bungoma', 'Webuye', 'Kimilili', 'Chwele', 'Sirisia'], subs: ['Bumula', 'Kabuchai', 'Kanduyi', 'Kimilil', 'Mt Elgon', 'Sirisia', 'Tongaren', 'Webuye East', 'Webuye West'] },
  { name: 'Busia', postal: '50400', towns: ['Busia', 'Malaba', 'Funyula', 'Butula', 'Nambale'], subs: ['Budalangi', 'Butula', 'Funyula', 'Nambele', 'Teso North', 'Teso South'] },
  { name: 'Elgeyo-Marakwet', postal: '30700', towns: ['Iten', 'Kapcherop', 'Chebiemit', 'Kapsowar'], subs: ['Keiyo North', 'Keiyo South', 'Marakwet East', 'Marakwet West'] },
  { name: 'Embu', postal: '60100', towns: ['Embu', 'Runyenjes', 'Siakago', 'Ishiara'], subs: ['Manyatta', 'Mbeere North', 'Mbeere South', 'Runyenjes'] },
  { name: 'Garissa', postal: '70100', towns: ['Garissa', 'Dadaab', 'Modogashe', 'Balambala'], subs: ['Balambala', 'Daadab', 'Fafi', 'Garissa Township', 'Hulugho', 'Ijara', 'Lagdera'] },
  { name: 'Homa Bay', postal: '40300', towns: ['Homa Bay', 'Mbita', 'Kendu Bay', 'Oyugis', 'Ndhiwa'], subs: ['Homabay Town', 'Kabondo', 'Karachwonyo', 'Kasipul', 'Mbita', 'Ndhiwa', 'Rangwe', 'Suba'] },
  { name: 'Isiolo', postal: '60300', towns: ['Isiolo', 'Merti', 'Garba Tulla', 'Kinna'], subs: ['Central', 'Garba Tula', 'Kina', 'Merit', 'Oldonyiro', 'Sericho'] },
  { name: 'Kajiado', postal: '01100', towns: ['Kajiado', 'Ngong', 'Kitengela', 'Kiserian', 'Loitokitok', 'Namanga'], subs: ['Isinya', 'Kajiado Central', 'Kajiado North', 'Loitokitok', 'Mashuuru'] },
  { name: 'Kakamega', postal: '50100', towns: ['Kakamega', 'Mumias', 'Butere', 'Lugari', 'Malava'], subs: ['Butere', 'Kakamega Central', 'Kakamega East', 'Kakamega North', 'Kakamega South', 'Khwisero', 'Lugari', 'Lukuyani', 'Lurambi', 'Matete', 'Mumias', 'Mutungu', 'Navakholo'] },
  { name: 'Kericho', postal: '20200', towns: ['Kericho', 'Litein', 'Londiani', 'Kipkelion'], subs: ['Ainamoi', 'Belgut', 'Bureti', 'Kipkelion East', 'Kipkelion West', 'Soin Sigowet'] },
  { name: 'Kiambu', postal: '00900', towns: ['Kiambu', 'Thika', 'Ruiru', 'Kikuyu', 'Limuru', 'Juja', 'Gatundu'], subs: ['Gatundu North', 'Gatundu South', 'Githunguri', 'Juja', 'Kabete', 'Kiambaa', 'Kiambu', 'Kikuyu', 'Lari', 'Limuru', 'Ruiru', 'Thika Town'] },
  { name: 'Kilifi', postal: '80108', towns: ['Kilifi', 'Malindi', 'Watamu', 'Mariakani', 'Mtwapa', 'Kaloleni'], subs: ['Genzw', 'Kaloleni', 'Kilifi North', 'Kilifi South', 'Magarini', 'Malindi', 'Rabai'] },
  { name: 'Kirinyaga', postal: '10304', towns: ['Kerugoya', 'Kagio', 'Sagana', 'Kutus', 'Wanguru'], subs: ['Kirinyaga Central', 'Kirinyaga East', 'Kirinyaga West', 'Mwea East', 'Mwea West'] },
  { name: 'Kisii', postal: '40200', towns: ['Kisii', 'Ogembo', 'Nyamache', 'Suneka', 'Keroka'], subs: ['Bobasi', 'Bomachoge Borabu', 'Bomachoge Chache', 'Bonchari', 'Kitutu Chache North', 'Kitutu Chache South', 'Nyaribari Chache', 'Nyaribari Masaba', 'South Mugirango'] },
  { name: 'Kisumu', postal: '40100', towns: ['Kisumu', 'Ahero', 'Maseno', 'Kombewa', 'Muhoroni'], subs: ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Mohoroni', 'Nyakach', 'Nyando', 'Seme'] },
  { name: 'Kitui', postal: '90200', towns: ['Kitui', 'Mwingi', 'Mutomo', 'Kabati'], subs: ['Ikutha', 'Katulani', 'Kisasi', 'Kitui Central', 'Kitui West', 'Lower Yatta', 'Matiyani', 'Migwani', 'Mutitu', 'Mutomo', 'Muumonikyusu', 'Mwingi Central', 'Mwingi East', 'Nzambani', 'Tseikuru'] },
  { name: 'Kwale', postal: '80403', towns: ['Kwale', 'Ukunda', 'Diani', 'Msambweni', 'Kinango', 'Lunga Lunga'], subs: ['Kinango', 'Lungalunga', 'Msambweni', 'Mutuga'] },
  { name: 'Laikipia', postal: '10400', towns: ['Nanyuki', 'Rumuruti', 'Dol Dol'], subs: ['Laikipia Central', 'Laikipia East', 'Laikipia North', 'Laikipia West', 'Nyahururu'] },
  { name: 'Lamu', postal: '80500', towns: ['Lamu', 'Mpeketoni', 'Witu', 'Faza'], subs: ['Lamu East', 'Lamu West'] },
  { name: 'Machakos', postal: '90100', towns: ['Machakos', 'Athi River', 'Kangundo', 'Tala', 'Matuu'], subs: ['Kathiani', 'Machakos Town', 'Masinga', 'Matungulu', 'Mavoko', 'Mwala', 'Yatta'] },
  { name: 'Makueni', postal: '90300', towns: ['Wote', 'Makindu', 'Kibwezi', 'Sultan Hamud', 'Emali'], subs: ['Kaiti', 'Kibwei West', 'Kibwezi East', 'Kilome', 'Makueni', 'Mbooni'] },
  { name: 'Mandera', postal: '70300', towns: ['Mandera', 'El Wak', 'Rhamu', 'Takaba'], subs: ['Banissa', 'Lafey', 'Mandera East', 'Mandera North', 'Mandera South', 'Mandera West'] },
  { name: 'Marsabit', postal: '60500', towns: ['Marsabit', 'Moyale', 'Laisamis', 'Loiyangalani'], subs: ['Laisamis', 'Moyale', 'North Hor', 'Saku'] },
  { name: 'Meru', postal: '60200', towns: ['Meru', 'Maua', 'Nkubu', 'Timau', 'Mikinduri'], subs: ['Buuri', 'Igembe Central', 'Igembe North', 'Igembe South', 'Imenti Central', 'Imenti North', 'Imenti South', 'Tigania East', 'Tigania West'] },
  { name: 'Migori', postal: '40400', towns: ['Migori', 'Rongo', 'Awendo', 'Isebania', 'Uriri'], subs: ['Awendo', 'Kuria East', 'Kuria West', 'Mabera', 'Ntimaru', 'Rongo', 'Suna East', 'Suna West', 'Uriri'] },
  { name: 'Mombasa', postal: '80100', towns: ['Mombasa', 'Likoni', 'Kisauni', 'Nyali', 'Changamwe', 'Bamburi'], subs: ['Changamwe', 'Jomvu', 'Kisauni', 'Likoni', 'Mvita', 'Nyali'] },
  { name: 'Murang\'a', postal: '10200', towns: ['Murang\'a', 'Kenol', 'Kangema', 'Kigumo', 'Maragua'], subs: ['Gatanga', 'Kahuro', 'Kandara', 'Kangema', 'Kigumo', 'Kiharu', 'Mathioya', 'Murang\'a South'] },
  { name: 'Nairobi', postal: '00100', towns: ['Nairobi CBD', 'Westlands', 'Karen', 'Langata', 'Embakasi', 'Kasarani', 'Dagoretti', 'Kibra', 'Mathare', 'Ruaraka'], subs: ['Dagoretti North', 'Dagoretti South', 'Embakasi Central', 'Embakasi East', 'Embakasi North', 'Embakasi South', 'Embakasi West', 'Kamukunji', 'Kasarani', 'Kibra', 'Lang\'ata', 'Makadara', 'Mathare', 'Roysambu', 'Ruaraka', 'Starehe', 'Westlands'] },
  { name: 'Nakuru', postal: '20100', towns: ['Nakuru', 'Naivasha', 'Gilgil', 'Molo', 'Njoro', 'Rongai'], subs: ['Bahati', 'Gilgil', 'Kuresoi North', 'Kuresoi South', 'Molo', 'Naivasha', 'Nakuru Town East', 'Nakuru Town West', 'Njoro', 'Rongai', 'Subukia'] },
  { name: 'Nandi', postal: '30300', towns: ['Kapsabet', 'Nandi Hills', 'Kobujoi', 'Mosoriot'], subs: ['Aldai', 'Chesumei', 'Emgwen', 'Mosop', 'Namdi Hills', 'Tindiret'] },
  { name: 'Narok', postal: '20500', towns: ['Narok', 'Kilgoris', 'Ololunga', 'Suswa'], subs: ['Narok East', 'Narok North', 'Narok South', 'Narok West', 'Transmara East', 'Transmara West'] },
  { name: 'Nyamira', postal: '40500', towns: ['Nyamira', 'Keroka', 'Nyansiongo', 'Esise'], subs: ['Borabu', 'Manga', 'Masaba North', 'Nyamira North', 'Nyamira South'] },
  { name: 'Nyandarua', postal: '20301', towns: ['Ol Kalou', 'Nyahururu', 'Engineer', 'Njabini', 'Ol Joro Orok'], subs: ['Kinangop', 'Kipipiri', 'Ndaragwa', 'Ol Joro Orok', 'Ol Kalou'] },
  { name: 'Nyeri', postal: '10100', towns: ['Nyeri', 'Karatina', 'Othaya', 'Mukurweini', 'Naro Moru'], subs: ['Kieni East', 'Kieni West', 'Mathira East', 'Mathira West', 'Mkurweni', 'Nyeri Town', 'Othaya', 'Tetu'] },
  { name: 'Samburu', postal: '20600', towns: ['Maralal', 'Baragoi', 'Wamba', 'Archer\'s Post'], subs: ['Samburu East', 'Samburu North', 'Samburu West'] },
  { name: 'Siaya', postal: '40600', towns: ['Siaya', 'Bondo', 'Ugunja', 'Yala', 'Ukwala'], subs: ['Alego Usonga', 'Bondo', 'Gem', 'Rarieda', 'Ugenya', 'Unguja'] },
  { name: 'Taita-Taveta', postal: '80300', towns: ['Voi', 'Taveta', 'Wundanyi', 'Mwatate'], subs: ['Mwatate', 'Taveta', 'Voi', 'Wundanyi'] },
  { name: 'Tana River', postal: '70101', towns: ['Hola', 'Garsen', 'Bura', 'Madogo'], subs: ['Bura', 'Galole', 'Garsen'] },
  { name: 'Tharaka-Nithi', postal: '60215', towns: ['Chuka', 'Kathwana', 'Marimanti', 'Gatunga'], subs: ['Chuka', 'Igambangobe', 'Maara', 'Muthambi', 'Tharak North', 'Tharaka South'] },
  { name: 'Trans-Nzoia', postal: '30200', towns: ['Kitale', 'Kiminini', 'Endebess', 'Kwanza'], subs: ['Cherangany', 'Endebess', 'Kiminini', 'Kwanza', 'Saboti'] },
  { name: 'Turkana', postal: '30500', towns: ['Lodwar', 'Kakuma', 'Lokichoggio', 'Lokitaung'], subs: ['Loima', 'Turkana Central', 'Turkana East', 'Turkana North', 'Turkana South'] },
  { name: 'Uasin Gishu', postal: '30100', towns: ['Eldoret', 'Burnt Forest', 'Turbo', 'Moiben'], subs: ['Ainabkoi', 'Kapseret', 'Kesses', 'Moiben', 'Soy', 'Turbo'] },
  { name: 'Vihiga', postal: '50300', towns: ['Mbale', 'Luanda', 'Hamisi', 'Sabatia'], subs: ['Emuhaya', 'Hamisi', 'Luanda', 'Sabatia', 'Vihiga'] },
  { name: 'Wajir', postal: '70200', towns: ['Wajir', 'Habaswein', 'Griftu', 'Eldas'], subs: ['Eldas', 'Tarbaj', 'Wajir East', 'Wajir North', 'Wajir South', 'Wajir West'] },
  { name: 'West Pokot', postal: '30600', towns: ['Kapenguria', 'Chepareria', 'Ortum', 'Sigor'], subs: ['Central Pokot', 'North Pokot', 'Pokot South', 'West Pokot'] },
];

export function countyByName(name: string): KenyaCounty | undefined {
  return KENYA_COUNTIES.find((c) => c.name === name);
}
