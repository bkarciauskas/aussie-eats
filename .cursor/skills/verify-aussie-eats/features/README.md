# AussieEats feature map

Verification recipes from the user's point of view. Each file is a complete proof path for one feature.

| Feature | File | Surface |
| --- | --- | --- |
| Home hero search | [home-hero-search.md](./home-hero-search.md) | Storefront `/` → `/restaurants?q=…` |
| Browse restaurants | [browse-restaurants.md](./browse-restaurants.md) | Storefront `/restaurants` |
| Customer login | [customer-login.md](./customer-login.md) | Storefront `/login` |
| Place order | [place-order.md](./place-order.md) | Cart → checkout → `/orders` |
| Admin login + dashboard | [admin-login.md](./admin-login.md) | `/admin/login` → `/admin` |

Start with the feature that matches the change under test. `home-hero-search` is the default smoke proof for storefront search wiring.
