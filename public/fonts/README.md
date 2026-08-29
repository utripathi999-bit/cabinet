# Swapping in your own fonts

The site ships with three free Google Fonts as placeholders so it looks
finished immediately:

| Role                                  | CSS variable         | Placeholder font |
| -------------------------------------- | --------------------- | ----------------- |
| Display (the big topic title)          | `--font-display`       | Playfair Display   |
| Label (call number, tags, meta)        | `--font-label`         | Space Grotesk      |
| Body (the paragraph, source titles)    | `--font-body`          | Manrope            |

To use your own paid fonts instead:

1. Drop the font files in this folder (`public/fonts/`) as `.woff2` — e.g.
   `public/fonts/MyDisplayFont-Regular.woff2`.

2. Open `src/app/globals.css` and add `@font-face` rules near the top,
   above `:root`, one per weight/style you have. For example:

   ```css
   @font-face {
     font-family: "My Display Font";
     src: url("/fonts/MyDisplayFont-Regular.woff2") format("woff2");
     font-weight: 400;
     font-style: normal;
     font-display: swap;
   }
   ```

3. In the same file, update the token that role points to — for example,
   for the display face:

   ```css
   --font-display: "My Display Font", Georgia, serif;
   ```

   Leave the Georgia/serif fallback in place so the page still looks right
   for the split second before the font loads.

4. You can delete the corresponding `next/font/google` import in
   `src/app/layout.tsx` once you've fully replaced a role, but it's safe to
   leave it — it just won't be referenced anymore.

Nothing else in the codebase reads font names directly, so this is the
only file you need to touch.
