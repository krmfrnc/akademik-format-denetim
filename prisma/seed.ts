import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Atıf stilleri ekleniyor...");

  const styles = [
    // ─── 1. APA 7 ───
    {
      name: "APA 7th Edition",
      shortName: "apa7",
      description: "American Psychological Association 7. Edisyon. Sosyal bilimler, eğitim ve psikolojide standart.",
      isSystem: true,
      icon: "📘",
      rules: {
        authorFormat: "{lastName}, {firstNameInitial}.",
        hangingIndent: "0.5in",
        ordering: "alphabetical",
        inText: {
          general: "({author}, {year})",
          narrative: "{author} ({year})",
          multiple: "({author1} & {author2}, {year})",
          etAl: "({author} et al., {year})",
        },
        bibliography: {
          journalArticle: "{author} ({year}). {title}. <em>{journal}</em>, <em>{volume}</em>({issue}), {pages}. {doi}",
          book: "{author} ({year}). <em>{title}</em> ({edition}). {publisher}. {doi}",
          bookChapter: "{author} ({year}). {title}. In {editor} (Ed.), <em>{bookTitle}</em> (pp. {pages}). {publisher}. {doi}",
          thesis: "{author} ({year}). <em>{title}</em> [{type}]. {institution}. {url}",
          proceeding: "{author} ({year}). {title}. In {editor} (Ed.), <em>{journal}</em> (pp. {pages}). {publisher}. {doi}",
          report: "{author} ({year}). <em>{title}</em> (Report No. {number}). {publisher}. {url}",
          website: "{author} ({year}, {date}). {title}. {publisher}. {url}",
          newspaper: "{author} ({year}, {date}). {title}. <em>{journal}</em>. {url}",
        },
      },
    },

    // ─── 2. Vancouver ───
    {
      name: "Vancouver",
      shortName: "vancouver",
      description: "International Committee of Medical Journal Editors (ICMJE). Tıp ve sağlık bilimlerinde standart.",
      isSystem: true,
      icon: "🏥",
      rules: {
        authorFormat: "{lastName} {firstNameInitial}",
        hangingIndent: "0",
        ordering: "numerical",
        inText: {
          general: "[{number}]",
          multiple: "[{numbers}]",
        },
        bibliography: {
          journalArticle: "{author}. {title}. <em>{journal}</em>. {year} {month};{volume}({issue}):{pages}.",
          book: "{author}. <em>{title}</em>. {edition}. {publisher}; {year}. {pages} p.",
          bookChapter: "{author}. {title}. In: {editor}, editor(s). <em>{bookTitle}</em>. {edition}. {publisher}; {year}. p. {pages}.",
          thesis: "{author}. {title} [{type}]. {institution}; {year}.",
          proceeding: "{author}. {title}. In: {editor}, editor(s). <em>{journal}</em>. {publisher}; {year}. p. {pages}.",
          report: "{author}. {title}. {publisher}; {year} {month}. Report No.: {number}.",
          website: "{author}. {title} [Internet]. {year} {month} [cited {accessDate}]. Available from: {url}",
          newspaper: "{author}. {title}. {journal}. {year} {month} {date};Sect. {section}:{pages}.",
        },
      },
    },

    // ─── 3. MLA 9 ───
    {
      name: "MLA 9th Edition",
      shortName: "mla9",
      description: "Modern Language Association 9. Edisyon. Dil, edebiyat ve beşeri bilimlerde standart.",
      isSystem: true,
      icon: "📝",
      rules: {
        authorFormat: "{lastName}, {firstName}.",
        hangingIndent: "0.5in",
        ordering: "alphabetical",
        inText: {
          general: "({author} {pages})",
          narrative: "{author} ({pages})",
          twoAuthors: "({author1} and {author2} {pages})",
          etAl: "({author} et al. {pages})",
        },
        bibliography: {
          journalArticle: "{author} \"{title}.\" <em>{journal}</em>, vol. {volume}, no. {issue}, {year}, pp. {pages}. {doi}",
          book: "{author} <em>{title}</em>. {edition}, {publisher}, {year}.",
          bookChapter: "{author} \"{title}.\" <em>{bookTitle}</em>, edited by {editor}, {edition}, {publisher}, {year}, pp. {pages}.",
          thesis: "{author} \"{title}.\" {type}, {institution}, {year}. {url}",
          proceeding: "{author} \"{title}.\" <em>{journal}</em>, edited by {editor}, {publisher}, {year}, pp. {pages}.",
          report: "{author} <em>{title}</em>. {publisher}, {year}. {number}.",
          website: "{author} \"{title}.\" <em>{publisher}</em>, {year}, {url}. Accessed {accessDate}.",
          newspaper: "{author} \"{title}.\" <em>{journal}</em>, {date} {month} {year}, p. {pages}.",
        },
      },
    },

    // ─── 4. Chicago Author-Date ───
    {
      name: "Chicago Author-Date",
      shortName: "chicago-ad",
      description: "Chicago Manual of Style 17. Edisyon - Yazar-Tarih sistemi. Sosyal bilimler, tarih ve felsefe.",
      isSystem: true,
      icon: "🏛️",
      rules: {
        authorFormat: "{lastName}, {firstName}.",
        hangingIndent: "0.5in",
        ordering: "alphabetical",
        inText: {
          general: "({author} {year}, {pages})",
          narrative: "{author} ({year}, {pages})",
        },
        bibliography: {
          journalArticle: "{author}. {year}. \"{title}.\" <em>{journal}</em> {volume}, no. {issue}: {pages}. {doi}",
          book: "{author}. {year}. <em>{title}</em>. {edition}. {publisher}.",
          bookChapter: "{author}. {year}. \"{title}.\" In <em>{bookTitle}</em>, edited by {editor}, {pages}. {publisher}.",
          thesis: "{author}. {year}. \"{title}.\" {type}, {institution}.",
          proceeding: "{author}. {year}. \"{title}.\" In <em>{journal}</em>, edited by {editor}, {pages}. {publisher}.",
          report: "{author}. {year}. <em>{title}</em>. {number}. {publisher}.",
          website: "{author}. {year}. \"{title}.\" {publisher}. Last modified {date}. {url}.",
          newspaper: "{author}. {year}. \"{title}.\" <em>{journal}</em>, {month} {date}. {url}.",
        },
      },
    },

    // ─── 5. Chicago Notes-Bibliography ───
    {
      name: "Chicago Notes-Bibliography",
      shortName: "chicago-nb",
      description: "Chicago Manual of Style 17. Edisyon - Dipnot sistemi. Tarih, sanat ve beşeri bilimler.",
      isSystem: true,
      icon: "📜",
      rules: {
        authorFormat: "{firstName} {lastName}",
        hangingIndent: "0.5in",
        ordering: "alphabetical",
        inText: {
          general: "¹ {author}, <em>{title}</em>, {pages}.",
        },
        bibliography: {
          journalArticle: "{lastName}, {firstName}. \"{title}.\" <em>{journal}</em> {volume}, no. {issue} ({year}): {pages}.",
          book: "{lastName}, {firstName}. <em>{title}</em>. {edition}. {publisher}, {year}.",
          bookChapter: "{lastName}, {firstName}. \"{title}.\" In <em>{bookTitle}</em>, edited by {editor}, {pages}. {publisher}, {year}.",
          thesis: "{lastName}, {firstName}. \"{title}.\" {type}, {institution}, {year}.",
          proceeding: "{lastName}, {firstName}. \"{title}.\" In <em>{journal}</em>, edited by {editor}, {pages}. {publisher}, {year}.",
          report: "{lastName}, {firstName}. <em>{title}</em>. {number}. {publisher}, {year}.",
          website: "{lastName}, {firstName}. \"{title}.\" {publisher}. Last modified {date}. {url}.",
          newspaper: "{lastName}, {firstName}. \"{title}.\" <em>{journal}</em>, {month} {date}, {year}.",
        },
      },
    },

    // ─── 6. Harvard ───
    {
      name: "Harvard",
      shortName: "harvard",
      description: "Harvard Referencing. Sosyal bilimler ve işletme alanında yaygın yazar-tarih sistemi.",
      isSystem: true,
      icon: "🎓",
      rules: {
        authorFormat: "{lastName}, {firstNameInitial}.",
        hangingIndent: "0.5in",
        ordering: "alphabetical",
        inText: {
          general: "({author}, {year})",
          narrative: "{author} ({year})",
          etAl: "({author} et al., {year})",
        },
        bibliography: {
          journalArticle: "{author} ({year}) '{title}', <em>{journal}</em>, {volume}({issue}), pp. {pages}. doi:{doi}.",
          book: "{author} ({year}) <em>{title}</em>. {edition}. {publisher}.",
          bookChapter: "{author} ({year}) '{title}', in {editor} (ed.) <em>{bookTitle}</em>. {publisher}, pp. {pages}.",
          thesis: "{author} ({year}) <em>{title}</em>. {type}. {institution}.",
          proceeding: "{author} ({year}) '{title}', in {editor} (ed.) <em>{journal}</em>. {publisher}, pp. {pages}.",
          report: "{author} ({year}) <em>{title}</em>. {publisher}. Report no. {number}.",
          website: "{author} ({year}) <em>{title}</em>. Available at: {url} (Accessed: {accessDate}).",
          newspaper: "{author} ({year}) '{title}', <em>{journal}</em>, {date} {month}, pp. {pages}.",
        },
      },
    },

    // ─── 7. IEEE ───
    {
      name: "IEEE",
      shortName: "ieee",
      description: "Institute of Electrical and Electronics Engineers. Mühendislik ve bilgisayar bilimlerinde standart.",
      isSystem: true,
      icon: "⚡",
      rules: {
        authorFormat: "{firstNameInitial}. {lastName}",
        hangingIndent: "0.25in",
        ordering: "numerical",
        inText: {
          general: "[{number}]",
          multiple: "[{numbers}]",
        },
        bibliography: {
          journalArticle: "{author}, \"{title},\" <em>{journal}</em>, vol. {volume}, no. {issue}, pp. {pages}, {month} {year}. doi: {doi}.",
          book: "{author}, <em>{title}</em>, {edition}. {publisher}, {year}.",
          bookChapter: "{author}, \"{title},\" in <em>{bookTitle}</em>, {edition}, {editor}, Ed. {publisher}, {year}, pp. {pages}.",
          thesis: "{author}, \"{title},\" {type}, {institution}, {year}.",
          proceeding: "{author}, \"{title},\" in <em>{journal}</em>, {year}, pp. {pages}. doi: {doi}.",
          report: "{author}, \"{title},\" {publisher}, Tech. Rep. {number}, {month} {year}.",
          website: "{author}. ({year}). <em>{title}</em>. [Online]. Available: {url}",
          newspaper: "{author}, \"{title},\" <em>{journal}</em>, {month} {date}, {year}.",
        },
      },
    },

    // ─── 8. ACS ───
    {
      name: "ACS",
      shortName: "acs",
      description: "American Chemical Society. Kimya alanında standart atıf stili.",
      isSystem: true,
      icon: "🧪",
      rules: {
        authorFormat: "{lastName}, {firstNameInitial}.",
        hangingIndent: "0.25in",
        ordering: "numerical",
        inText: {
          general: "¹",
          multiple: "¹⁻³",
        },
        bibliography: {
          journalArticle: "{author} <em>{journal}</em> <strong>{year}</strong>, <em>{volume}</em>, {pages}.",
          book: "{author} <em>{title}</em>; {publisher}: {year}.",
          bookChapter: "{author} In <em>{bookTitle}</em>; {editor}, Ed.; {publisher}: {year}; pp {pages}.",
          thesis: "{author} <em>{title}</em>. {type}, {institution}, {year}.",
          proceeding: "{author} In <em>{journal}</em>; {editor}, Ed.; {publisher}: {year}; pp {pages}.",
          report: "{author} <em>{title}</em>; {number}; {publisher}: {year}.",
          website: "{author} {title}. {url} (accessed {accessDate}).",
          newspaper: "{author} {journal}. {month} {date}, {year}.",
        },
      },
    },

    // ─── 9. AMA ───
    {
      name: "AMA",
      shortName: "ama",
      description: "American Medical Association. Tıp literatüründe JAMA stili olarak da bilinir.",
      isSystem: true,
      icon: "💊",
      rules: {
        authorFormat: "{lastName} {firstNameInitial}",
        hangingIndent: "0",
        ordering: "numerical",
        inText: {
          general: "¹",
          multiple: "¹⁻³",
        },
        bibliography: {
          journalArticle: "{author}. {title}. <em>{journal}</em>. {year};{volume}({issue}):{pages}. doi:{doi}",
          book: "{author}. <em>{title}</em>. {edition}. {publisher}; {year}.",
          bookChapter: "{author}. {title}. In: {editor}, ed. <em>{bookTitle}</em>. {edition}. {publisher}; {year}:{pages}.",
          thesis: "{author}. {title} [{type}]. {institution}; {year}. {url}",
          proceeding: "{author}. {title}. In: {editor}, ed. <em>{journal}</em>. {publisher}; {year}:{pages}.",
          report: "{author}. <em>{title}</em>. {publisher}; {year}. Report No.: {number}.",
          website: "{author}. {title}. Published {year}. Accessed {accessDate}. {url}",
          newspaper: "{author}. {title}. <em>{journal}</em>. {month} {date}, {year}. {url}.",
        },
      },
    },

    // ─── 10. Bluebook (Hukuk) ───
    {
      name: "Bluebook",
      shortName: "bluebook",
      description: "The Bluebook: A Uniform System of Citation. Hukuk alanında standart atıf sistemi.",
      isSystem: true,
      icon: "⚖️",
      rules: {
        authorFormat: "{firstName} {lastName}",
        hangingIndent: "0.5in",
        ordering: "legal",
        inText: {
          general: "<em>See</em> {author}, <em>{title}</em>, {pages}.",
        },
        bibliography: {
          journalArticle: "{author}, {title}, {volume} <em>{journal}</em> {pages} ({year}).",
          book: "{author}, <em>{title}</em> ({edition} {year}).",
          bookChapter: "{author}, {title}, in <em>{bookTitle}</em> {pages} ({editor} ed., {edition} {year}).",
          thesis: "{author}, {title} ({type}, {institution}, {year}).",
          report: "{author}, <em>{title}</em>, {number} ({publisher} {year}).",
          website: "{author}, {title}, {url} (last visited {accessDate}).",
          newspaper: "{author}, {title}, <em>{journal}</em>, {month} {date}, {year}.",
        },
      },
    },

    // ─── 11. APA 7 Türkçe ───
    {
      name: "APA 7 (Türkçe)",
      shortName: "apa7-tr",
      description: "APA 7. Edisyon Türkçe uyarlaması. Türkçe tez ve makaleler için optimize edilmiştir.",
      isSystem: true,
      icon: "🇹🇷",
      rules: {
        authorFormat: "{lastName}, {firstNameInitial}.",
        hangingIndent: "1.25cm",
        ordering: "alphabetical",
        inText: {
          general: "({author}, {year})",
          narrative: "{author} ({year})",
          multiple: "({author1} ve {author2}, {year})",
          etAl: "({author} ve diğ., {year})",
        },
        bibliography: {
          journalArticle: "{author} ({year}). {title}. <em>{journal}</em>, <em>{volume}</em>({issue}), {pages}. {doi}",
          book: "{author} ({year}). <em>{title}</em> ({edition}). {publisher}.",
          bookChapter: "{author} ({year}). {title}. In {editor} (Ed.), <em>{bookTitle}</em> (ss. {pages}). {publisher}.",
          thesis: "{author} ({year}). <em>{title}</em> [{type}]. {institution}. {url}",
          proceeding: "{author} ({year}). {title}. In {editor} (Ed.), <em>{journal}</em> (ss. {pages}). {publisher}.",
          report: "{author} ({year}). <em>{title}</em> (Rapor No. {number}). {publisher}.",
          website: "{author} ({year}, {date}). {title}. {publisher}. Erişim: {url}",
          newspaper: "{author} ({year}, {date}). {title}. <em>{journal}</em>. {url}",
        },
      },
    },
  ];

  for (const style of styles) {
    const existing = await prisma.citationStyle.findFirst({
      where: { shortName: style.shortName },
    });

    if (existing) {
      console.log(`  ⏭️  ${style.name} zaten mevcut, atlanıyor.`);
    } else {
      await prisma.citationStyle.create({ data: style });
      console.log(`  ✅ ${style.name} eklendi.`);
    }
  }

  console.log("🎉 Tüm atıf stilleri başarıyla eklendi.");

  // ─── Format Şablonları ───
  console.log("\n🔄 Format şablonları ekleniyor...");

  const apa7Citation = await prisma.citationStyle.findFirst({ where: { shortName: "apa7" } });
  const apa7trCitation = await prisma.citationStyle.findFirst({ where: { shortName: "apa7-tr" } });

  const formats = [
    {
      name: "APA 7 (Uluslararası)",
      description: "APA 7th Edition formatı. 1 inç kenar boşluğu, Times New Roman 12 pt, çift satır aralığı, asılı girintili kaynakça.",
      isSystem: true,
      isPublic: true,
      rules: {
        body: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2, alignment: "justify", marginTop: "1in", marginBottom: "1in", marginLeft: "1in", marginRight: "1in", firstLineIndent: "0.5in", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
        heading1: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "center", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
        heading2: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
        heading3: { fontFamily: "Times New Roman", fontSize: 12, bold: true, italic: true, alignment: "left", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
        abstract: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2 },
        footnote: { fontFamily: "Times New Roman", fontSize: 10, lineSpacing: 1 },
        blockQuote: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2, marginLeft: "0.5in" },
        bibliography: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2, hangingIndent: "0.5in" },
        pageNumbers: { position: "top-right", fontSize: 12 },
        tables: { insideBorders: false },
        citationStyleId: apa7Citation?.id,
      },
    },
    {
      name: "YDÜ Sosyal Bilimler Tez",
      description: "Yakın Doğu Üniversitesi Sosyal Bilimler Enstitüsü Tez Yazım Kılavuzu. Sol 4 cm, diğer 2.5 cm kenar boşluğu. Başlık öncesi/sonrası pt boşlukları tanımlı.",
      isSystem: true,
      isPublic: true,
      rules: {
        body: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5, alignment: "justify", marginTop: "2.5cm", marginBottom: "2.5cm", marginLeft: "4cm", marginRight: "2.5cm", firstLineIndent: "1.25cm", paragraphSpacingBefore: 6, paragraphSpacingAfter: 6 },
        heading1: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 72, paragraphSpacingAfter: 18 },
        heading2: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 18, paragraphSpacingAfter: 12 },
        heading3: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 12, paragraphSpacingAfter: 6 },
        abstract: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1, alignment: "justify" },
        footnote: { fontFamily: "Times New Roman", fontSize: 10, lineSpacing: 1 },
        blockQuote: { fontFamily: "Times New Roman", fontSize: 10, lineSpacing: 1, marginLeft: "1cm", marginRight: "0" },
        bibliography: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1, hangingIndent: "1.25cm", paragraphSpacingAfter: 12 },
        pageNumbers: { position: "top-center", fontSize: 12, introRoman: true },
        tables: { insideBorders: true },
        citationStyleId: apa7trCitation?.id,
      },
    },
    {
      name: "UKÜ Tez Formatı",
      description: "Uluslararası Kıbrıs Üniversitesi Lisansüstü Eğitim Enstitüsü Tez Yazım Kılavuzu. Üst 4 cm, sol 3.5 cm, sağ 3 cm, alt 2.5 cm. Başlıklar 14-12 punto.",
      isSystem: true,
      isPublic: true,
      rules: {
        body: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5, alignment: "justify", marginTop: "4cm", marginBottom: "2.5cm", marginLeft: "3.5cm", marginRight: "3cm" },
        heading1: { fontFamily: "Times New Roman", fontSize: 14, bold: true, alignment: "left", paragraphSpacingBefore: 18, paragraphSpacingAfter: 12 },
        heading2: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 12, paragraphSpacingAfter: 6 },
        heading3: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 6, paragraphSpacingAfter: 6 },
        abstract: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1, alignment: "justify" },
        footnote: { fontFamily: "Times New Roman", fontSize: 8, lineSpacing: 1 },
        blockQuote: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5 },
        bibliography: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5, paragraphSpacingAfter: 6 },
        pageNumbers: { position: "bottom-center", fontSize: 11, introRoman: true },
        tables: { insideBorders: true },
        citationStyleId: apa7trCitation?.id,
      },
    },
  ];

  for (const fmt of formats) {
    const existing = await prisma.formatTemplate.findFirst({
      where: { name: fmt.name, isSystem: true },
    });

    if (existing) {
      // Update existing to ensure citationStyleId is set
      await prisma.formatTemplate.update({
        where: { id: existing.id },
        data: { rules: fmt.rules as Prisma.InputJsonValue },
      });
      console.log(`  🔄 ${fmt.name} güncellendi (citationStyleId eklendi).`);
    } else {
      await prisma.formatTemplate.create({ data: fmt });
      console.log(`  ✅ ${fmt.name} eklendi.`);
    }
  }

  console.log("🎉 Tüm format şablonları başarıyla eklendi.");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
