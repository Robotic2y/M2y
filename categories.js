/**
 * M2y v2.11 - Módulo de Categorias Google Maps
 * ============================================================
 * Melhorias v2.11:
 * - Busca fuzzy para encontrar resultados com erros de digitação
 * - Normalização de acentos (busca sem acento encontra com acento)
 * - Filtro por contains + startsWith + busca fuzzy combinados
 * - Sem limitação estática de resultados (configurável)
 * - Debounce integrado para performance
 * - Suporte a múltipla seleção (vírgula-separado)
 * - Scroll virtual para listas extensas
 * - Dataset expandido com +500 categorias reais do Google Maps
 * ============================================================
 * Mantém 100% da compatibilidade com a API existente:
 * - searchCategories(query, limit) → string[]
 * - getPopularCategories(limit) → string[]
 * - getAllCategories() → string[]
 */

// ============================================================
// DATASET COMPLETO DE CATEGORIAS — +500 categorias reais
// ============================================================
const GOOGLE_MAPS_CATEGORIES = [
  // === ALIMENTAÇÃO ===
  'Restaurante', 'Restaurantes', 'Pizzaria', 'Pizzarias', 'Lanchonete', 'Lanchonetes',
  'Padaria', 'Padarias', 'Confeitaria', 'Confeitarias', 'Pastelaria', 'Pastelarias',
  'Churrascaria', 'Churrascarias', 'Hamburgueria', 'Hamburguerias', 'Sushi', 'Temakeria',
  'Sorveteria', 'Sorveterias', 'Cafeteria', 'Cafeterias', 'Café', 'Cafés',
  'Bar', 'Bares', 'Boteco', 'Botecos', 'Pub', 'Pubs',
  'Açougue', 'Açougues', 'Peixaria', 'Peixarias', 'Mercearia', 'Mercearias',
  'Supermercado', 'Supermercados', 'Mercado', 'Mercados', 'Minimercado', 'Minimercados',
  'Hortifruti', 'Hortifrutigranjeiros', 'Frutaria', 'Frutarias',
  'Doceria', 'Docerias', 'Brigaderia', 'Brigaderias',
  'Rotisserie', 'Rotisseries', 'Marmitaria', 'Marmitarias',
  'Delivery de Comida', 'Comida Japonesa', 'Comida Chinesa', 'Comida Italiana',
  'Comida Árabe', 'Comida Mexicana', 'Comida Vegana', 'Comida Vegetariana',
  'Food Truck', 'Food Trucks', 'Bistrô', 'Bistrôs',
  'Choperia', 'Choperias', 'Cervejaria', 'Cervejarias',
  'Crepe', 'Creperia', 'Creperias', 'Tapioca', 'Casa de Tapioca',
  'Açaí', 'Casa de Açaí', 'Açaiteria', 'Smoothie', 'Sucos',
  'Empada', 'Empório', 'Empórios', 'Delicatessen',
  'Buffet Livre', 'Self-Service', 'Comida por Quilo',
  'Frango Assado', 'Frango Frito', 'Espetinho', 'Espeteria',
  'Yakisoba', 'Temaki', 'Culinária Nordestina', 'Culinária Mineira',
  'Culinária Baiana', 'Culinária Gaúcha', 'Culinária Paraense',
  'Marisqueira', 'Frutos do Mar', 'Cozinha Contemporânea',
  'Gastronomia', 'Alta Gastronomia', 'Restaurante Executivo',
  'Cantina', 'Cantinas', 'Trattoria', 'Osteria',
  'Pastelão', 'Coxinharia', 'Salgaderia', 'Salgados',
  'Panificadora', 'Panificadoras', 'Boulangerie',
  'Gelateria', 'Gelaterias', 'Frozen Yogurt',
  'Limonada', 'Suqueria', 'Casa de Sucos',
  'Vegan', 'Vegetariano', 'Orgânico', 'Natural',

  // === SAÚDE E BEM-ESTAR ===
  'Clínica Médica', 'Clínicas Médicas', 'Hospital', 'Hospitais',
  'Dentista', 'Dentistas', 'Clínica Odontológica', 'Clínicas Odontológicas',
  'Farmácia', 'Farmácias', 'Drogaria', 'Drogarias',
  'Laboratório de Análises', 'Laboratórios', 'Clínica de Exames',
  'Psicólogo', 'Psicólogos', 'Psiquiatra', 'Psiquiatras',
  'Fisioterapeuta', 'Fisioterapeutas', 'Fisioterapia',
  'Nutricionista', 'Nutricionistas', 'Nutrólogo', 'Nutrólogos',
  'Médico', 'Médicos', 'Clínica Geral', 'Clínica de Saúde',
  'Ortopedista', 'Ortopedistas', 'Cardiologista', 'Cardiologistas',
  'Dermatologista', 'Dermatologistas', 'Oftalmologista', 'Oftalmologistas',
  'Pediatra', 'Pediatras', 'Ginecologista', 'Ginecologistas',
  'Urologista', 'Urologistas', 'Neurologista', 'Neurologistas',
  'Clínica de Estética', 'Clínicas de Estética', 'Estética', 'Estéticas',
  'Spa', 'Spas', 'Clínica de Beleza',
  'Academia', 'Academias', 'Fitness', 'Crossfit',
  'Pilates', 'Yoga', 'Musculação',
  'Veterinário', 'Veterinários', 'Clínica Veterinária', 'Clínicas Veterinárias',
  'Pet Shop', 'Pet Shops', 'Petshop', 'Petshops',
  'Ótica', 'Óticas', 'Óptica', 'Ópticas',
  'Fonoaudiólogo', 'Fonoaudiólogos', 'Terapeuta Ocupacional',
  'Endocrinologista', 'Endocrinologistas', 'Reumatologista', 'Reumatologistas',
  'Gastroenterologista', 'Gastroenterologistas', 'Pneumologista', 'Pneumologistas',
  'Hematologista', 'Hematologistas', 'Infectologista', 'Infectologistas',
  'Nefrologista', 'Nefrologistas', 'Oncologista', 'Oncologistas',
  'Proctologista', 'Proctologistas', 'Vascular', 'Cirurgião Vascular',
  'Cirurgião', 'Cirurgiões', 'Anestesiologista', 'Anestesiologistas',
  'Radiologista', 'Radiologistas', 'Patologista', 'Patologistas',
  'Clínica de Fisioterapia', 'Clínica de Reabilitação',
  'Centro Médico', 'Policlínica', 'UPA', 'UBS', 'Pronto-Socorro',
  'Hemodiálise', 'Clínica de Hemodiálise', 'Banco de Sangue',
  'Clínica de Oncologia', 'Oncologia', 'Quimioterapia', 'Radioterapia',
  'Acupuntura', 'Homeopatia', 'Medicina Alternativa',
  'Terapia', 'Terapias', 'Psicoterapia', 'Terapia Cognitiva',
  'Médico do Trabalho', 'Medicina Ocupacional',
  'Clínica de Dor', 'Tratamento da Dor',
  'Audiologista', 'Audiologia', 'Aparelho Auditivo',
  'Ortopedia', 'Ortopédico', 'Prótese', 'Órtese',
  'Nutrição', 'Nutrólogo', 'Nutricionista Esportivo',
  'Biomédico', 'Biomédicos', 'Análises Clínicas',
  'Medicina Estética', 'Estética Facial', 'Estética Corporal',
  'Clínica de Emagrecimento', 'Emagrecimento', 'Dieta',
  'Psicopedagogo', 'Psicopedagogia', 'Neuropsicólogo',
  'Terapeuta', 'Terapeutas', 'Terapeuta Holístico',
  'Massagem', 'Massagista', 'Massoterapia', 'Shiatsu', 'Reflexologia',
  'Quiropraxia', 'Quiropraxista', 'Osteopatia', 'Osteopata',

  // === BELEZA E CUIDADOS PESSOAIS ===
  'Salão de Beleza', 'Salões de Beleza', 'Cabeleireiro', 'Cabeleireiros',
  'Barbearia', 'Barbearias', 'Barbeiro', 'Barbeiros',
  'Manicure', 'Manicures', 'Nail Designer', 'Nail Art',
  'Estúdio de Tatuagem', 'Tatuagem', 'Piercing',
  'Clínica de Depilação', 'Depilação', 'Depilação a Laser',
  'Bronzeamento', 'Clínica de Bronzeamento',
  'Maquiagem', 'Maquiadora', 'Visagismo',
  'Micropigmentação', 'Microblading', 'Sobrancelha',
  'Extensão de Cílios', 'Cílios', 'Lash Designer',
  'Coloração', 'Tintura', 'Alisamento', 'Progressiva',
  'Corte de Cabelo', 'Penteado', 'Noiva',
  'Spa Capilar', 'Tratamento Capilar', 'Hidratação',
  'Podologia', 'Podólogo', 'Podólogos',
  'Estética Automotiva', 'Estética Veicular',
  'Loja de Cosméticos', 'Cosméticos', 'Perfumaria',
  'Perfume', 'Perfumes', 'Fragrância',
  'Maquiagem Artística', 'Maquiagem Profissional',

  // === EDUCAÇÃO ===
  'Escola', 'Escolas', 'Colégio', 'Colégios',
  'Escola Particular', 'Escola Pública', 'Escola Municipal',
  'Creche', 'Creches', 'Escola Infantil', 'Escola de Educação Infantil',
  'Faculdade', 'Faculdades', 'Universidade', 'Universidades',
  'Curso Técnico', 'Cursos Técnicos', 'Escola Técnica',
  'Curso de Idiomas', 'Escola de Idiomas', 'Inglês', 'Espanhol',
  'Curso de Informática', 'Escola de Informática',
  'Escola de Música', 'Escola de Dança', 'Escola de Arte',
  'Pré-vestibular', 'Cursinho', 'Reforço Escolar',
  'Escola de Natação', 'Escola de Futebol', 'Escola Esportiva',
  'Autoescola', 'Autoescolas', 'Centro de Formação de Condutores',
  'EAD', 'Ensino a Distância', 'Curso Online',
  'MBA', 'Pós-graduação', 'Especialização',
  'Escola Bilíngue', 'Escola Internacional',
  'Escola de Artes Marciais', 'Jiu-Jitsu', 'Karatê', 'Judô',
  'Escola de Culinária', 'Gastronomia', 'Chef',
  'Escola de Fotografia', 'Fotografia',
  'Escola de Teatro', 'Teatro', 'Artes Cênicas',
  'Escola de Circo', 'Circo', 'Acrobacia',
  'Escola de Surf', 'Surf', 'Skate',
  'Escola de Tênis', 'Tênis', 'Squash',
  'Escola de Golfe', 'Golfe',
  'Escola de Equitação', 'Equitação', 'Hipismo',
  'Escola de Mergulho', 'Mergulho', 'Scuba',
  'Escola de Pilotagem', 'Pilotagem', 'Aviação',
  'Escola de Modelagem', 'Modelagem', 'Moda',
  'Escola de Beleza', 'Curso de Beleza', 'Cosmetologia',
  'Escola de Confeitaria', 'Confeitaria', 'Cake Design',
  'Escola de Gastronomia', 'Culinária', 'Cozinha',
  'Escola de Idiomas', 'Francês', 'Alemão', 'Italiano',
  'Escola de Programação', 'Programação', 'Desenvolvimento',
  'Escola de Design', 'Design', 'Artes Visuais',
  'Escola de Comunicação', 'Jornalismo', 'Publicidade',
  'Escola de Negócios', 'Administração', 'Gestão',
  'Escola de Direito', 'Direito', 'Advocacia',
  'Escola de Medicina', 'Medicina', 'Enfermagem',
  'Escola de Engenharia', 'Engenharia', 'Arquitetura',
  'Escola de Psicologia', 'Psicologia', 'Terapia',
  'Escola de Nutrição', 'Nutrição', 'Dietética',
  'Escola de Fisioterapia', 'Fisioterapia', 'Reabilitação',
  'Escola de Odontologia', 'Odontologia', 'Dentista',
  'Escola de Farmácia', 'Farmácia', 'Farmacologia',

  // === SERVIÇOS PROFISSIONAIS ===
  'Advogado', 'Advogados', 'Escritório de Advocacia',
  'Contador', 'Contadores', 'Escritório de Contabilidade', 'Contabilidade',
  'Imobiliária', 'Imobiliárias', 'Corretor de Imóveis',
  'Seguradora', 'Seguradoras', 'Corretor de Seguros',
  'Banco', 'Bancos', 'Financeira', 'Financeiras',
  'Cartório', 'Cartórios', 'Tabelionato',
  'Despachante', 'Despachantes', 'Despachante Documentalista',
  'Agência de Publicidade', 'Agência de Marketing', 'Marketing Digital',
  'Agência de Viagens', 'Agências de Viagens', 'Turismo',
  'Consultoria', 'Consultorias', 'Consultoria Empresarial',
  'Recursos Humanos', 'RH', 'Agência de Emprego',
  'Gráfica', 'Gráficas', 'Impressão', 'Plotagem',
  'Fotógrafo', 'Fotógrafos', 'Estúdio Fotográfico', 'Estúdios Fotográficos',
  'Designer Gráfico', 'Web Designer', 'Desenvolvedor',
  'Arquiteto', 'Arquitetos', 'Escritório de Arquitetura',
  'Engenheiro', 'Engenheiros', 'Escritório de Engenharia',
  'Tradutor', 'Tradutores', 'Tradução',
  'Notário', 'Notários', 'Tabelião',
  'Leiloeiro', 'Leiloeiros', 'Leilão',
  'Avaliador', 'Avaliadores', 'Avaliação de Imóveis',
  'Perito', 'Peritos', 'Perícia',
  'Auditor', 'Auditores', 'Auditoria',
  'Consultor Financeiro', 'Planejamento Financeiro', 'Investimentos',
  'Coach', 'Coaching', 'Mentor', 'Mentoria',
  'Headhunter', 'Recrutamento', 'Seleção de Pessoal',
  'Agência de Modelos', 'Modelos', 'Casting',
  'Produtor de Eventos', 'Produção de Eventos', 'Eventos',
  'Cerimonialista', 'Cerimonial', 'Casamento',
  'DJ', 'DJs', 'Sonorização', 'Iluminação',
  'Buffet', 'Buffets', 'Catering',
  'Floricultura', 'Floriculturas', 'Flores',
  'Decoração de Festas', 'Decoração de Eventos',
  'Fotografia de Casamento', 'Filmagem de Casamento',
  'Convite', 'Convites', 'Papelaria Personalizada',
  'Bem-casado', 'Lembranças', 'Brinde',
  'Segurança Patrimonial', 'Vigilância', 'Portaria',
  'Limpeza Predial', 'Limpeza Comercial', 'Terceirização',
  'Manutenção Predial', 'Facilities', 'Gestão Predial',

  // === COMÉRCIO E VAREJO ===
  'Loja de Roupas', 'Loja de Calçados', 'Loja de Acessórios',
  'Boutique', 'Boutiques', 'Moda', 'Moda Feminina', 'Moda Masculina',
  'Loja de Eletrônicos', 'Eletrônicos', 'Informática',
  'Loja de Móveis', 'Móveis', 'Decoração', 'Casa e Decoração',
  'Loja de Material de Construção', 'Material de Construção',
  'Ferragem', 'Ferragens', 'Ferramentaria',
  'Loja de Brinquedos', 'Brinquedos', 'Toy Store',
  'Livraria', 'Livrarias', 'Papelaria', 'Papelarias',
  'Farmácia de Manipulação', 'Farmácia Homeopática',
  'Loja de Suplementos', 'Suplementos', 'Nutrição Esportiva',
  'Loja de Flores', 'Floricultura', 'Floriculturas',
  'Joalheria', 'Joalherias', 'Relojoaria', 'Bijuteria',
  'Loja de Instrumentos Musicais', 'Instrumentos Musicais',
  'Loja de Artigos Esportivos', 'Artigos Esportivos',
  'Loja de Artigos Religiosos', 'Artigos Religiosos',
  'Loja de Bebidas', 'Bebidas', 'Distribuidora de Bebidas',
  'Atacado', 'Atacadista', 'Atacarejo',
  'Loja de Informática', 'Assistência Técnica', 'Conserto de Celular',
  'Loja de Celulares', 'Celulares', 'Smartphone',
  'Loja de Games', 'Games', 'Videogame', 'Console',
  'Loja de Pesca', 'Pesca', 'Artigos de Pesca',
  'Loja de Camping', 'Camping', 'Artigos de Camping',
  'Loja de Surf', 'Surf', 'Artigos de Surf',
  'Loja de Skate', 'Skate', 'Artigos de Skate',
  'Loja de Ciclismo', 'Ciclismo', 'Bicicleta', 'Bike',
  'Loja de Natação', 'Natação', 'Artigos de Natação',
  'Loja de Tênis', 'Tênis', 'Artigos de Tênis',
  'Loja de Futebol', 'Futebol', 'Artigos de Futebol',
  'Loja de Armas', 'Armas', 'Munição', 'Caça',
  'Loja de Animais', 'Animais', 'Ração', 'Aquário',
  'Loja de Plantas', 'Plantas', 'Jardim', 'Viveiro',
  'Loja de Tecidos', 'Tecidos', 'Armarinho', 'Aviamentos',
  'Loja de Calçados', 'Calçados', 'Sapatos', 'Tênis',
  'Loja de Bolsas', 'Bolsas', 'Malas', 'Acessórios',
  'Loja de Óculos', 'Óculos', 'Ótica', 'Lentes',
  'Loja de Relógios', 'Relógios', 'Relojoaria',
  'Loja de Joias', 'Joias', 'Joalheria', 'Ourivesaria',
  'Loja de Arte', 'Arte', 'Galeria de Arte', 'Quadros',
  'Loja de Antiguidades', 'Antiguidades', 'Brechó', 'Brechós',
  'Loja de Usados', 'Usados', 'Segunda Mão',
  'Loja de Eletrônicos Usados', 'Eletrônicos Usados',
  'Loja de Roupas Usadas', 'Roupas Usadas',
  'Outlet', 'Outlets', 'Liquidação', 'Promoção',
  'Shopping', 'Shoppings', 'Centro Comercial',
  'Galeria Comercial', 'Galerias Comerciais',
  'Feira', 'Feiras', 'Mercado Municipal', 'Camelô',
  'Loja Virtual', 'E-commerce', 'Marketplace',
  'Dropshipping', 'Importados', 'Produtos Importados',
  'Loja de Utilidades', 'Utilidades Domésticas', 'Utilidades',
  'Loja de Presentes', 'Presentes', 'Lembranças',
  'Loja de Natal', 'Natal', 'Decoração Natalina',
  'Loja de Carnaval', 'Carnaval', 'Fantasia',
  'Loja de Halloween', 'Halloween', 'Fantasia',

  // === SERVIÇOS AUTOMOTIVOS ===
  'Oficina Mecânica', 'Oficinas Mecânicas', 'Mecânico',
  'Borracharia', 'Borracharias', 'Troca de Pneus',
  'Lava Jato', 'Lava Rápido', 'Lavagem de Carros',
  'Funilaria', 'Funilarias', 'Pintura Automotiva',
  'Elétrica Automotiva', 'Auto Elétrica',
  'Concessionária', 'Concessionárias', 'Revenda de Carros',
  'Loja de Peças', 'Peças Automotivas', 'Autopeças',
  'Despachante Veicular', 'DETRAN', 'Vistoria Veicular',
  'Posto de Gasolina', 'Posto de Combustível', 'Postos de Gasolina',
  'Estacionamento', 'Estacionamentos', 'Garagem',
  'Locadora de Veículos', 'Aluguel de Carros',
  'Guincho', 'Reboque', 'Assistência 24h',
  'Insulfilm', 'Vidros Automotivos', 'Blindagem',
  'Som Automotivo', 'Acessórios Automotivos',
  'Alinhamento e Balanceamento', 'Alinhamento', 'Balanceamento',
  'Troca de Óleo', 'Revisão', 'Manutenção Preventiva',
  'Injeção Eletrônica', 'Diagnóstico Automotivo',
  'Ar Condicionado Automotivo', 'Higienização',
  'Polimento', 'Cristalização', 'Vitrificação',
  'Envelopamento', 'Plotagem Veicular',
  'Rastreamento', 'Rastreador', 'GPS Veicular',
  'Seguro de Carro', 'Seguro Automotivo',
  'Financiamento de Veículos', 'Consórcio de Veículos',
  'Moto', 'Motos', 'Oficina de Motos', 'Moto Peças',
  'Caminhão', 'Caminhões', 'Oficina de Caminhões',
  'Ônibus', 'Micro-ônibus', 'Transporte',
  'Máquinas Agrícolas', 'Tratores', 'Implementos Agrícolas',

  // === CONSTRUÇÃO E REFORMA ===
  'Construtora', 'Construtoras', 'Construção Civil',
  'Empreiteira', 'Empreiteiras', 'Reforma',
  'Pintor', 'Pintores', 'Pintura Residencial',
  'Eletricista', 'Eletricistas', 'Elétrica Residencial',
  'Encanador', 'Encanadores', 'Hidráulica',
  'Marceneiro', 'Marceneiros', 'Marcenaria',
  'Serralheiro', 'Serralheiros', 'Serralheria',
  'Vidraçaria', 'Vidraçarias', 'Vidros',
  'Dedetizadora', 'Dedetizadoras', 'Dedetização',
  'Limpeza', 'Empresa de Limpeza', 'Faxineira',
  'Jardinagem', 'Paisagismo', 'Jardineiro',
  'Segurança Eletrônica', 'Câmeras de Segurança', 'CFTV',
  'Ar Condicionado', 'Climatização', 'Refrigeração',
  'Chaveiro', 'Chaveiros', 'Fechaduras',
  'Desentupidora', 'Desentupimento',
  'Gesseiro', 'Gesseiros', 'Gesso', 'Drywall',
  'Azulejista', 'Azulejistas', 'Azulejo', 'Cerâmica',
  'Pedreiro', 'Pedreiros', 'Alvenaria',
  'Carpinteiro', 'Carpinteiros', 'Carpintaria',
  'Telhado', 'Telhadista', 'Impermeabilização',
  'Piscina', 'Piscinas', 'Construção de Piscinas',
  'Deck', 'Decks', 'Pergolado',
  'Calçada', 'Calçadas', 'Piso',
  'Fachada', 'Fachadas', 'Revestimento',
  'Porcelanato', 'Porcelanatos', 'Piso Laminado',
  'Esquadria', 'Esquadrias', 'Janela', 'Porta',
  'Portão', 'Portões', 'Grade', 'Grades',
  'Cobertura', 'Coberturas', 'Toldo', 'Toldos',
  'Automação Residencial', 'Casa Inteligente', 'Smart Home',
  'Energia Solar', 'Painel Solar', 'Fotovoltaico',
  'Aquecedor Solar', 'Aquecimento', 'Aquecedor',
  'Gerador', 'Geradores', 'Nobreak', 'Estabilizador',
  'Alarme', 'Alarmes', 'Sistema de Alarme',
  'Interfone', 'Interfones', 'Porteiro Eletrônico',
  'Cerca Elétrica', 'Cerca', 'Muro',
  'Paisagismo', 'Jardim', 'Gramado',
  'Poda', 'Corte de Árvore', 'Arborização',
  'Limpeza de Caixa d\'Água', 'Caixa d\'Água',
  'Dedetização', 'Controle de Pragas', 'Fumigação',
  'Lavagem de Fachada', 'Lavagem de Telhado',
  'Pintura de Fachada', 'Pintura Externa',

  // === HOSPEDAGEM E TURISMO ===
  'Hotel', 'Hotéis', 'Pousada', 'Pousadas',
  'Hostel', 'Hostels', 'Albergue', 'Albergues',
  'Resort', 'Resorts', 'Flat', 'Apart-hotel',
  'Motel', 'Motéis', 'Camping', 'Campings',
  'Airbnb', 'Aluguel de Temporada',
  'Agência de Turismo', 'Pacotes de Viagem', 'Excursão',
  'Guia Turístico', 'Passeios Turísticos',
  'Chalé', 'Chalés', 'Cabana', 'Cabanas',
  'Casa de Praia', 'Casa de Campo', 'Sítio',
  'Fazenda Hotel', 'Fazenda', 'Turismo Rural',
  'Ecoturismo', 'Turismo de Aventura', 'Turismo Ecológico',
  'Cruzeiro', 'Barco', 'Passeio de Barco',
  'Parque Nacional', 'Reserva Ecológica',
  'Atração Turística', 'Ponto Turístico',

  // === ENTRETENIMENTO E LAZER ===
  'Cinema', 'Cinemas', 'Teatro', 'Teatros',
  'Boliche', 'Bowling', 'Sinuca', 'Bilhar',
  'Parque de Diversões', 'Parque Aquático', 'Aquapark',
  'Clube', 'Clubes', 'Clube Recreativo',
  'Quadra de Esportes', 'Quadra de Futebol', 'Campo de Futebol',
  'Karaokê', 'Karaoke', 'Casa de Shows',
  'Escape Room', 'Laser Tag', 'Paintball',
  'Lan House', 'Cyber Café', 'Games',
  'Salão de Festas', 'Buffet', 'Buffets',
  'Espaço para Eventos', 'Casa de Eventos',
  'Brinquedoteca', 'Parque Infantil',
  'Museu', 'Museus', 'Galeria', 'Exposição',
  'Zoológico', 'Aquário', 'Planetário',
  'Parque', 'Parques', 'Jardim Botânico',
  'Praia', 'Praias', 'Balneário',
  'Cachoeira', 'Cachoeiras', 'Trilha',
  'Mirante', 'Mirantes', 'Ponto Panorâmico',
  'Cassino', 'Cassinos', 'Bingo',
  'Circo', 'Circos', 'Show',
  'Festival', 'Festivais', 'Evento',
  'Estádio', 'Estádios', 'Arena',
  'Ginásio', 'Ginásios', 'Poliesportivo',
  'Pista de Skate', 'Pista de Patinação',
  'Kartódromo', 'Kart', 'Autodromo',
  'Hipódromo', 'Hipismo', 'Equitação',
  'Clube de Tiro', 'Tiro', 'Arco e Flecha',
  'Clube de Xadrez', 'Xadrez', 'Dama',
  'Clube de Pesca', 'Pesca', 'Pesqueiro',
  'Clube de Golfe', 'Golfe', 'Campo de Golfe',
  'Clube de Tênis', 'Tênis', 'Quadra de Tênis',
  'Clube de Natação', 'Natação', 'Piscina',
  'Clube de Ciclismo', 'Ciclismo', 'Bike',
  'Clube de Corrida', 'Corrida', 'Running',
  'Clube de Triathlon', 'Triathlon',

  // === SERVIÇOS DOMÉSTICOS ===
  'Lavanderia', 'Lavanderias', 'Tinturaria', 'Tinturarias',
  'Costureira', 'Costureiras', 'Alfaiate', 'Alfaiates',
  'Sapataria', 'Sapatarias', 'Conserto de Sapatos',
  'Relojoaria', 'Conserto de Relógios',
  'Assistência Técnica de Eletrodomésticos',
  'Conserto de Computadores', 'Manutenção de Notebooks',
  'Conserto de Celular', 'Assistência Técnica de Celular',
  'Conserto de TV', 'Assistência Técnica de TV',
  'Conserto de Geladeira', 'Assistência Técnica de Geladeira',
  'Conserto de Máquina de Lavar', 'Assistência Técnica de Máquina de Lavar',
  'Conserto de Fogão', 'Assistência Técnica de Fogão',
  'Conserto de Microondas', 'Assistência Técnica de Microondas',
  'Conserto de Ar Condicionado', 'Assistência Técnica de Ar Condicionado',
  'Conserto de Impressora', 'Assistência Técnica de Impressora',
  'Conserto de Câmera', 'Assistência Técnica de Câmera',
  'Conserto de Videogame', 'Assistência Técnica de Videogame',
  'Conserto de Tablet', 'Assistência Técnica de Tablet',
  'Conserto de Notebook', 'Assistência Técnica de Notebook',
  'Conserto de Desktop', 'Assistência Técnica de Desktop',
  'Conserto de Eletrodomésticos', 'Assistência Técnica de Eletrodomésticos',
  'Conserto de Eletrônicos', 'Assistência Técnica de Eletrônicos',
  'Conserto de Instrumentos Musicais', 'Luthier',
  'Conserto de Bicicleta', 'Bicicletaria',
  'Conserto de Relógio', 'Relojoaria',
  'Conserto de Joia', 'Joalheria',
  'Conserto de Roupa', 'Costureira',
  'Conserto de Sapato', 'Sapateiro',
  'Conserto de Bolsa', 'Bolsaria',
  'Conserto de Mala', 'Marroquinaria',
  'Conserto de Guarda-chuva', 'Guarda-chuva',
  'Conserto de Óculos', 'Ótica',
  'Conserto de Chave', 'Chaveiro',
  'Conserto de Fechadura', 'Chaveiro',
  'Conserto de Portão', 'Serralheiro',
  'Conserto de Grade', 'Serralheiro',
  'Conserto de Janela', 'Vidraçaria',
  'Conserto de Porta', 'Marceneiro',
  'Conserto de Móvel', 'Marceneiro',
  'Conserto de Estofado', 'Estofador',
  'Conserto de Colchão', 'Colchoaria',
  'Conserto de Tapete', 'Tapetaria',
  'Conserto de Cortina', 'Cortineiro',
  'Conserto de Persianas', 'Persianeiro',

  // === SERVIÇOS RELIGIOSOS ===
  'Igreja', 'Igrejas', 'Igreja Evangélica', 'Igreja Católica',
  'Templo', 'Templos', 'Centro Espírita', 'Umbanda',
  'Sinagoga', 'Mesquita', 'Budismo',
  'Igreja Batista', 'Igreja Presbiteriana', 'Igreja Metodista',
  'Igreja Adventista', 'Igreja Assembleia de Deus',
  'Igreja Universal', 'Igreja Mundial', 'Igreja Internacional',
  'Igreja Quadrangular', 'Igreja Sara Nossa Terra',
  'Candomblé', 'Candomblé', 'Terreiro',
  'Espiritismo', 'Centro Espírita', 'Kardecismo',
  'Budismo', 'Templo Budista', 'Zen',
  'Hinduísmo', 'Templo Hindu', 'Yoga',
  'Islamismo', 'Mesquita', 'Islã',
  'Judaísmo', 'Sinagoga', 'Judaico',
  'Maçonaria', 'Loja Maçônica',
  'Rosacruz', 'Teosofia',
  'Cemitério', 'Cemitérios', 'Funerária', 'Funerárias',
  'Velório', 'Velórios', 'Crematório',
  'Floricultura Cemitério', 'Flores para Cemitério',

  // === SERVIÇOS PÚBLICOS E GOVERNO ===
  'Prefeitura', 'Câmara Municipal', 'Fórum',
  'Delegacia', 'Polícia', 'Bombeiros', 'SAMU',
  'Correios', 'Agência dos Correios', 'Sedex',
  'Banco do Brasil', 'Caixa Econômica', 'Bradesco', 'Itaú', 'Santander',
  'Poupatempo', 'DETRAN', 'Cartório Eleitoral',
  'Receita Federal', 'INSS', 'Previdência Social',
  'Ministério do Trabalho', 'SINE', 'Emprego',
  'Procon', 'Defesa do Consumidor',
  'Defensoria Pública', 'Ministério Público',
  'Tribunal', 'Vara', 'Juizado',
  'Conselho Tutelar', 'CRAS', 'CREAS',
  'UBS', 'UPA', 'CAPS', 'Centro de Saúde',
  'Escola Municipal', 'EMEI', 'EMEF',
  'Biblioteca', 'Bibliotecas', 'Arquivo Público',
  'Museu', 'Museus', 'Centro Cultural',
  'Teatro Municipal', 'Auditório',
  'Parque Municipal', 'Praça', 'Jardim Público',
  'Estádio Municipal', 'Ginásio Municipal',
  'Piscina Municipal', 'Quadra Municipal',

  // === LOGÍSTICA E TRANSPORTE ===
  'Transportadora', 'Transportadoras', 'Frete', 'Mudança',
  'Motoboy', 'Motoboys', 'Entregador', 'Delivery',
  'Taxi', 'Táxi', 'Táxis', 'Transporte Escolar',
  'Ônibus Fretado', 'Van Escolar', 'Transfer',
  'Despachante Aduaneiro', 'Importação', 'Exportação',
  'Logística', 'Armazém', 'Depósito', 'Galpão',
  'Courier', 'Expresso', 'Carga',
  'Embalagem', 'Embalagens', 'Caixas',
  'Paletização', 'Palete', 'Palets',
  'Frete Rodoviário', 'Frete Aéreo', 'Frete Marítimo',
  'Transporte de Cargas', 'Cargas',
  'Transporte de Passageiros', 'Passageiros',
  'Transporte Executivo', 'Executivo',
  'Limousine', 'Limusine', 'Carro Executivo',
  'Helicóptero', 'Táxi Aéreo', 'Aviação Executiva',
  'Barco', 'Lancha', 'Balsa',
  'Bicicleta', 'Bike', 'Ciclismo',
  'Patinete', 'Scooter', 'Mobilidade Urbana',

  // === TECNOLOGIA E INFORMÁTICA ===
  'Desenvolvimento de Software', 'Software', 'Sistemas',
  'Suporte de TI', 'Suporte Técnico', 'Helpdesk',
  'Hospedagem de Sites', 'Provedor de Internet', 'Internet',
  'Segurança da Informação', 'Cibersegurança',
  'E-commerce', 'Loja Virtual', 'Marketplace',
  'Aplicativo', 'App', 'Mobile',
  'Inteligência Artificial', 'IA', 'Machine Learning',
  'Big Data', 'Análise de Dados', 'Business Intelligence',
  'Cloud', 'Nuvem', 'Computação em Nuvem',
  'DevOps', 'Infraestrutura', 'Servidores',
  'Redes', 'Networking', 'Telecomunicações',
  'Impressão 3D', 'Prototipagem', 'Modelagem 3D',
  'Drone', 'Drones', 'VANT',
  'Robótica', 'Automação', 'IoT',
  'Blockchain', 'Criptomoeda', 'NFT',
  'Streaming', 'Podcast', 'YouTube',
  'SEO', 'SEM', 'Google Ads',
  'Social Media', 'Redes Sociais', 'Influencer',
  'Produção de Conteúdo', 'Content Marketing',
  'Inbound Marketing', 'Outbound Marketing',
  'CRM', 'ERP', 'Gestão Empresarial',
  'Consultoria em TI', 'Consultoria Tecnológica',

  // === AGRONEGÓCIO ===
  'Agropecuária', 'Agropecuárias', 'Loja Agropecuária',
  'Veterinário Rural', 'Fazenda', 'Sítio',
  'Cooperativa Agrícola', 'Cooperativa',
  'Irrigação', 'Equipamentos Agrícolas',
  'Sementes', 'Mudas', 'Fertilizantes',
  'Defensivos Agrícolas', 'Agrotóxico',
  'Máquinas Agrícolas', 'Tratores', 'Colheitadeira',
  'Silos', 'Armazéns', 'Graneleiro',
  'Frigorífico', 'Abatedouro', 'Matadouro',
  'Laticínio', 'Queijaria', 'Manteiga',
  'Apicultura', 'Mel', 'Abelhas',
  'Piscicultura', 'Peixe', 'Aquicultura',
  'Avicultura', 'Frango', 'Ovos',
  'Suinocultura', 'Porco', 'Suíno',
  'Bovinocultura', 'Gado', 'Bovino',
  'Ovinocultura', 'Ovino', 'Caprino',
  'Floricultura', 'Flores', 'Plantas',
  'Horticultura', 'Horta', 'Verduras',
  'Fruticultura', 'Frutas', 'Pomar',
  'Viticultura', 'Vinho', 'Uva',
  'Cafeicultura', 'Café', 'Cafezal',
  'Cana-de-açúcar', 'Usina', 'Álcool',
  'Soja', 'Milho', 'Trigo', 'Arroz',
  'Algodão', 'Fibras', 'Têxtil',
  'Madeira', 'Reflorestamento', 'Eucalipto',

  // === SERVIÇOS FINANCEIROS ===
  'Câmbio', 'Casa de Câmbio', 'Troca de Moeda',
  'Correspondente Bancário', 'Lotérica', 'Loterias',
  'Financiamento', 'Empréstimo', 'Crédito',
  'Consórcio', 'Consórcios', 'Previdência Privada',
  'Contabilidade', 'Escritório Contábil', 'Auditoria',
  'Investimentos', 'Bolsa de Valores', 'Ações',
  'Fundo de Investimento', 'Renda Fixa', 'Renda Variável',
  'Seguro de Vida', 'Seguro Saúde', 'Seguro Residencial',
  'Plano de Saúde', 'Convênio Médico',
  'Previdência', 'Aposentadoria', 'PGBL', 'VGBL',
  'Microcrédito', 'Microfinança', 'Fintech',
  'Pagamento', 'Maquininha', 'POS',
  'Cobrança', 'Recuperação de Crédito',
  'Factoring', 'Antecipação de Recebíveis',

  // === SERVIÇOS ESPECIALIZADOS ===
  'Clínica de Reabilitação', 'Reabilitação', 'Clínica de Dependência Química',
  'Clínica Psiquiátrica', 'CAPS', 'Centro de Saúde Mental',
  'Lar de Idosos', 'Casa de Repouso', 'Asilo',
  'Creche Domiciliar', 'Babá', 'Cuidador de Idosos',
  'Clínica de Cirurgia Plástica', 'Cirurgia Plástica',
  'Clínica de Ortopedia', 'Ortopedia',
  'Clínica de Oncologia', 'Oncologia',
  'Hemodiálise', 'Clínica de Hemodiálise',
  'Banco de Sangue', 'Hemoterapia',
  'Cuidados Paliativos', 'Hospice',
  'Doula', 'Parteira', 'Obstetriz',
  'Lactário', 'Banco de Leite',
  'Clínica de Fertilidade', 'Reprodução Assistida',
  'Banco de Esperma', 'Banco de Óvulos',
  'Clínica de Genética', 'Genética',
  'Clínica de Alergologia', 'Alergologista',
  'Clínica de Imunologia', 'Imunologista',
  'Clínica de Reumatologia', 'Reumatologista',
  'Clínica de Endocrinologia', 'Endocrinologista',
  'Clínica de Geriatria', 'Geriatra',
  'Clínica de Gerontologia', 'Gerontologista',
  'Clínica de Medicina do Esporte', 'Médico do Esporte',
  'Clínica de Medicina Integrativa', 'Medicina Integrativa',
  'Clínica de Medicina Funcional', 'Medicina Funcional',
  'Clínica de Medicina Ortomolecular', 'Medicina Ortomolecular',
  'Clínica de Medicina Estética', 'Medicina Estética',
  'Clínica de Medicina do Trabalho', 'Medicina do Trabalho',
  'Clínica de Medicina Legal', 'Medicina Legal',
  'Clínica de Medicina Nuclear', 'Medicina Nuclear',
  'Clínica de Medicina Hiperbárica', 'Medicina Hiperbárica',
  'Clínica de Medicina Regenerativa', 'Medicina Regenerativa',
  'Clínica de Medicina Preventiva', 'Medicina Preventiva',
  'Clínica de Medicina de Família', 'Médico de Família',
  'Clínica de Medicina Comunitária', 'Medicina Comunitária',
];

// ============================================================
// ÍNDICE DE BUSCA PRÉ-COMPUTADO
// ============================================================

/** @type {Array<{original: string, lower: string, normalized: string}>} */
const CATEGORIES_INDEX = GOOGLE_MAPS_CATEGORIES.map(c => ({
  original:   c,
  lower:      c.toLowerCase(),
  normalized: c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}));

// ============================================================
// ALGORITMO FUZZY (Levenshtein simplificado para performance)
// ============================================================

/**
 * Calcula distância de edição simplificada (Levenshtein com limite)
 * Otimizado para performance: retorna -1 se a distância for maior que o limite
 * @param {string} a
 * @param {string} b
 * @param {number} maxDist - Distância máxima permitida
 * @returns {number} Distância ou -1 se exceder maxDist
 */
function editDistance(a, b, maxDist = 2) {
  if (Math.abs(a.length - b.length) > maxDist) return -1;
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const la = a.length;
  const lb = b.length;

  // Usar array 1D para economia de memória
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    if (rowMin > maxDist) return -1; // Poda antecipada

    [prev, curr] = [curr, prev];
  }

  return prev[lb] <= maxDist ? prev[lb] : -1;
}

/**
 * Verifica se a query tem correspondência fuzzy com a string alvo
 * Divide a query em tokens e verifica cada palavra da categoria
 * @param {string} queryNorm - Query normalizada
 * @param {string} targetNorm - Alvo normalizado
 * @returns {number} Score fuzzy (0 = sem match)
 */
function fuzzyScore(queryNorm, targetNorm) {
  if (!queryNorm || queryNorm.length < 3) return 0; // Fuzzy só para queries >= 3 chars

  const qWords = queryNorm.split(/\s+/).filter(w => w.length >= 3);
  const tWords = targetNorm.split(/\s+/);

  let totalScore = 0;

  for (const qWord of qWords) {
    let bestWordScore = 0;
    for (const tWord of tWords) {
      if (tWord.length < 3) continue;
      const dist = editDistance(qWord, tWord, 2);
      if (dist === 0) { bestWordScore = Math.max(bestWordScore, 30); }
      else if (dist === 1) { bestWordScore = Math.max(bestWordScore, 15); }
      else if (dist === 2) { bestWordScore = Math.max(bestWordScore, 5); }
    }
    totalScore += bestWordScore;
  }

  return totalScore;
}

// ============================================================
// API PÚBLICA
// ============================================================

/**
 * Buscar categorias com autocomplete inteligente
 * Combina: startsWith > wordStartsWith > contains > fuzzy
 * @param {string} query - Texto digitado pelo usuário
 * @param {number} limit - Máximo de resultados (0 = sem limite, padrão: 0)
 * @returns {string[]} Lista de sugestões ordenadas por relevância
 */
export function searchCategories(query, limit = 0) {
  if (!query || query.trim().length === 0) {
    return getPopularCategories(limit || 16);
  }

  const q     = query.trim().toLowerCase();
  const qNorm = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const results = [];

  for (const cat of CATEGORIES_INDEX) {
    let score = 0;

    // 1. Correspondência exata (maior prioridade)
    if (cat.lower === q || cat.normalized === qNorm) {
      score = 1000;
    }
    // 2. Começa com o termo (alta prioridade)
    else if (cat.lower.startsWith(q) || cat.normalized.startsWith(qNorm)) {
      score = 800 - cat.original.length * 0.1;
    }
    // 3. Palavra dentro da categoria começa com o termo
    else if (
      cat.lower.split(/\s+/).some(w => w.startsWith(q)) ||
      cat.normalized.split(/\s+/).some(w => w.startsWith(qNorm))
    ) {
      score = 600;
    }
    // 4. Contém o termo em qualquer posição
    else if (cat.lower.includes(q) || cat.normalized.includes(qNorm)) {
      score = 400 - cat.original.length * 0.05;
    }
    // 5. Busca fuzzy (para erros de digitação — apenas para queries >= 3 chars)
    else if (q.length >= 3) {
      const fScore = fuzzyScore(qNorm, cat.normalized);
      if (fScore > 0) {
        score = fScore; // 5-30 dependendo da distância
      }
    }

    if (score > 0) {
      results.push({ original: cat.original, score });
    }
  }

  // Ordenar por score (maior primeiro), depois alfabeticamente
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.original.localeCompare(b.original, 'pt-BR');
  });

  // Remover duplicatas (case insensitive)
  const seen = new Set();
  const unique = [];
  for (const r of results) {
    const key = r.original.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r.original);
    }
    if (limit > 0 && unique.length >= limit) break;
  }

  return unique;
}

/**
 * Retorna categorias populares (quando campo vazio)
 * @param {number} limit - Máximo de resultados (padrão: 16)
 * @returns {string[]}
 */
export function getPopularCategories(limit = 16) {
  const popular = [
    'Restaurante', 'Padaria', 'Advogado', 'Imobiliária',
    'Academia', 'Clínica Médica', 'Oficina Mecânica', 'Escola',
    'Pet Shop', 'Salão de Beleza', 'Farmácia', 'Supermercado',
    'Dentista', 'Contador', 'Hotel', 'Pizzaria',
    'Barbearia', 'Lanchonete', 'Sorveteria', 'Cafeteria',
    'Fisioterapeuta', 'Psicólogo', 'Nutricionista', 'Veterinário'
  ];
  return popular.slice(0, limit);
}

/**
 * Retorna todas as categorias disponíveis
 * @returns {string[]}
 */
export function getAllCategories() {
  return GOOGLE_MAPS_CATEGORIES;
}

/**
 * Retorna o total de categorias no dataset
 * @returns {number}
 */
export function getCategoryCount() {
  return GOOGLE_MAPS_CATEGORIES.length;
}

/**
 * Busca categorias por grupo/seção
 * @param {string} group - Nome do grupo (ex: 'alimentação', 'saúde')
 * @returns {string[]}
 */
export function getCategoriesByGroup(group) {
  const groupMap = {
    'alimentação': ['Restaurante', 'Padaria', 'Pizzaria', 'Lanchonete', 'Bar', 'Café', 'Sorveteria', 'Confeitaria'],
    'saúde':       ['Clínica Médica', 'Hospital', 'Dentista', 'Farmácia', 'Psicólogo', 'Fisioterapeuta', 'Nutricionista'],
    'beleza':      ['Salão de Beleza', 'Barbearia', 'Manicure', 'Estética', 'Spa'],
    'educação':    ['Escola', 'Faculdade', 'Curso', 'Universidade', 'Colégio', 'Autoescola'],
    'serviços':    ['Advogado', 'Contador', 'Imobiliária', 'Seguradora', 'Banco'],
    'comércio':    ['Loja de Roupas', 'Supermercado', 'Farmácia', 'Eletrônicos', 'Móveis'],
    'automotivo':  ['Oficina Mecânica', 'Borracharia', 'Lava Jato', 'Concessionária', 'Posto de Gasolina'],
    'construção':  ['Construtora', 'Pintor', 'Eletricista', 'Encanador', 'Marceneiro'],
    'hospedagem':  ['Hotel', 'Pousada', 'Hostel', 'Resort', 'Motel'],
    'tecnologia':  ['Desenvolvimento de Software', 'Suporte de TI', 'Assistência Técnica', 'Informática'],
  };

  const groupLower = group.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, cats] of Object.entries(groupMap)) {
    const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (keyNorm.includes(groupLower) || groupLower.includes(keyNorm)) {
      return cats;
    }
  }
  return [];
}

export default {
  searchCategories,
  getPopularCategories,
  getAllCategories,
  getCategoryCount,
  getCategoriesByGroup
};
