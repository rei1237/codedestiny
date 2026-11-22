import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {RECIPES, recipeImage, recipeStageImage} from '../../../lib/lifestyle/recipes.mjs';

export function privateRecipeArt() {
  return {
    name: 'private-recipe-art',
    async generateBundle() {
      const covers = new Set(RECIPES.map(recipeImage));
      const art = new Set(covers);
      for (const recipe of RECIPES) {
        recipe.steps.forEach((_, index) => art.add(recipeStageImage(recipe, index)));
      }
      for (const path of art) {
        const sourcePath = fileURLToPath(new URL('../../../public' + path, import.meta.url));
        const width = covers.has(path) ? 390 : 180;
        const source = await sharp(sourcePath).resize({width, withoutEnlargement: true}).webp({quality: 75}).toBuffer();
        this.emitFile({type: 'asset', fileName: '__recipe-art' + path, source});
      }
    },
  };
}
