# EsseKZ brand colors

The source is the original image embedded in `public/logo.svg`. These RGB values
were sampled from its opaque interior, excluding transparent padding. Coordinates
refer to the original 1227 × 1282 image (x, y).

| Role                     | Color     | Sample      |
| ------------------------ | --------- | ----------- |
| Cyan                     | `#19B8E2` | (256, 290)  |
| Blue                     | `#007CAD` | (150, 584)  |
| Deep blue / text         | `#115073` | (102, 830)  |
| Gold                     | `#D6A335` | (122, 836)  |
| Light gold               | `#FFDF87` | (428, 366)  |
| Dark gold / text accents | `#774A0C` | (586, 1092) |
| White                    | `#FFFFFF` | (628, 190)  |
| Ice blue                 | `#E0F6FB` | (822, 250)  |

`src/styles.css` defines the palette in `:root`, with matching Tailwind theme
colors. Page backgrounds, borders, shadows and gradients use these colors or
explicit `color-mix()` tints with white/transparency. Keep layout, typography,
assets and application behavior independent of the palette.

White cards keep long text and forms readable; cyan frames hero/auth sections;
gold marks primary actions and ornaments; deep blue carries body text. The footer
uses a deep-blue-to-blue gradient with white text and light-gold details. Error
messages use dark gold on a pale gold background; success/information messages
use blue on pale blue. Existing text labels and icons preserve their meaning.

Contrast references: white on blue is 4.68:1; deep blue on light gold is 6.68:1;
dark gold on white is 7.58:1. Primary button gradients stay at the light end of
gold to retain dark-text contrast. Muted text uses 94% deep blue, so it also
contrasts with the auth panel's cyan tint. Input borders use 75% blue with white
(3.09:1 against white); focus outlines and checkbox accents use blue.
