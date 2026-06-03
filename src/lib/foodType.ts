/** Maps DB food_type to DOM filter attribute (veg | nonveg). */
export function dishDataType(foodType: string): "veg" | "nonveg" {
  if (foodType === "non_veg") return "nonveg";
  return "veg";
}
