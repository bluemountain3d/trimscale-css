# Styleguide

A Vite dev app lives in `styleguide/` for visual development and testing.

```bash
cd styleguide
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
```

The styleguide sets `loadPaths` to `../styles`, so SCSS imports work the same way as in any consuming project:

```scss
@use 'trimscale';
```
