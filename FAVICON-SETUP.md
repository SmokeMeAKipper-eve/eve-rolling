# Favicon Setup Instructions

## What I've created:
1. Added proper favicon HTML markup to `index.html`
2. Created `favicon.svg` - a simple wormhole-themed icon using your site's color scheme

## To complete the favicon setup:

### Option 1: Use online converter (Recommended)
1. Go to https://favicon.io/favicon-converter/
2. Upload the `favicon.svg` file
3. Download the generated favicon package
4. Extract and copy these files to your `src` folder:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`

### Option 2: Use ImageMagick (if installed)
```bash
# Convert SVG to different sizes
convert favicon.svg -resize 16x16 favicon-16x16.png
convert favicon.svg -resize 32x32 favicon-32x32.png
convert favicon.svg -resize 180x180 apple-touch-icon.png
convert favicon.svg favicon.ico
```

### Option 3: Simple fallback
If you just want something quick, you can:
1. Rename `favicon.svg` to `favicon.ico` (browsers will handle it)
2. Or use a simple emoji favicon by updating index.html:
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌀</text></svg>">
```

## Design Details:
The SVG favicon uses:
- Your site's dark theme colors (#0d1117 background)
- Blue accent color (#58a6ff) for the outer ring
- Green accent (#238636) for inner elements
- Represents a wormhole with concentric rings and sparkle effects
- Scales well from 16x16 to 180x180 pixels

## Test the favicon:
After adding the files, test by:
1. Opening your site in a browser
2. Looking at the browser tab for the icon
3. Bookmarking the page to see if the icon appears
4. Testing on mobile (add to home screen)