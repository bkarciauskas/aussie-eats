# Melbourne city browse

## What

Home city picker → “Browse Melbourne restaurants” filters the directory to Melbourne venues only (`city=melbourne`).

## Reach

Home `/` → click **Melbourne** → click **Browse Melbourne restaurants** → `/restaurants?city=melbourne`.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs melbourne-city-browse
```

Manual equivalent:

1. Open `/`
2. Click the **Melbourne** city button (wait until enabled)
3. Click **Browse Melbourne restaurants**
4. Confirm URL contains `city=melbourne`
5. Confirm list shows Fitzroy / Carlton / South Yarra venues and not Harbour Burger Co

## Proof

- URL includes `city=melbourne`
- Exactly the three Melbourne seed restaurants appear as `a.restaurant-row`
- Harbour Burger Co is absent from the list
