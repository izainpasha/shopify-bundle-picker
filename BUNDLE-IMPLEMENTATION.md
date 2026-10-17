# Klone custom bundle

Preview (US market): https://klonescents.com/products/klone-scent-collection?view=custom-bundle&preview_theme_id=189444292829&country=US

Verified that `country=US` selects the US market in a fresh browser, the bundle loads with an enabled Add to cart button, and no bundle error appears. The store marks these variants unavailable in Pakistan; this preview link lets the user review the working US offer without changing the store's market settings.

Unpublished theme: **Klone | Custom bundle preview** (`189444292829`). The live theme (`162960605405`) and product template assignment are unchanged.

## Implementation

- `theme/templates/product.custom-bundle.json`: copy of the current product template with the custom bundle block inserted before the native buy buttons.
- `theme/sections/main-product.liquid`: registers and renders the `klone_bundle_picker` block.
- `theme/snippets/klone-bundle-picker.liquid`: offer cards, gift panel, subtotal and accessible scent dialog. Client document supplies the eight scent descriptions. The `Smoke Vanilla` display name maps to the existing `Smoke Vanila` product variant.
- `theme/assets/klone-bundle-picker.js`: preserves selections across offers, synchronizes with Kaching, and uses Kaching-generated cart items and gift properties. Shopify/Kaching remains responsible for discounts and shipping rules.
- `theme/assets/klone-bundle-picker.css`: scoped styles for desktop and mobile.
- Scent rows use inline SVG chevrons; free shipping uses a truck SVG in the brand accent color.
- `theme/assets/bundle-*.webp`: optimized versions of each SKU's numbered `IMAGE 1.png`. Source mapping is in `bundle-image-sources.json`; original PNGs are retained outside the theme under `.browser-tools/source-images`.

The picker uses variants of **Klone Scent Collection**, rather than similarly named standalone products, because the existing Kaching deal applies to that collection product. It reads current offer IDs and totals from the installed app instead of creating a new discount configuration. The native widget and form remain mounted but hidden from interaction and assistive technology after the custom picker connects.

## Verified

In an isolated browser cart, all offers returned the expected Shopify cart totals:

| Bottles | Total | Product gifts |
| --- | --- | --- |
| 1 | $39.99 | None |
| 3 | $79.99 | None; existing free-shipping benefit retained |
| 5 | $119.99 | Discovery set and $15 gift card, both at $0 |

Mixed scents and repeated scents matched the cart variants and quantities. All eight scent choices mapped to the expected collection variants, including Smoke Vanilla. Mobile width, modal opening, Escape closing, focus restoration, retained choices, locked gift states, duplicate-click prevention and a simulated Shopify cart rejection passed. The cart pricing checks used the US market. The test cart was emptied after verification; no orders were placed. Shipping-rate calculation and gift-card issuance after purchase were not tested.

JavaScript syntax validation passed. Theme Check reports pre-existing issues throughout the downloaded theme; the new snippet has no error-level findings. Browser checks are in `.browser-tools/verify-bundle.cjs`, with cart results in `.browser-tools/bundle-verification.json`.

## Review and release

The preview URL uses `view=custom-bundle` to render the new template without changing the live product's assignment. Review this preview before publishing or assigning the template. This change depends on the installed Kaching Bundles app and its current component methods, events and dropdown markup; recheck selection and cart totals after an app upgrade.

The single-bottle offer has no gift banner, matching the recorded reference. The middle offer unlocks free shipping; the largest unlocks all three benefits. The gift panel remains visible at every tier.

## Revision 2026-10-16 (client Loom "Product Page Updates and Font Adjustments")

Matched Penrose sizing: offer titles 16px, badges 10px, scent rows 13.5px/11px, subtotal amount 20px. Scent number box now sits outside the row card (60px wide). Savings pill reads "You're saving $X" with a tag icon. Add to cart is two lines with the 30-Day Money-Back Guarantee inside the button. Middle offer banner is "+ 1 FREE GIFT"; locked gifts show a lock overlay; gift labels are Title Case; gift message copy is "Choose 1 more bottle…". Dialog copy is black, "Smells like" names are bold, card text gap is 1px, Rouge Atlantic / Imagine This / Royal Aventus carry a Best Seller tag, a check circle replaces "Select scent +", selection holds 450ms before closing, and a "Scroll for more scents" hint fades out at the end of the list.

Client-editable values: `assets/klone-bundle-picker.css` (search `.kb__choice-copy{` for the card text gap) and `assets/klone-bundle-picker.js` (search `450` for the selection delay). `verify-bundle.cjs` and `verify-edge-cases.cjs` pass after this revision.
