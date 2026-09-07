// Seed data for the menu, copied verbatim from backend/data/menu.json so a
// fresh Redis instance on first deploy has the same default menu the repo
// has always shipped. The admin can still POST/PATCH/DELETE items through
// the API; whatever ends up in Redis wins from then on.

module.exports = [
  {
    "id": 1,
    "name": "Classic Smash Burger",
    "description": "Two beef patties, American cheese, pickles, onions, and our signature sauce on a toasted brioche bun.",
    "price": 8.99,
    "category": "Burgers",
    "tags": ["beef", "cheese", "popular"]
  },
  {
    "id": 2,
    "name": "Spicy Chicken Sandwich",
    "description": "Crispy buttermilk chicken tossed in Nashville hot sauce, with slaw and pickles on a soft potato bun.",
    "price": 9.49,
    "category": "Burgers",
    "tags": ["chicken", "spicy"]
  },
  {
    "id": 3,
    "name": "Veggie Stack",
    "description": "Black-bean patty, melted pepper jack, avocado, lettuce, tomato, and chipotle mayo.",
    "price": 8.49,
    "category": "Burgers",
    "tags": ["vegetarian"]
  },
  {
    "id": 4,
    "name": "Loaded Fries",
    "description": "Crispy fries topped with cheddar, bacon bits, scallions, and ranch drizzle.",
    "price": 4.99,
    "category": "Sides",
    "tags": ["bacon", "shareable"]
  },
  {
    "id": 5,
    "name": "Onion Rings",
    "description": "Beer-battered, golden, served with chipotle dipping sauce.",
    "price": 3.99,
    "category": "Sides",
    "tags": ["vegetarian"]
  },
  {
    "id": 6,
    "name": "Mac Bites",
    "description": "Deep-fried mac and cheese cubes with a crunchy panko crust.",
    "price": 4.49,
    "category": "Sides",
    "tags": ["vegetarian", "shareable"]
  },
  {
    "id": 7,
    "name": "Lemonade",
    "description": "Fresh-squeezed lemonade, lightly sweet, served over ice.",
    "price": 2.99,
    "category": "Drinks",
    "tags": ["cold", "refreshing"]
  },
  {
    "id": 8,
    "name": "Iced Coffee",
    "description": "Cold-brew coffee with a splash of cream and your choice of sugar.",
    "price": 3.49,
    "category": "Drinks",
    "tags": ["caffeine", "cold"]
  },
  {
    "id": 9,
    "name": "Chocolate Shake",
    "description": "Thick chocolate milkshake topped with whipped cream and a chocolate drizzle.",
    "price": 4.99,
    "category": "Desserts",
    "tags": ["sweet", "shareable"]
  },
  {
    "id": 10,
    "name": "Apple Pie Bites",
    "description": "Cinnamon-spiced apple filling wrapped in golden puff pastry, dusted with sugar.",
    "price": 3.99,
    "category": "Desserts",
    "tags": ["vegetarian", "sweet"]
  }
];
