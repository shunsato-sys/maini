import catalogJson from './catalog-recipes.json';
import {recipe,type Recipe} from './kitchen';
export const catalog:Recipe[]=recipe.array().parse(catalogJson);
export const catalogCount=catalog.length;
