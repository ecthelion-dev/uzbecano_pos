import {
  Sparkles, Utensils, UtensilsCrossed, ChefHat, CookingPot, HandPlatter,
  Soup, Salad, Sandwich, Pizza, Beef, Drumstick, Ham, Fish, Egg, EggFried,
  Flame, Vegan, Carrot, Leaf, Wheat, Croissant, Bean, Nut,
  Cake, CakeSlice, Dessert, Cookie, Donut, IceCreamCone, IceCreamBowl,
  Candy, Lollipop, Popcorn,
  Coffee, CupSoda, GlassWater, Milk, Wine, Beer, Martini, Citrus,
  Apple, Cherry, Grape, Banana, Snowflake,
  ShoppingBag, Star, Heart,
  type LucideIcon,
} from 'lucide-react';

/**
 * The icons a category may carry, keyed exactly as the admin panel stores them.
 *
 * The till used to draw UtensilsCrossed for every category regardless, so the
 * icon an admin picked — and later the photo they uploaded — showed only in the
 * guest menu. This list must stay in step with the web app's `iconComponents`.
 */
export const categoryIcons: Record<string, LucideIcon> = {
  Sparkles, Utensils, UtensilsCrossed, ChefHat, CookingPot, HandPlatter,
  Soup, Salad, Sandwich, Pizza, Beef, Drumstick, Ham, Fish, Egg, EggFried,
  Flame, Vegan, Carrot, Leaf, Wheat, Croissant, Bean, Nut,
  Cake, CakeSlice, Dessert, Cookie, Donut, IceCreamCone, IceCreamBowl,
  Candy, Lollipop, Popcorn,
  Coffee, CupSoda, GlassWater, Milk, Wine, Beer, Martini, Citrus,
  Apple, Cherry, Grape, Banana, Snowflake,
  ShoppingBag, Star, Heart,
};

/** Falls back to the generic mark for a key this build does not know. */
export function categoryIconFor(icon?: string): LucideIcon {
  return (icon && categoryIcons[icon]) || UtensilsCrossed;
}
