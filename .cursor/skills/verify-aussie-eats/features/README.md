# AussieEats feature map

Verification recipes from the user's point of view. Each file is a complete proof path for one feature.

| Feature | File | Surface |
| --- | --- | --- |
| Home hero search | [home-hero-search.md](./home-hero-search.md) | Storefront `/` → `/restaurants?q=…` |
| Search suggestions | [search-suggestions.md](./search-suggestions.md) | Storefront hero/header typeahead + recent searches |
| Browse restaurants | [browse-restaurants.md](./browse-restaurants.md) | Storefront `/restaurants` |
| Melbourne city browse | [melbourne-city-browse.md](./melbourne-city-browse.md) | Home city pin → `/restaurants?city=melbourne` |
| Customer login | [customer-login.md](./customer-login.md) | Storefront `/login` |
| Favourites | [favourites.md](./favourites.md) | Storefront `/restaurants` → `/favourites` |
| Place order | [place-order.md](./place-order.md) | Cart → checkout → `/orders` |
| Admin login + dashboard | [admin-login.md](./admin-login.md) | `/admin/login` → `/admin` |
| Admin order status | [admin-order-status.md](./admin-order-status.md) | `/admin/orders` pending → preparing |
| Admin menu edit | [admin-menu-edit.md](./admin-menu-edit.md) | `/admin/restaurants/…/menu` price edit |

Start with the feature that matches the change under test. `home-hero-search` is the default smoke proof for storefront search wiring.

## APJ-20 core smoke

```bash
.cursor/skills/verify-aussie-eats/helpers/launch.sh
.cursor/skills/verify-aussie-eats/helpers/drive.mjs browse-restaurants
.cursor/skills/verify-aussie-eats/helpers/drive.mjs customer-login
.cursor/skills/verify-aussie-eats/helpers/drive.mjs place-order
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-order-status
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-menu-edit
.cursor/skills/verify-aussie-eats/helpers/cleanup.sh
```
