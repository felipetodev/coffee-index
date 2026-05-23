export type CafeImage = {
  label: string
  href?: string
  src?: string
}

export type Cafe = {
  slug: string
  name: string
  addresses: string[]
  commune: string
  instagram: string
  description: string
  tags: string[]
  imagePlaceholders: CafeImage[]
}

const assetImages = (
  directory: string,
  filenames: string[],
  labels: string[]
): CafeImage[] =>
  filenames.map((filename, index) => ({
    label: labels[index] ?? `Foto ${index + 1}`,
    src: `/${directory}/${filename}`,
  }))

export const cafes: Cafe[] = [
  {
    slug: "artemisa-coffee-cocktail-bar",
    name: "Artemisa Coffee Cocktail Bar",
    addresses: ["Tajamar 287, Las Condes"],
    commune: "Las Condes",
    instagram: "@artemisa_cocktailbar",
    description:
      "Pioneros en Chile en fusionar cafetería y coctelería, este proyecto de Bar Academy destaca por llevar ambos mundos al más alto nivel. Su distintivo es la combinación: coctelería experimental que integra el grano en mezclas clásicas como su Negroni Coffee Party con base de cold brew. Su precisión de laboratorio les valió el puesto 77 en The South America's 100 Best Coffee Shops.",
    tags: ["Coffee cocktails", "Especialidad", "Bar"],
    imagePlaceholders: assetImages(
      "artemisa",
      ["artemisa1.webp", "artemisa2.webp"],
      ["Barra experimental", "Cold brew"]
    ),
  },
  {
    slug: "cafe-marelli",
    name: "Café Marelli",
    addresses: ["Bulnes 997, San Bernardo"],
    commune: "San Bernardo",
    instagram: "@cafemarelli",
    description:
      "Este proyecto nace con el propósito de rescatar y poner en valor la identidad del histórico barrio obrero ferroviario de San Bernardo, un sector profundamente ligado al trabajo y la vida en torno al tren. Ubicado junto a la Plaza Guarello, el espacio recupera la estética y el espíritu de encuentro de las antiguas cafeterías de barrio. Su gran misión es democratizar el café de especialidad, acercándolo a los vecinos con una propuesta cercana, de calidad y de carácter cotidiano.",
    tags: ["Barrio", "Especialidad", "Patrimonio"],
    imagePlaceholders: assetImages(
      "marelli",
      ["marelli1.jpg", "marelli2.jpg", "marelli3.jpg"],
      ["Fachada", "Barra", "Plaza Guarello"]
    ),
  },
  {
    slug: "puelo-coffee-roasters",
    name: "Puelo Coffee Roasters",
    addresses: ["Av. Vitacura 3535, Vitacura"],
    commune: "Vitacura",
    instagram: "@puelocoffeeroasters",
    description:
      "Nació como una evolución técnica para controlar todo el proceso del grano, desde el tueste en origen hasta la taza. Pero este proyecto en la calle Vitacura hizo historia al ganar el premio al mejor diseño de cafetería del mundo en los SCA Coffee Design Awards 2025. El galardón valida un espacio de bellísimo diseño donde arquitectura y funcionalidad conviven en armonía, ofreciendo además la minuciosa cocina que caracteriza a la familia Puelo.",
    tags: ["Roasters", "Diseño", "Premiado"],
    imagePlaceholders: assetImages(
      "pueblo",
      ["pueblo1.jpg", "pueblo2.jpg", "pueblo3.jpg"],
      ["Arquitectura", "Tueste", "Cocina"]
    ),
  },
  {
    slug: "felix-cafe",
    name: "Félix Café",
    addresses: ["Coyancura 2223, Providencia"],
    commune: "Providencia",
    instagram: "@felixcafe.cl",
    description:
      "Un manifiesto de cómo construir comunidad en pocos metros cuadrados. Su alma reside en constantes pop-ups dominicales: un escenario donde el café se une a la alta cocina en formatos democráticos. Por sus bancas pasan chefs como Álvaro Romero, Nicolás Tapia o Mariano Ramón, quienes salen de sus cocinas para ofrecer tostones, sándwiches de autor y otras preparaciones. Este proyecto liderado por periodistas tiene la virtud de que se apropia sin problemas de la vereda de Coyancura.",
    tags: ["Pop-ups", "Comunidad", "Vereda"],
    imagePlaceholders: assetImages(
      "felix",
      ["felix1.jpg", "felix2.jpg", "felix3.jpg"],
      ["Vereda", "Pop-up", "Barra"]
    ),
  },
  {
    slug: "coffee-culture-coffee-roasters",
    name: "Coffee Culture Coffee Roasters",
    addresses: ["General Ordóñez 199, Maipú"],
    commune: "Maipú",
    instagram: "@coffeeculture_cr",
    description:
      "Pioneros desde 2011 y con una ética punk bajo el lema Bigger-than-War, este proyecto liderado por Jake Standerfer es el gran bastión del café de especialidad en Maipú. Desde su centro en General Ordóñez, operan bajo un modelo de comercio directo que supera el comercio justo e importan granos de Etiopía o Ruanda para tostar con casa. Además de su excelencia técnica, consolidan un polo colaborativo junto a iniciativas como Planeta Musgo para el compostaje de sus residuos.",
    tags: ["Roasters", "Comercio directo", "Maipú"],
    imagePlaceholders: assetImages(
      "cculture",
      ["cculture1.jpg", "cculture2.jpg", "cculture3.jpg"],
      ["Tostaduría", "Granos", "Comunidad"]
    ),
  },
  {
    slug: "mirlo",
    name: "Mirlo",
    addresses: ["Eliodoro Yáñez 961, Providencia"],
    commune: "Providencia",
    instagram: "@mirlo_scl",
    description:
      "Al unificar una antigua casona de Providencia para transformarla en un refugio donde todo se hace desde cero, se convirtió en una joya de barrio. Liderada por sus dueños, su propuesta celebra la cocina estacional con una panadería, bollería y sándwiches que cambian semana a semana, siempre acompañados de gran café.",
    tags: ["Casona", "Panadería", "Barrio"],
    imagePlaceholders: assetImages(
      "mirlo",
      ["mirlo1.jpg", "mirlo2.jpg", "mirlo3.jpg"],
      ["Casona", "Bollería", "Patio"]
    ),
  },
  {
    slug: "black-mamba",
    name: "Black Mamba",
    addresses: ["Eliodoro Yáñez 1228, Local 104, Providencia"],
    commune: "Providencia",
    instagram: "@cafeblackmamba",
    description:
      "Inspirado en la cultura cafetera de Melbourne, este refugio de Manuel Montt destaca por su consistencia. Tras dar un gran salto estético con una aplaudida renovación a cargo de Estudio Bravo, equilibra diseño de autor y calidez, consolidando una propuesta que ocupa el puesto 88 de The South America's 100 Best Coffee Shops.",
    tags: ["Melbourne", "Diseño", "Especialidad"],
    imagePlaceholders: assetImages(
      "blackmamba",
      ["blackmamba1.jpg", "blackmamba2.jpg", "blackmamba3.jpg"],
      ["Interior", "Barra", "Detalle"]
    ),
  },
  {
    slug: "jose-y-jose",
    name: "José & José",
    addresses: ["Merced 349, Local 08, Santiago Centro"],
    commune: "Santiago Centro",
    instagram: "@joseyjose.cafe",
    description:
      "Escondido en la galería del Teatro Ictus en Lastarria, este oasis retro rinde homenaje en su nombre a José Victorino Lastarria y al Divino Anticristo. Con un patio interior lleno de verde, ofrece una impecable barra junto a Asunto Coffee, ideales para acompañar sus aplaudidas tostadas con hummus y encurtidos.",
    tags: ["Lastarria", "Patio", "Retro"],
    imagePlaceholders: assetImages(
      "josejose",
      ["josejose1.jpg", "josejose2.jpg", "josejose3.jpg"],
      ["Patio interior", "Tostadas", "Galería"]
    ),
  },
  {
    slug: "patonejo",
    name: "Patonejo",
    addresses: ["Hamburgo 1818, Ñuñoa", "Villaseca 439, Ñuñoa"],
    commune: "Ñuñoa",
    instagram: "@patonejo.cl",
    description:
      "Nació como una ventana al paso en Simón Bolívar y su éxito los llevó a abrir una preciosa casa esquina frente a la Plaza Augusto D'Halmar. Fundado por Cristóbal Cox y Sasha Asboli, este rincón une cocina y diseño. Su propuesta destaca por una panadería y bollería hecha desde cero en casa, una vocación de barrio y una cafetería que opera en alianza con la tradicional tostaduría Llama.",
    tags: ["Panadería", "Diseño", "Barrio"],
    imagePlaceholders: assetImages(
      "patonejo",
      ["patonejo1.jpg", "patonejo2.jpg", "patonejo3.jpg"],
      ["Casa esquina", "Bollería", "Café al paso"]
    ),
  },
  {
    slug: "cafe-triciclo",
    name: "Café Triciclo",
    addresses: ["Santo Domingo 598, Santiago Centro"],
    commune: "Santiago Centro",
    instagram: "@cafetriciclo",
    description:
      "Pasó de ser una barra itinerante en bicicleta a consolidarse en un luminoso refugio patrimonial de Bellas Artes. Sede de su propia tostaduría, Café 3 Ciclos, sus granos vienen en frascos ilustrados por artistas locales. Atentos a sus noches de viernes y sábado, cuando muta en una aplaudida pizzería napolitana pop-up.",
    tags: ["Bellas Artes", "Tostaduría", "Pop-up"],
    imagePlaceholders: assetImages(
      "triciclo",
      ["triciclo1.jpg", "triciclo2.jpg", "triciclo3.jpg"],
      ["Refugio patrimonial", "Frascos", "Pizza pop-up"]
    ),
  },
  {
    slug: "dosis-coffee-lab",
    name: "Dosis Coffee Lab",
    addresses: ["General Salvo 20, Providencia", "Condell 494, Providencia"],
    commune: "Providencia",
    instagram: "@dosiscoffeelab",
    description:
      "Distintas comunidades creativas han hecho de sus dos locales en la comuna su punto de encuentro. Alejada de los espacios neutros, Dosis ofrece una experiencia sensorial rica en texturas y colores, porque fue diseñada como vitrina viva para el talento y la manufactura nacional. Esa audacia se traslada a una carta innovadora que brilla por su barra fría, sus mezclas únicas como espresso kombucha o matcha frambuesa, sándwiches y pastelería inclusiva.",
    tags: ["Creativo", "Barra fría", "Inclusivo"],
    imagePlaceholders: assetImages(
      "dosis",
      ["dosis1.jpeg", "dosis2.jpg", "dosis3.jpg"],
      ["Texturas", "Barra fría", "Vitrina"]
    ),
  },
  {
    slug: "justicia-cafe",
    name: "Justicia Café",
    addresses: [
      "Biblioteca Nacional, Santiago Centro",
      "Casa Central U. de Chile, Santiago Centro",
    ],
    commune: "Santiago Centro",
    instagram: "@justiciacafe",
    description:
      "Tras nacer en Providencia, este proyecto de Marcela Seguel y Constanza Briones escaló a los grandes enclaves patrimoniales de la Alameda. Primero se instalaron en la Biblioteca Nacional con un respetuoso e imponente diseño de Oficina Bravo y Pablo González, y ahora acaban de abrir en la Casa Central de la Universidad de Chile. Un refugio barrista de alta gama e infraestructura monumental que convive de forma orgánica con investigadores, estudiantes y el ritmo del centro.",
    tags: ["Patrimonio", "Alameda", "Biblioteca"],
    imagePlaceholders: assetImages(
      "justicia",
      ["justicia1.jpg", "justicia2.jpg", "justicia3.jpg"],
      ["Biblioteca", "Casa Central", "Barra"]
    ),
  },
  {
    slug: "la-huerfana",
    name: "La Huérfana",
    addresses: ["Palacio Pereira, Huérfanos 1515, Santiago Centro"],
    commune: "Santiago Centro",
    instagram: "@lahuerfana.cafeteria",
    description:
      "Nacida en el Barrio Yungay, esta cafetería se instaló en el corazón restaurado del Palacio Pereira, permitiendo habitar el histórico edificio gubernamental a través del café de especialidad. Hoy cuentan con una segunda sede en Barrio Italia equipada con cocina propia, donde elaboran diariamente una pastelería artesanal honesta y consistente. Destacan sus húmedos brownies, muffins de temporada y galletones horneados en casa que complementan su impecable barra.",
    tags: ["Palacio Pereira", "Pastelería", "Patrimonio"],
    imagePlaceholders: assetImages(
      "huerfana",
      ["huerfana1.webp", "huerfana2.webp", "huerfana3.webp"],
      ["Palacio Pereira", "Pastelería", "Barra"]
    ),
  },
  {
    slug: "lover-cafeteria",
    name: "Lover Cafetería",
    addresses: ["Apoquindo 4615, Las Condes"],
    commune: "Las Condes",
    instagram: "@lovercafeteria",
    description:
      "A pasos de Metro Escuela Militar, este refugio pet friendly tiene como protagonista al horno y a la pastelería técnica. Su fundadora, la chef Camila Elizalde, impone un rigor absoluto en el tratamiento del hojaldre, con croissants de laminado perfecto y tartas de autor que complementan su barra de café de especialidad. Su vitrina sorprende constantemente gracias a sus aplaudidas colecciones temáticas de edición limitada para fechas especiales.",
    tags: ["Pastelería", "Pet friendly", "Hojaldre"],
    imagePlaceholders: assetImages(
      "lover",
      ["lover1.jpg", "lover2.jpg", "lover3.jpg"],
      ["Vitrina", "Croissants", "Tartas"]
    ),
  },
  {
    slug: "casa-cien-cafe",
    name: "Casa Cien Café",
    addresses: ["San Ignacio de Loyola 89, Santiago Centro"],
    commune: "Santiago Centro",
    instagram: "@casaciencafe",
    description:
      "En la esquina de San Ignacio y Alonso de Ovalle, en una casa de 1906 diseñada por el arquitecto Ricardo Larraín Bravo, Casa Cien acaba de inaugurar su segundo café. Emprendimiento liderado por los arquitectos Andrea Reyes y Víctor Droguett, es una vistosa oda a la calidad de su principal insumo y la belleza de la mansión, que es al mismo tiempo un museo para homenajear al hombre que diseñó la Iglesia de los Sacramentinos y el barrio Huemul.",
    tags: ["Arquitectura", "Mansión", "Museo"],
    imagePlaceholders: assetImages(
      "ccien",
      ["ccien1.jpg", "ccien2.jpg", "ccien3.jpg"],
      ["Casa 1906", "Museo", "Barra"]
    ),
  },
  {
    slug: "pausa-cafeteria",
    name: "Pausa Cafetería",
    addresses: ["Santa Isabel 0122, Providencia"],
    commune: "Providencia",
    instagram: "@pausacafeteriacl",
    description:
      "Impulsado por tres socios de origen sureño, este refugio habita una imponente casona de 1900 a pasos de Metro Santa Isabel. El proyecto destaca por su cocina y pastelería propia elaborada a diario, una barra de café de especialidad y una carta que invita a desayunar todo el día con opciones de brunch y sándwiches caseros.",
    tags: ["Brunch", "Casona", "Pastelería"],
    imagePlaceholders: assetImages(
      "pausa",
      ["pausa1.jpg", "pausa2.jpg", "pausa3.jpg"],
      ["Casona", "Brunch", "Pastelería"]
    ),
  },
  {
    slug: "somoszen",
    name: "Somoszen",
    addresses: ["Bandera 620 Of. 311, Santiago Centro"],
    commune: "Santiago Centro",
    instagram: "@somoszencafeteria",
    description:
      "Instalado en un edificio histórico restaurado en calle Bandera, este refugio conecta patrimonio y vida comunitaria. Funciona bajo un modelo de economía circular que colabora exclusivamente con pymes y artesanos locales. Ofrece café de especialidad, bebidas de autor y una propuesta inclusiva con opciones veganas y sin gluten.",
    tags: ["Circular", "Vegano", "Patrimonio"],
    imagePlaceholders: assetImages(
      "zen",
      ["zen1.jpg", "zen2.webp"],
      ["Edificio histórico", "Bebidas"]
    ),
  },
  {
    slug: "barra-b",
    name: "Barra B",
    addresses: ["Av. Pajaritos 4810, Maipú"],
    commune: "Maipú",
    instagram: "@barrab.maipu",
    description:
      "En plena Av. Los Pajaritos, esta barra aliada con Panadería 101 rompe esquemas con un diseño abierto que elimina las barreras entre el barista y el público. Su propuesta equilibra el café de alta gama con panes de masa madre y una aplaudida coctelería de autor sin alcohol, como su coffee tonic de naranja y jengibre.",
    tags: ["Barra abierta", "Masa madre", "Sin alcohol"],
    imagePlaceholders: assetImages(
      "barrab",
      ["barrab1.jpg", "barrab2.jpg", "barrab3.jpg"],
      ["Barra abierta", "Masa madre", "Coffee tonic"]
    ),
  },
  {
    slug: "cafe-magnolio",
    name: "Café Magnolio",
    addresses: ["Luis Thayer Ojeda 1872, Providencia"],
    commune: "Providencia",
    instagram: "@cafemagnolio.cl",
    description:
      "Concebido como la extensión del living o el patio de un hogar, habita una hermosa propiedad de 1938 construida por un panadero español. Su propuesta, cocreada por la chef Catalina Domínguez, ofrece una atmósfera relajada con excelente música, cocina honesta de elaboración propia y pastelería seleccionada de pymes.",
    tags: ["Living", "Cocina honesta", "Pymes"],
    imagePlaceholders: assetImages(
      "magnolio",
      ["magnolio1.jpg", "magnolio2.jpg", "magnolio3.jpg"],
      ["Casa", "Patio", "Pastelería"]
    ),
  },
  {
    slug: "la-foresta-coffee-cakes",
    name: "La Foresta Coffee & Cakes",
    addresses: ["Dr. Carlos Charlín 1480, Providencia"],
    commune: "Providencia",
    instagram: "@laforestacoffee",
    description:
      "A pasos de la Costanera Center, este oasis diseñado para la pausa prolongada aísla el ruido urbano con vegetación y el sonido de una pileta de agua. Fundado por sureñas, traslada la calidez austral a una repostería artesanal hecha en casa que rescata ingredientes como el maqui, ideal para acompañar su barra de café de especialidad. Un precioso formato pet friendly que también funciona para celebrar eventos privados.",
    tags: ["Oasis", "Repostería", "Pet friendly"],
    imagePlaceholders: assetImages(
      "foresta",
      ["foresta1.jpg", "foresta2.jpg", "foresta3.jpg"],
      ["Vegetación", "Repostería", "Pileta"]
    ),
  },
]

export const communes = Array.from(
  new Set(cafes.map((cafe) => cafe.commune))
).sort((a, b) => a.localeCompare(b, "es"))

export function getCafeBySlug(slug: string) {
  return cafes.find((cafe) => cafe.slug === slug)
}

export function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace("@", "")}`
}
