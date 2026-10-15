function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s·_-]+/gu, '');
}

export function matchesFamousSearch(person: { name: string; aliases: string[]; dayPillar: string | null; fields: string[] }, query: string) {
  const needle = normalize(query).replace(/(?:사주풀이|사주|운세)$/u, '');
  if (!needle) return true;
  return [person.name, ...person.aliases, person.dayPillar ? person.dayPillar + '일주' : '', ...person.fields]
    .some(value => normalize(value).includes(needle));
}
