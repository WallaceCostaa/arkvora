/* Arkvora · dados do site.
   As fotos e os takes vêm de assets/midia.js, gerado por ../preparar_midia.py a partir da pasta
   PROJETOS SELECIONADOS. Aqui ficam só os textos de cada projeto e o que aparece na mesa. */
window.SITE = {
  whatsapp: {
    numero: "5524992243750",
    mensagem: { en: "Hello Arkvora! I'd like to talk about a project.", pt: "Olá, Arkvora! Quero conversar sobre um projeto." },
  },
  contato: {
    email: "contato.arkvora@gmail.com",
    web3formsChave: "", // opcional; se vazio, usa FormSubmit
    assunto: "Novo contato pelo site Arkvora",
  },
  instagram: "https://www.instagram.com/arkvora.visual/",

  // Nomes descritivos, sem o nome do cliente (padrão do documento de marca: "Forest House · Visualization: Arkvora Visual").
  // id = número da pasta. "mesa" = as 2 fotos (pela ordem na pasta) que flutuam na página inicial.
  // Arquitetura: KZ Studio em todos, exceto Divinamente (cliente final contratou só o vídeo; sem escritório), Apto Elisa (Vertico)
  // e Espaço Gourmet (autoral; sem crédito, mostra só a visualização).
  projetos: [
    { id: "01", nome: { en: "Mountain Garden House", pt: "Casa Jardim na Serra" }, arquitetura: "KZ Studio", tipo: "Exterior", mesa: [6, 10] },
    { id: "02", nome: { en: "Real Estate Office", pt: "Escritório Imobiliário" }, arquitetura: "KZ Studio", tipo: "Exterior · Commercial", mesa: [1, 4] },
    { id: "03", nome: { en: "Health and Education Campus", pt: "Campus de Saúde e Educação" }, arquitetura: "", tipo: "Exterior · Interior · Film", mesa: [8, 14] },
    { id: "04", nome: { en: "Gourmet Space", pt: "Espaço Gourmet" }, arquitetura: "", tipo: "Interior", mesa: [2, 13] }, // projeto autoral, sem crédito de arquitetura
    { id: "05", nome: { en: "Country House", pt: "Casa de Campo" }, arquitetura: "KZ Studio", tipo: "Exterior", mesa: [6, 3] },
    { id: "06", nome: { en: "Forest Lounge", pt: "Pavilhão na Mata" }, arquitetura: "KZ Studio", tipo: "Exterior · Interior", mesa: [2, 8] },
    { id: "07", nome: { en: "Warm Apartment", pt: "Apartamento Aconchego" }, arquitetura: "Vertico", tipo: "Interior", mesa: [12, 3] },
    { id: "08", nome: { en: "FMA New Leisure Space", pt: "Novo Espaço de Lazer FMA" }, arquitetura: "KZ Studio", tipo: "Exterior · Film", mesa: [2, 12] },
  ],

  // takes que passam na mesa (nomes em assets/takes); fora desta lista, ficam só no midia.js
  takesMesa: [
    "01-campus-aproximacao", "04-garagem", "05-mergulho-jalecos", "09-praca-povoada", "11-sala-aula", "13-consultorio", "14-recuo-implantacao",
    "fma-01-gancho", "fma-03-close-escavadeira", "fma-05-timelapse-escavacao", "fma-10-timelapse-alambrado",
    "fma-13-timelapse-saibro", "fma-18-horta-colheita", "fma-19-zenital-revelacao", "fma-22-casal-agua",
  ],
};
