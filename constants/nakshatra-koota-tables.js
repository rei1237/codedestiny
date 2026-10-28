// Adapted numeric lookup tables from Saravali / Maitreya documentation (2017-10-30).
// This DATA FILE is CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
// https://saravali.github.io/astrology/koota_yoni.html
// https://saravali.github.io/astrology/koota_vashya.html
// https://saravali.github.io/astrology/koota_gana.html
// Changes: indexed JS data; Sheep spelling normalized to the existing Goat enum.
// Rows = bride reference, columns = groom reference. Keep documented asymmetries.
export const YONI_ORDER = ["Horse", "Elephant", "Goat", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
export const YONI_POINTS = [
  [4,2,2,3,2,2,2,1,0,1,3,3,2,1],
  [2,4,3,3,2,2,2,2,3,1,2,3,2,0],
  [2,3,4,2,1,2,1,3,3,1,2,0,3,1],
  [3,3,2,4,2,1,1,1,1,2,2,2,0,2],
  [2,2,1,2,4,2,1,2,2,1,0,2,1,1],
  [2,2,2,1,2,4,0,2,2,1,3,3,2,1],
  [2,2,1,1,1,0,4,2,2,2,2,2,1,2],
  [1,2,3,1,2,2,2,4,3,0,3,2,2,1],
  [0,3,3,1,2,2,2,3,4,1,2,2,2,1],
  [1,1,1,2,1,1,2,0,1,4,1,1,2,1],
  [1,2,2,2,0,3,2,3,2,1,4,2,2,1],
  [3,3,0,2,2,3,2,2,2,1,2,4,3,2],
  [2,2,3,0,1,2,1,2,2,2,2,3,4,2],
  [1,0,1,2,1,1,2,1,2,1,1,2,2,4],
];
export const VASHYA_ORDER = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"];
export const VASHYA_POINTS = [[2,0,0,.5,0],[1,2,1,.5,1],[.5,1,2,1,1],[0,0,0,2,0],[1,1,1,0,2]];
export const GANA_ORDER = ["Deva", "Manushya", "Rakshasa"];
export const GANA_POINTS = [[6,6,0],[5,6,0],[1,0,6]];
