# ISEPS Tools Website

Website to host various tools for ISEPS game.

Technical requirements:

- SolidJS for frontend.
- Backend is not used, all tools are client-side.
- Hosted on GitHub Pages, auto-deploy via GitHub Actions on changes to main branch.
  - Actions should be able to build the project and push the built files to the `gh-pages` branch?
- Build with Vite.
- Kobalte and Tailwind for components and styling.

## Initial layout

- Different tabs on top (URL linkable)
- Calculations must support values above e308. Probably custom class with mantissa and exponent (should be fairly simple to implement).
  - The game itself shows precision of 2 decimals. Mantissa could be just standard JS decimal number. While exponent is integer.
  - Users give values as string like "1.23e456", which can be parsed into mantissa and exponent.
- Add some dummy tabs to test the calculations.
