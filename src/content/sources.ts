import type { EditorialSource } from '@/domain/types';

const V = '2026-10-13';
const wiki = (id: string, label: string, page: string): EditorialSource => ({
  id,
  label: `Wikipedia — ${label}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
  verifiedAt: V,
});
const tvmaze = (id: string, label: string, show: number): EditorialSource => ({
  id,
  label: `TVmaze — ${label}`,
  url: `https://www.tvmaze.com/shows/${show}`,
  verifiedAt: V,
});

export const SOURCES: EditorialSource[] = [
  tvmaze('tvmaze-twd', 'The Walking Dead', 73),
  tvmaze('tvmaze-ftwd', 'Fear the Walking Dead', 1824),
  tvmaze('tvmaze-wb', 'World Beyond', 45194),
  tvmaze('tvmaze-tales', 'Tales of the Walking Dead', 50287),
  tvmaze('tvmaze-towl', 'The Ones Who Live', 64504),
  tvmaze('tvmaze-dd', 'Daryl Dixon', 64501),
  tvmaze('tvmaze-dc', 'Dead City', 60879),
  wiki('wiki-franchise', 'The Walking Dead (franquia)', 'The_Walking_Dead_(franchise)'),
  wiki('wiki-twd', 'Lista de episódios de The Walking Dead', 'List_of_The_Walking_Dead_episodes'),
  wiki('wiki-twd-s9', 'The Walking Dead, 9ª temporada', 'The_Walking_Dead_season_9'),
  wiki('wiki-twd-s11', 'The Walking Dead, 11ª temporada', 'The_Walking_Dead_season_11'),
  wiki('wiki-ftwd', 'Fear the Walking Dead', 'Fear_the_Walking_Dead'),
  wiki('wiki-ftwd-s4', 'Fear the Walking Dead, 4ª temporada', 'Fear_the_Walking_Dead_season_4'),
  wiki('wiki-ftwd-s8', 'Fear the Walking Dead, 8ª temporada', 'Fear_the_Walking_Dead_season_8'),
  wiki('wiki-wb', 'World Beyond', 'The_Walking_Dead:_World_Beyond'),
  wiki('wiki-tales', 'Tales of the Walking Dead', 'Tales_of_the_Walking_Dead'),
  wiki('wiki-towl', 'The Ones Who Live', 'The_Walking_Dead:_The_Ones_Who_Live'),
  wiki('wiki-dd', 'Daryl Dixon', 'The_Walking_Dead:_Daryl_Dixon'),
  wiki('wiki-dc', 'Dead City', 'The_Walking_Dead:_Dead_City'),
  {
    id: 'fandom-order',
    label: 'Fandom (wiki de fãs) — Chronological Episode Order',
    url: 'https://walkingdead.fandom.com/wiki/Chronological_Episode_Order',
    verifiedAt: V,
  },
  {
    id: 'syfy-dc',
    label: 'SYFY Wire — linha do tempo de Dead City',
    url: 'https://www.syfy.com/syfy-wire/the-walking-dead-maggie-negan-spinoff-dead-city-timeline',
    verifiedAt: V,
  },
];
