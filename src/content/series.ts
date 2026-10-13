import type { Series } from '@/domain/types';

/**
 * Produções principais. Textos editoriais próprios, escritos para não revelar acontecimentos.
 * `safe` nunca revela o destino de personagens de outras séries; `full` pode revelar.
 */
export const MAIN_SERIES: Series[] = [
  {
    id: 'twd',
    title: 'The Walking Dead',
    shortTitle: 'The Walking Dead',
    code: 'TWD',
    kind: 'main',
    years: '2010–2022',
    network: 'AMC',
    accent: '#B5543F',
    description: {
      safe:
        'A série-mãe. Um policial desperta de um coma em um mundo que deixou de existir e precisa reencontrar a família — e descobrir quem ele se torna quando as regras acabam. Onze temporadas sobre comunidade, perda e o preço de continuar humano.',
    },
    sourceIds: ['tvmaze-twd', 'wiki-twd'],
  },
  {
    id: 'ftwd',
    title: 'Fear the Walking Dead',
    shortTitle: 'Fear',
    code: 'FTWD',
    kind: 'main',
    years: '2015–2023',
    network: 'AMC',
    accent: '#C2913F',
    description: {
      safe:
        'Começa em Los Angeles nos primeiros dias do surto, quando ninguém entende o que está acontecendo. Uma família recém-formada assiste à civilização ruir em tempo real — e a série se transforma várias vezes ao longo de oito temporadas.',
      full:
        'Começa em Los Angeles nos primeiros dias do surto e, a partir da quarta temporada, cruza caminhos com personagens vindos de The Walking Dead, mudando de elenco, cenário e tom ao longo de oito temporadas.',
    },
    sourceIds: ['tvmaze-ftwd', 'wiki-ftwd'],
  },
  {
    id: 'wb',
    title: 'The Walking Dead: World Beyond',
    shortTitle: 'World Beyond',
    code: 'WB',
    kind: 'main',
    years: '2020–2021',
    network: 'AMC',
    accent: '#5F8DA6',
    description: {
      safe:
        'Uma década depois da queda, a primeira geração criada atrás de muros decide atravessar o país. Uma história de amadurecimento sobre jovens que nunca conheceram o mundo de antes.',
    },
    sourceIds: ['tvmaze-wb', 'wiki-wb'],
  },
  {
    id: 'tales',
    title: 'Tales of the Walking Dead',
    shortTitle: 'Tales',
    code: 'TALES',
    kind: 'main',
    years: '2022',
    network: 'AMC',
    accent: '#9A7BB0',
    description: {
      safe:
        'Antologia de seis histórias independentes, cada uma com seu próprio tom e personagens, espalhadas por diferentes momentos do apocalipse. Pode ser vista de forma avulsa.',
    },
    sourceIds: ['tvmaze-tales', 'wiki-tales'],
  },
  {
    id: 'towl',
    title: 'The Walking Dead: The Ones Who Live',
    shortTitle: 'The Ones Who Live',
    code: 'TOWL',
    kind: 'main',
    years: '2024',
    network: 'AMC',
    accent: '#B9806C',
    description: {
      safe:
        'Minissérie em seis capítulos que retoma personagens centrais da série original. Feita para ser vista depois do final de The Walking Dead.',
      full:
        'Rick Grimes e Michonne, separados por anos e por uma força militar misteriosa, tentam encontrar o caminho de volta um para o outro. Minissérie em seis capítulos.',
    },
    sourceIds: ['tvmaze-towl', 'wiki-towl'],
  },
  {
    id: 'dd',
    title: 'The Walking Dead: Daryl Dixon',
    shortTitle: 'Daryl Dixon',
    code: 'DD',
    kind: 'main',
    years: '2023–',
    network: 'AMC',
    accent: '#7A9A6C',
    description: {
      safe:
        'Um dos sobreviventes mais conhecidos da série original vai parar, sem entender como, do outro lado do oceano. Europa, ruínas antigas e um apocalipse com outro sotaque.',
      full:
        'Daryl Dixon chega à costa da França sem saber como atravessou o Atlântico e descobre uma Europa marcada por conflitos próprios. Temporadas posteriores seguem pela Espanha.',
    },
    sourceIds: ['tvmaze-dd', 'wiki-dd'],
  },
  {
    id: 'dc',
    title: 'The Walking Dead: Dead City',
    shortTitle: 'Dead City',
    code: 'DC',
    kind: 'main',
    years: '2023–',
    network: 'AMC',
    accent: '#8592A3',
    description: {
      safe:
        'Dois personagens da série original, com uma história difícil entre si, entram juntos em uma Manhattan isolada do mundo há anos. Feita para ser vista depois do final de The Walking Dead.',
      full:
        'Maggie e Negan viajam a uma Manhattan isolada e dominada por novas facções em busca do filho dela, sequestrado. Feita para ser vista depois do final de The Walking Dead.',
    },
    sourceIds: ['tvmaze-dc', 'wiki-dc'],
  },
];
