import type {ArchivePerson} from '../../../lib/famous-saju/archive';
import type {CelebritySajuMagazineResult} from '../../../lib/famous-saju/celebrity-saju-service';
import type {getCelebrityEditorial} from '../../../lib/famous-saju/celebrity-editorial';
import type {getIljuReading} from '../../../lib/famous-saju/ilju-reading';
import type {buildCelebrityMultiSystem} from '../../../lib/famous-saju/celebrity-multi-system';
import type approved from 'virtual:toss-famous-archive';
export type FamousLibrary={people:ArchivePerson[];approved:typeof approved;ilju:NonNullable<ReturnType<typeof getIljuReading>>[];readings:Record<string,{magazine:CelebritySajuMagazineResult;related:{slug:string;nameKo:string;category:string}[];comparisonSlug:string|null;editorial:ReturnType<typeof getCelebrityEditorial>;multiSystem:Awaited<ReturnType<typeof buildCelebrityMultiSystem>>}>};
