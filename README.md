# Fatigue Ground Balls

Canvas-ready Chapter 6 fatigue practice widgets that deploy as one static GitHub Pages site.

The package includes:

- `index.html`: activity landing page.
- `fluctuating-stress.html`: alternating and mean stress components.
- `criterion-playground.html`: Goodman, Gerber, and Soderberg factor-of-safety practice with four toggleable failure boundaries.
- `finite-life-sn.html`: finite-life S-N calculations after conversion to equivalent reversed stress.
- `.github/workflows/deploy-pages.yml`: automatic GitHub Pages deployment.
- `CANVAS_IFRAME_*.html`: individual Canvas iframe snippets.
- `CANVAS_IFRAMES.html`: all three Canvas snippets in one file.

Each activity provides three attempts. Equations appear when attempt three opens, and the worked solution appears after a correct response or the final check.

## Files To Upload To GitHub

Upload the complete contents of this folder to the repository root, including:

- `.github/workflows/deploy-pages.yml`
- `.gitignore`
- `.nojekyll`
- every `.html`, `.js`, and `.css` file

Do not upload the outer `fatigue-ground-balls` folder as a nested directory. The repository root should contain `index.html`.

## Deploy With GitHub Pages

1. Create a new public GitHub repository named `fatigue-ground-balls`.
2. Upload every file and folder from this package to the repository root.
3. Commit the files to the `main` branch.
4. Open the repository's **Settings > Pages**.
5. Under **Build and deployment**, select **GitHub Actions** as the source.
6. Wait for the `Deploy static site to GitHub Pages` workflow to finish.

The published landing page will be:

```text
https://YOUR-GITHUB-USERNAME.github.io/fatigue-ground-balls/
```

Individual activity URLs will be:

```text
https://YOUR-GITHUB-USERNAME.github.io/fatigue-ground-balls/fluctuating-stress.html
https://YOUR-GITHUB-USERNAME.github.io/fatigue-ground-balls/criterion-playground.html
https://YOUR-GITHUB-USERNAME.github.io/fatigue-ground-balls/finite-life-sn.html
```

Every push to `main` will automatically republish the site.

## Embed In Canvas

1. Confirm the desired GitHub Pages activity URL opens normally.
2. Open a Canvas Page and switch to the HTML editor.
3. Open the matching `CANVAS_IFRAME_*.html` file.
4. Replace `YOUR-GITHUB-USERNAME`.
5. Paste the iframe into Canvas and save.

Use:

- `CANVAS_IFRAME_FLUCTUATING_STRESS.html`
- `CANVAS_IFRAME_CRITERION_PLAYGROUND.html`
- `CANVAS_IFRAME_FINITE_LIFE_SN.html`

If Canvas removes iframe elements or blocks `github.io`, add the activity URL as an External URL module item and enable **Load in a new tab**.

## Local Preview

From this folder:

```bash
python3 -m http.server 8767
```

Then open:

```text
http://127.0.0.1:8767/
```
