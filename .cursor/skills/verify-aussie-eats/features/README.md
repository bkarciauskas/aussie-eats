# AussieEats feature map

Verification recipes from the user's point of view. Each file is a complete proof path for one feature. Keep the four H2s: **Sub-features**, **How to get to it (user POV)**, **Driving it with drive.mjs**, **Gotchas**.

| Feature | File | Surface |
| --- | --- | --- |
| Home hero search | [home-hero-search.md](./home-hero-search.md) | Storefront `/` → `/restaurants?q=…` |
| Search suggestions | [search-suggestions.md](./search-suggestions.md) | Hero typeahead + recent searches |
| Browse restaurants | [browse-restaurants.md](./browse-restaurants.md) | Storefront `/restaurants` |
| Location-based browse | [location-based-browse.md](./location-based-browse.md) | `/restaurants` geolocation → distance sort |
| Melbourne city browse | [melbourne-city-browse.md](./melbourne-city-browse.md) | Home city pin → `/restaurants?city=melbourne` |
| Customer login | [customer-login.md](./customer-login.md) | Storefront `/login` |
| Favourites | [favourites.md](./favourites.md) | Storefront `/restaurants` → `/favourites` |
| Place order | [place-order.md](./place-order.md) | Cart → checkout → `/orders/:id` |
| Wallet checkout | [wallet-checkout.md](./wallet-checkout.md) | Checkout wallet → `/orders/:id` |
| Guest checkout | [guest-checkout.md](./guest-checkout.md) | Anonymous cart → guest checkout → `/orders/:id` |
| Live order status | [live-order-status.md](./live-order-status.md) | `/orders/:id` poll + mock courier ETA |
| Admin login + dashboard | [admin-login.md](./admin-login.md) | `/admin/login` → `/admin` |
| Admin order status | [admin-order-status.md](./admin-order-status.md) | `/admin/orders` pending → preparing |
| Admin menu edit | [admin-menu-edit.md](./admin-menu-edit.md) | `/admin/restaurants/…/menu` price edit |
| Demo lab | [demo-lab.md](./demo-lab.md) | `/demo-admin` cart quantity-omit toggle |

Start with the feature that matches the change under test. `home-hero-search` is the default smoke proof for storefront search wiring.

**Not mapped yet.** Add when needed: `/signup`, cart-only, `/orders` list, standalone `/restaurants/[slug]` detail/menu coverage, post-delivery reviews, admin new/edit restaurant, diet/open-now filters.

## Core smoke

```bash
.cursor/skills/verify-aussie-eats/helpers/launch.sh
.cursor/skills/verify-aussie-eats/helpers/drive.mjs home-hero-search
.cursor/skills/verify-aussie-eats/helpers/drive.mjs browse-restaurants
.cursor/skills/verify-aussie-eats/helpers/drive.mjs customer-login
.cursor/skills/verify-aussie-eats/helpers/drive.mjs place-order
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-login
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-order-status
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-menu-edit
.cursor/skills/verify-aussie-eats/helpers/cleanup.sh
```
