// Turkish long-tail guides served at /rehber/:slug (rendered by server.js).
// Each guide: real, useful content first; the product CTA is the natural next step.
// Body/answer strings are trusted HTML authored here (no user input).

module.exports = [
  {
    slug: 'whatsapp-sohbeti-disa-aktarma',
    title: 'WhatsApp Sohbeti Nasıl Dışa Aktarılır? (iPhone ve Android, 2026)',
    description: 'WhatsApp sohbetini .txt dosyası olarak dışa aktarmanın adım adım yolu: iPhone, Android, medya olmadan, zip dosyası ve sık yapılan hatalar.',
    h1: 'WhatsApp sohbeti nasıl dışa aktarılır?',
    intro: 'WhatsApp, herhangi bir sohbeti metin dosyası olarak dışarı almanı sağlar. Bu dosya sohbetini yedeklemek, analiz etmek ya da bir yere taşımak için kullanılır. İşlem bir dakika sürer; aşağıda iPhone ve Android için adımları, sık karşılaşılan sorunları bulacaksın.',
    sections: [
      { h: 'iPhone\'da WhatsApp sohbeti dışa aktarma', body: '<ol><li>WhatsApp\'ta dışa aktarmak istediğin sohbeti aç.</li><li>Ekranın üstündeki kişi ya da grup adına dokun.</li><li>Aşağı kaydır ve <b>Sohbeti Dışa Aktar</b>\'a dokun.</li><li><b>Medya Olmadan</b>\'ı seç. Sadece metin gerekiyorsa bu hem hızlı hem küçük olur.</li><li>Paylaşım ekranında <b>Dosyalar\'a Kaydet</b>\'i seç ya da dosyayı kendine e-posta veya mesajla gönder.</li></ol><p>iPhone dosyayı genelde <b>.zip</b> olarak verir. İçinde <i>_chat.txt</i> adında bir metin dosyası bulunur; çoğu araç zip dosyasını doğrudan açabilir.</p>' },
      { h: 'Android\'de WhatsApp sohbeti dışa aktarma', body: '<ol><li>Sohbeti aç ve sağ üstteki <b>⋮</b> (üç nokta) menüsüne dokun.</li><li><b>Diğer</b> → <b>Sohbeti dışa aktar</b>\'ı seç.</li><li><b>Medya olmadan</b>\'ı seç.</li><li>Dosyayı Google Drive\'a, e-postana ya da cihazına kaydet.</li></ol><p>Android genellikle doğrudan bir <b>.txt</b> dosyası üretir.</p>' },
      { h: 'Sık karşılaşılan sorunlar', body: '<ul><li><b>"Sohbeti dışa aktar" seçeneği görünmüyor:</b> Bazı ülkelerde ya da iş hesaplarında kapalı olabilir. WhatsApp\'ı güncellemeyi dene.</li><li><b>Dosya çok büyük:</b> "Medya olmadan" seçtiğinden emin ol. Fotoğraf ve videolar dosyayı yüzlerce MB yapabilir.</li><li><b>Mesajlar eksik görünüyor:</b> WhatsApp, medya olmadan dışa aktarırken son 40.000 mesaja kadar alır. Çok eski bir sohbetin en başı dosyada olmayabilir.</li><li><b>Tarihler garip görünüyor:</b> Dosyadaki tarih biçimi telefonunun dil ve bölge ayarına göre değişir; iyi araçlar bütün biçimleri okur.</li></ul>' },
      { h: 'Dışa aktardığın sohbetle ne yapabilirsin?', body: '<p>Bu dosyayla sohbetinizin sayılarını görebilirsin: kim daha çok yazıyor, sohbeti kim başlatıyor, kim daha hızlı cevap veriyor, en uzun sessizliğiniz ne zamandı. Bunu dosyayı hiçbir yere yüklemeden, tarayıcında yapan ücretsiz bir araç kullanmak gizliliğin için en güvenli yoldur.</p>' },
    ],
    cta: { text: 'Sohbetini ücretsiz analiz et →', href: '/whatsapp-sohbet-analizi?ref=rehber-disa-aktarma', note: 'Kayıt yok. Sohbetin telefonundan çıkmaz.' },
    faq: [
      { q: 'Dışa aktarılan WhatsApp sohbeti karşı tarafa bildirilir mi?', a: 'Hayır. Sohbeti dışa aktardığında karşı tarafa herhangi bir bildirim gitmez.' },
      { q: 'Grup sohbeti dışa aktarılabilir mi?', a: 'Evet, adımlar aynı. Grup adına dokunup "Sohbeti dışa aktar"ı seçmen yeterli.' },
      { q: 'Medyalı mı medyasız mı seçmeliyim?', a: 'Metin analizi ya da yedek için "Medya olmadan" yeterli ve çok daha küçük bir dosya üretir.' },
    ],
  },
  {
    slug: 'chatgpt-whatsapp-sohbet-analizi',
    title: 'ChatGPT ile WhatsApp Sohbet Analizi: Nasıl Yapılır, Nelere Dikkat Etmeli?',
    description: 'WhatsApp sohbetini ChatGPT\'ye yükleyip analiz ettirmek mümkün mü? Adımlar, gizlilik riskleri ve sohbetini hiçbir yere yüklemeden analiz etmenin yolu.',
    h1: 'ChatGPT ile WhatsApp sohbet analizi',
    intro: 'Son zamanlarda pek çok kişi WhatsApp sohbetini ChatGPT\'ye yükleyip "kim daha ilgili", "bu ilişki nereye gidiyor" gibi sorular soruyor. Bu yapılabilir, ama bilmen gereken birkaç önemli nokta var: gizlilik, doğruluk ve sayılarla yorumların farkı.',
    sections: [
      { h: 'Adım adım: ChatGPT\'ye sohbet yüklemek', body: '<ol><li>Sohbeti WhatsApp\'tan <a href="/rehber/whatsapp-sohbeti-disa-aktarma">"Medya olmadan" dışa aktar</a>.</li><li>ChatGPT\'de dosya ekleme düğmesiyle .txt ya da .zip dosyasını yükle.</li><li>Ne öğrenmek istediğini açıkça yaz: "Sohbeti kim daha sık başlatıyor? Tartışmalardan sonra ilk kim yazıyor?" gibi.</li></ol>' },
      { h: 'Dikkat: sohbetin bütünüyle bir sunucuya gider', body: '<p>Bir sohbeti bir yapay zekâ sohbet robotuna yüklediğinde, sadece senin değil karşı tarafın mesajları da o şirketin sunucularına gider. Sohbetlerde sağlık, aile meseleleri, adresler gibi hassas bilgiler olabilir. Hangi verinin nerede, ne kadar süre saklandığını hizmetin gizlilik ayarlarından kontrol etmeden yükleme yapmamanı öneririz.</p>' },
      { h: 'Yapay zekâ yorumu ile sayılar aynı şey değil', body: '<p>"Kim daha çok yazıyor" ya da "kim daha hızlı cevap veriyor" gibi sorular <b>sayılarla</b> kesin olarak cevaplanabilir; bunun için yapay zekâya gerek yoktur. Uzun sohbetlerde yapay zekâ modelleri bazen sayıları tahmin eder ve yanılır. "Bu kişi beni seviyor mu" gibi yorumlar ise kesin değildir; bunlara bir fikir olarak bak, bir hüküm olarak değil.</p>' },
      { h: 'Daha güvenli yol: önce sayılar, cihazından çıkmadan', body: '<p>Sohbetinin sayılarını, dosyayı hiçbir sunucuya yüklemeden tarayıcında hesaplayan ücretsiz bir araç kullanabilirsin. Mesaj payı, sohbeti kimin başlattığı, cevap süreleri, gece mesajları, rekor gün ve en uzun sessizlik gibi sonuçları saniyeler içinde, paylaşılabilir kartlar olarak görürsün.</p><p>Daha derine inmek, yani o kişinin nasıl konuştuğunu öğrenen bir yapay zekâ ikiziyle zor bir konuşmayı prova etmek istersen, bunu ancak sen onay verdiğinde yapan bir adıma geçersin.</p>' },
    ],
    cta: { text: 'Sohbetini cihazından çıkmadan analiz et →', href: '/whatsapp-sohbet-analizi?ref=rehber-chatgpt', note: 'Ücretsiz, kayıt yok.' },
    faq: [
      { q: 'ChatGPT WhatsApp sohbetini okuyabilir mi?', a: 'Evet, dışa aktarılmış .txt ya da .zip dosyasını yükleyerek okutabilirsin. Dosyanın tamamı hizmetin sunucularına gider.' },
      { q: 'Sohbetimi yüklemeden analiz edebilir miyim?', a: 'Evet. Sayıya dayalı sonuçları (kim daha çok yazıyor, cevap süreleri gibi) tarayıcıda, dosyayı yüklemeden hesaplayan araçlar var.' },
    ],
  },
  {
    slug: 'zam-isteme-konusmasi',
    title: 'Zam İsteme Konuşması: Ne Demeli, Nasıl Prova Edilir? (Örnek Cümlelerle)',
    description: 'Patronundan zam isterken ne söylemeli? Hazırlık, açılış cümleleri, itirazlara cevaplar ve konuşmayı önceden prova etmenin yolu.',
    h1: 'Zam isteme konuşması nasıl yapılır?',
    intro: 'Zam istemek çoğu kişi için yılın en gergin konuşmalarından biridir. İyi haber: bu konuşmanın büyük kısmı önceden hazırlanabilir. Aşağıda hazırlık adımları, kullanabileceğin cümleler ve en sık gelen itirazlara verebileceğin cevaplar var.',
    sections: [
      { h: '1. Konuşmadan önce: rakamların ve kanıtların', body: '<ul><li><b>Katkılarını yaz:</b> Son bir yılda üstlendiğin işleri, çözdüğün sorunları, kazandırdığın ya da tasarruf ettirdiğin şeyleri somut örneklerle not et.</li><li><b>Piyasayı öğren:</b> Aynı rol ve deneyim için piyasa aralığını araştır.</li><li><b>Bir rakam belirle:</b> Ne istediğini net söyle. "Biraz artış" belirsizdir; belirli bir oran ya da tutar konuşmayı ilerletir.</li><li><b>Zamanlamayı seç:</b> Bütçe dönemleri, başarılı bir projenin hemen sonrası ve performans görüşmeleri iyi anlardır.</li></ul>' },
      { h: '2. Açılış: kısa, sakin, net', body: '<p>Örnek bir açılış:</p><blockquote>"Son bir yıldaki rolümü ve katkılarımı konuşmak istiyorum. Üstlendiğim sorumluluklar arttı ve maaşımın bunu yansıtmasını istiyorum. Bunun için yüzde ___ bir artış öneriyorum."</blockquote><p>Özür dileyerek başlamamaya çalış ("Biliyorum zor bir dönem ama…"). Bu, pazarlığı daha başlamadan zayıflatır.</p>' },
      { h: '3. Sık gelen itirazlar ve cevapları', body: '<ul><li><b>"Şu an bütçe yok."</b> → "Anlıyorum. Bütçenin açılacağı dönemde bunu tekrar konuşabilir miyiz? O zamana kadar hedeflerimi birlikte netleştirelim."</li><li><b>"Bunu yıl sonunda konuşalım."</b> → "Olur. Yıl sonunda hangi sonuçları görmek istediğinizi şimdi konuşursak, o görüşmeye hazırlıklı gelebilirim."</li><li><b>"Herkesin maaşı aynı oranda artıyor."</b> → "Genel artışın ötesinde, üstlendiğim ek sorumlulukları konuşmak istiyorum."</li></ul>' },
      { h: '4. Prova etmek gerçekten işe yarıyor', body: '<p>Stanford\'da yapılan bir çalışmada, zor konuşmaları önceden simüle ederek çalışan katılımcıların gerilimi tırmandıran tepkileri belirgin şekilde azaldı. En iyi prova, gerçek kişinin nasıl tepki vereceğine en yakın olanıdır: patronunun genelde nasıl konuştuğunu, hangi bahaneleri kullandığını bilen biriyle.</p><p>Patronunu üç cevapla anlatıp onun yapay zekâ ikiziyle bu konuşmayı önceden yapabilirsin. "Zorlaştır" modunda ikiz kolay ikna olmaz; asıl konuşmada ne duyacağını önceden duymuş olursun.</p>' },
    ],
    cta: { text: 'Patronunla bu konuşmayı prova et →', href: '/app.html?import=1&mode=describe&rel=patronum&ref=rehber-zam', note: 'Kayıt gerekmez. Üç cevap yeter.' },
    faq: [
      { q: 'Zam isterken yüzde kaç istemeliyim?', a: 'Rolünün piyasa aralığına ve son dönemdeki katkılarına bakarak belirli bir rakam söyle. Belirsiz bir istek ("biraz artış") konuşmayı zayıflatır.' },
      { q: 'Zam isteme konuşması e-postayla mı yüz yüze mi yapılmalı?', a: 'Mümkünse yüz yüze ya da görüntülü görüşmeyle yap; ardından konuşulanları kısa bir e-postayla özetlemek iyi bir adımdır.' },
    ],
  },
  {
    slug: 'babana-zor-bir-sey-soylemek',
    title: 'Babana Zor Bir Şeyi Nasıl Söylersin? (Sevgili, Evlilik, Borç, İş Değişikliği)',
    description: 'Babana sevgilin olduğunu, evleneceğini, borcun olduğunu ya da işini değiştireceğini nasıl söylersin? Zamanlama, ilk cümle ve konuşmayı önceden denemenin yolu.',
    h1: 'Babana zor bir şeyi nasıl söylersin?',
    intro: '"Babama nasıl söylerim?" sorusu çoğu zaman aylarca ertelenen bir konuşmanın başlangıcıdır: bir sevgili, bir evlilik kararı, bir borç, bırakılan bir okul ya da yeni bir iş. Her ailenin dinamiği farklı ama işe yarayan bazı ortak adımlar var.',
    sections: [
      { h: '1. Zamanı ve yeri seç', body: '<p>Bayram sofrası, kalabalık bir akşam ya da bir tartışmanın ortası kötü zamanlardır. Sakin, ikinizin de acele etmediği, baş başa bir an seç. Telefonla söyleyeceksen bunu da önceden belirt: "Baba, seninle konuşmak istediğim bir şey var, müsait olduğunda arayayım mı?"</p>' },
      { h: '2. İlk cümleyi önceden hazırla', body: '<p>Konuşmanın en zor kısmı ilk cümledir. Onu ezberlemek, gerisinin kendiliğinden gelmesini kolaylaştırır.</p><ul><li><b>Sevgili:</b> "Baba, bir süredir biriyle görüşüyorum ve bunu senden saklamak istemiyorum."</li><li><b>Evlilik:</b> "Hayatımla ilgili önemli bir karar verdim ve ilk senin bilmeni istiyorum."</li><li><b>Borç:</b> "Bir hata yaptım, sana dürüstçe anlatmak ve nasıl düzelteceğimi konuşmak istiyorum."</li><li><b>İş/okul:</b> "Uzun süredir düşündüğüm bir kararı sana anlatmak istiyorum; nedenlerini de dinlemeni isterim."</li></ul>' },
      { h: '3. İlk tepkiye hazırlıklı ol', body: '<p>İlk tepki çoğu zaman son tepki değildir. Öfke, sessizlik ya da hayal kırıklığı gelebilir. Savunmaya geçmek yerine "Bunu duymanın zor olduğunu biliyorum, düşünmek için zaman isteyebilirsin" demek konuşmayı açık tutar.</p>' },
      { h: '4. Önce prova et', body: '<p>Babanın nasıl konuştuğunu en iyi sen bilirsin: sana nasıl hitap ettiğini, hangi cümleleri kurduğunu, neye nasıl tepki verdiğini. Bunları üç cevapla anlatıp onun yapay zekâ ikiziyle konuşmayı önceden yapabilirsin. İlk cümleyi söylemek, gerçek anda söylemeyi kolaylaştırır.</p>' },
    ],
    cta: { text: 'Babanla bu konuşmayı önce dene →', href: '/app.html?import=1&mode=describe&rel=babam&ref=rehber-baba', note: 'Kayıt gerekmez. Bu bir yapay zekâ simülasyonudur; baban değil.' },
    faq: [
      { q: 'Babama sevgilim olduğunu nasıl söylerim?', a: 'Sakin, baş başa bir an seç ve kısa, net bir ilk cümleyle başla. Detayları ve soruları sonra konuşabilirsiniz; ilk amaç saklamayı bırakmak.' },
      { q: 'Önce annene mi söylemeli?', a: 'Aile dinamiğine bağlı. Annen arabulucu olabilecekse önce onunla konuşmak işe yarayabilir; ama babanın bunu başkasından duyması güveni zedeleyebilir.' },
    ],
  },
  {
    slug: 'kaybettigin-birine-mektup',
    title: 'Kaybettiğin Birine Mektup Yazmak: Neden İyi Gelir, Nasıl Başlanır?',
    description: 'Vefat eden annene, babana ya da yakınına mektup yazmak yasın içinde neden iyi gelir? Nasıl başlanır, neler yazılabilir ve yazdıktan sonra ne yapılabilir?',
    h1: 'Kaybettiğin birine mektup yazmak',
    intro: 'Kaybettiğimiz birine söyleyemediklerimiz içimizde kalır: bir teşekkür, bir özür, bir haber, bir veda. Yas üzerine çalışan pek çok uzman, bunları yazıya dökmenin içteki yükü hafiflettiğini söyler. Bu yazı, böyle bir mektuba nasıl başlayabileceğine dair birkaç öneri içeriyor.',
    sections: [
      { h: 'Neden iyi gelir?', body: '<p>Yazmak, dağınık duyguları sıraya koyar. Söyleyemediklerini kelimelere dökmek, onları taşımayı kolaylaştırır. Mektubun bir okuyucusu olmak zorunda değil; yazmak başlı başına bir ifade ve bir hatırlama biçimidir.</p>' },
      { h: 'Nasıl başlanır?', body: '<ul><li><b>Ona hitap ettiğin gibi başla:</b> "Canım annem", "Babacığım", "Dedeciğim"…</li><li><b>Bir anıyla aç:</b> Onu en çok hatırlatan bir gün, bir koku, bir cümle.</li><li><b>Söyleyemediğini yaz:</b> Teşekkür etmek istediğin, özür dilemek istediğin ya da ona anlatmak istediğin bir haber.</li><li><b>Hayatından haber ver:</b> O gittikten sonra neler değişti? Ona neyi anlatmak isterdin?</li><li><b>Kendi kelimelerinle bitir:</b> Bir veda, bir söz ya da sadece "seni özlüyorum".</li></ul>' },
      { h: 'Yazdıktan sonra', body: '<p>Bazıları mektubu saklar, bazıları yüksek sesle okur, bazıları bir yakınıyla paylaşır. Yanlış bir yol yok. Yazarken zorlanırsan ara ver; bu bir görev değil.</p>' },
      { h: 'Sözlerine bir karşılık duymak istersen', body: '<p>Onu nasıl konuştuğuyla anlatıp mektubunu yazabilir ve onun üslubuyla, senin yazdıklarına cevap veren bir karşılık okuyabilirsin. Bunun bir yapay zekâ simülasyonu olduğunu, onun kendisi olmadığını bilerek: sadece senin anlattıklarından doğan, söyleyemediklerini söylemen için bir alan.</p><p>Yas bazen ağır gelir. Eğer kendini çok yalnız ya da çaresiz hissediyorsan, güvendiğin biriyle ya da bir ruh sağlığı uzmanıyla konuşmanı öneririz. Acil bir durumda 112\'yi arayabilirsin.</p>' },
    ],
    cta: { text: 'Ona bir mektup yaz →', href: '/app.html?import=1&mode=describe&status=unreachable&ref=rehber-mektup', note: 'Kayıt gerekmez. Bir yapay zekâ simülasyonudur, o değil.' },
    faq: [
      { q: 'Vefat eden birine mektup yazmak normal mi?', a: 'Evet. Pek çok kişi yasla baş ederken kaybettiği kişiye mektup yazar; söyleyemediklerini ifade etmenin yaygın bir yoludur.' },
      { q: 'Mektupta neler yazılabilir?', a: 'Bir anı, bir teşekkür, bir özür, ondan sonra hayatında olanlar ya da sadece onu özlediğin. Doğru ya da yanlış bir içerik yoktur.' },
    ],
  },
  {
    slug: 'eski-sevgiliye-mesaj-atmali-miyim',
    title: 'Eski Sevgiliye Mesaj Atmalı mıyım? Göndermeden Önce Sorman Gereken 5 Soru',
    description: 'Eski sevgiliye mesaj atmadan önce kendine sorman gereken sorular, mesaj örnekleri ve göndermeden önce karşı tarafın tepkisini düşünmenin yolu.',
    h1: 'Eski sevgiliye mesaj atmalı mıyım?',
    intro: 'Gece yarısı yazılıp silinen mesajlar, "naber" ile başlayıp devam ettirilemeyen konuşmalar… Eski sevgiliye mesaj atmak çoğu zaman anlık bir karardır. Göndermeden önce birkaç dakika durup düşünmek, pişmanlığı da gereksiz kırgınlığı da önler.',
    sections: [
      { h: 'Göndermeden önce kendine sor', body: '<ol><li><b>Ne istiyorum?</b> Barışmak mı, bir özür mü, kapanış mı, yoksa sadece yalnızlık mı?</li><li><b>Bu mesajı yarın sabah da göndermek ister miydim?</b> Gece ve duygusal anlar kararları değiştirir.</li><li><b>Cevap gelmezse ne hissederim?</b> Buna hazır değilsen beklemek daha iyi olabilir.</li><li><b>Karşı tarafın sınırlarına saygı duyuyor muyum?</b> İletişimi kesmeyi istediyse bu isteğe saygı göstermek gerekir.</li><li><b>Mesajım kısa ve net mi?</b> Uzun açıklamalar çoğu zaman yanlış anlaşılır.</li></ol>' },
      { h: 'Mesaj örnekleri (amaca göre)', body: '<ul><li><b>Özür:</b> "Aradan zaman geçti ama o gün söylediklerim için özür dilemek istedim. Cevap vermek zorunda değilsin."</li><li><b>Kapanış:</b> "Birlikte geçirdiğimiz zaman için teşekkür etmek istedim. Sana iyi bir hayat dilerim."</li><li><b>Merak:</b> "Aklıma geldin, umarım iyisindir."</li></ul>' },
      { h: 'Göndermeden önce tepkisini düşünmek', body: '<p>Onu tanıyorsun: nasıl yazdığını, neye nasıl tepki verdiğini. Mesajını göndermeden önce onun yapay zekâ ikizine yazıp nasıl karşılanabileceğini görebilirsin. Bu bir tahmin, bir garanti değil; ama ne söylediğini ve nasıl söylediğini bir kez daha düşünmeni sağlar.</p>' },
    ],
    cta: { text: 'Göndermeden önce dene →', href: '/app.html?import=1&mode=describe&rel=eski%20sevgilim&ref=rehber-eski', note: 'Kayıt gerekmez. Bir yapay zekâ simülasyonudur; gerçek tepkisi farklı olabilir.' },
    faq: [
      { q: 'Eski sevgiliye ne zaman mesaj atılır?', a: 'Duygusal olarak sakin olduğunda, ne istediğini bildiğinde ve cevap gelmeme ihtimaline hazır olduğunda.' },
      { q: 'Eski sevgiliye ilk mesaj nasıl olmalı?', a: 'Kısa, baskısız ve cevap vermeyi zorunlu kılmayan bir mesaj genelde en iyi sonucu verir.' },
    ],
  },
];
