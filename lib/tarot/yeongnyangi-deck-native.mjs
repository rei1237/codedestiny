// Card naming is shared by artwork, accessibility text and the reading validator.
export const nativeDeckNames={
 vi:['Kẻ Khờ','Nhà Ảo Thuật','Nữ Tư Tế','Hoàng Hậu','Hoàng Đế','Giáo Hoàng','Đôi Tình Nhân','Chiến Xa','Sức Mạnh','Ẩn Sĩ','Bánh Xe Số Phận','Công Lý','Người Treo Ngược','Cái Chết','Tiết Chế','Ác Quỷ','Tòa Tháp','Ngôi Sao','Mặt Trăng','Mặt Trời','Phán Xét','Thế Giới'],
 hi:['मूर्ख','जादूगर','महायाजिका','महारानी','सम्राट','धर्मगुरु','प्रेमी','रथ','शक्ति','सन्यासी','भाग्य का चक्र','न्याय','लटका हुआ व्यक्ति','मृत्यु','संयम','शैतान','मीनार','तारा','चंद्रमा','सूर्य','निर्णय','विश्व'],
 es:['El Loco','El Mago','La Sacerdotisa','La Emperatriz','El Emperador','El Hierofante','Los Enamorados','El Carro','La Fuerza','El Ermitaño','La Rueda de la Fortuna','La Justicia','El Colgado','La Muerte','La Templanza','El Diablo','La Torre','La Estrella','La Luna','El Sol','El Juicio','El Mundo'],
 fr:['Le Mat','Le Bateleur','La Papesse','L’Impératrice','L’Empereur','Le Pape','L’Amoureux','Le Chariot','La Force','L’Ermite','La Roue de Fortune','La Justice','Le Pendu','La Mort','Tempérance','Le Diable','La Maison Dieu','L’Étoile','La Lune','Le Soleil','Le Jugement','Le Monde'],
 de:['Der Narr','Der Magier','Die Hohepriesterin','Die Herrscherin','Der Herrscher','Der Hierophant','Die Liebenden','Der Wagen','Die Kraft','Der Eremit','Das Rad des Schicksals','Die Gerechtigkeit','Der Gehängte','Der Tod','Die Mäßigkeit','Der Teufel','Der Turm','Der Stern','Der Mond','Die Sonne','Das Gericht','Die Welt'],
 nl:['De Dwaas','De Magiër','De Hogepriesteres','De Keizerin','De Keizer','De Hiërofant','De Geliefden','De Zegewagen','De Kracht','De Kluizenaar','Het Rad van Fortuin','De Gerechtigheid','De Gehangene','De Dood','De Gematigdheid','De Duivel','De Toren','De Ster','De Maan','De Zon','Het Oordeel','De Wereld'],
 ms:['Si Pengembara','Ahli Silap Mata','Pendeta Wanita','Maharani','Maharaja','Hierofant','Pasangan Kekasih','Kereta Kuda','Kekuatan','Pertapa','Roda Nasib','Keadilan','Orang Tergantung','Kematian','Kesederhanaan','Syaitan','Menara','Bintang','Bulan','Matahari','Penghakiman','Dunia'],
};
const minorData={
 vi:{suits:['Gậy','Cốc','Kiếm','Tiền'],ranks:['Át','2','3','4','5','6','7','8','9','10','Tiểu Đồng','Kỵ Sĩ','Hoàng Hậu','Vua']},
 hi:{suits:['छड़ियों','प्यालों','तलवारों','सिक्कों'],ranks:['इक्का','2','3','4','5','6','7','8','9','10','अनुचर','घुड़सवार','रानी','राजा']},
 es:{suits:['Bastos','Copas','Espadas','Oros'],ranks:['As','Dos','Tres','Cuatro','Cinco','Seis','Siete','Ocho','Nueve','Diez','Sota','Caballero','Reina','Rey']},
 fr:{suits:['Bâtons','Coupes','Épées','Deniers'],ranks:['As','Deux','Trois','Quatre','Cinq','Six','Sept','Huit','Neuf','Dix','Valet','Cavalier','Reine','Roi']},
 de:{suits:['Stäbe','Kelche','Schwerter','Münzen'],ranks:['Ass','Zwei','Drei','Vier','Fünf','Sechs','Sieben','Acht','Neun','Zehn','Bube','Ritter','Königin','König']},
 nl:{suits:['Staven','Bekers','Zwaarden','Pentakels'],ranks:['Aas','Twee','Drie','Vier','Vijf','Zes','Zeven','Acht','Negen','Tien','Schildknaap','Ridder','Koningin','Koning']},
 ms:{suits:['Tongkat','Cawan','Pedang','Pentakel'],ranks:['As','Dua','Tiga','Empat','Lima','Enam','Tujuh','Lapan','Sembilan','Sepuluh','Pembawa','Kesatria','Ratu','Raja']},
};
export const nativeMinorNames=Object.fromEntries(Object.entries(minorData).map(([locale,data])=>[locale,{
 suits:Object.fromEntries(['W','C','S','P'].map((s,i)=>[s,data.suits[i]])),ranks:data.ranks,
 name:(suit,rank)=>locale==='hi'?`${suit} का ${rank}`:locale==='fr'?`${rank} ${suit.startsWith('É')?'d’':'de '}${suit}`:locale==='es'?`${rank} de ${suit}`:locale==='de'?`${rank} der ${suit}`:locale==='nl'?`${rank} van ${suit}`:`${rank} ${suit}`,
}]));
const chrome={vi:['Mặt sau lá bài','Khung vàng'],hi:['कार्ड का पिछला भाग','सुनहरा फ़्रेम'],es:['Reverso de la carta','Marco dorado'],fr:['Dos de carte','Cadre doré'],de:['Kartenrückseite','Goldrahmen'],nl:['Kaartachterkant','Gouden kader'],ms:['Belakang kad','Bingkai emas']};
export const nativeDeckLabels=Object.fromEntries(Object.entries(chrome).map(([locale,[back,frame]])=>[locale,{alt:name=>`Yeongnyangi · ${name}`,back:`Yeongnyangi · ${back}`,frame:`Yeongnyangi · ${frame}`} ]));
