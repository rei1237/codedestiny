import { saju } from "./saju";
import { sukuyo } from "./sukuyo";
import { vedic } from "./vedic";
import { astrology } from "./astrology";
import { ziwei } from "./ziwei";
import {tarot} from './tarot';
import { DomainId, FortuneDomain } from "./shared/contracts";
export const domains: Record<DomainId, FortuneDomain> = {
  saju,
  sukuyo,
  vedic,
  astrology,
  ziwei,
  tarot,
};
