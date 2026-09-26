import fs from 'fs-extra';
import path from 'path';
import less from 'less';
import babel from '@babel/core';
import babelConfig from '../babel.config.json' with { type: 'json' };
import Proj from './project.json' with { type: 'json' };
import vitreum from 'vitreum';
const { pack } = vitreum;
import lessTransform from 'vitreum/transforms/less.js';
import assetTransform from 'vitreum/transforms/asset.js';

console.log('--- Starting Standalone Single-File Build for The Homebrewery ---');

// MIME types mapping
const MIME_TYPES = {
	'.woff2': 'font/woff2',
	'.woff' : 'font/woff',
	'.otf'  : 'font/otf',
	'.ttf'  : 'font/ttf',
	'.png'  : 'image/png',
	'.jpg'  : 'image/jpeg',
	'.jpeg' : 'image/jpeg',
	'.webp' : 'image/webp',
	'.svg'  : 'image/svg+xml',
	'.ico'  : 'image/x-icon'
};

const assetMap = new Map();

function collectAssets(dir, basePrefix = '') {
	if (!fs.existsSync(dir)) return;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collectAssets(fullPath, `${basePrefix}/${entry.name}`);
		} else {
			const ext = path.extname(entry.name).toLowerCase();
			if (MIME_TYPES[ext]) {
				const buffer = fs.readFileSync(fullPath);
				const base64 = buffer.toString('base64');
				const dataUri = `data:${MIME_TYPES[ext]};base64,${base64}`;

				// Store normalized path variations
				const relPath = `${basePrefix}/${entry.name}`;
				assetMap.set(relPath, dataUri);
				assetMap.set(relPath.replace(/^\//, ''), dataUri);
				assetMap.set(entry.name, dataUri);
				assetMap.set(encodeURI(relPath), dataUri);
				assetMap.set(encodeURI(entry.name), dataUri);
			}
		}
	}
}

console.log('1. Indexing fonts and asset files into base64 data URIs...');
collectAssets('./themes/fonts', '/fonts');
collectAssets('./themes/assets', '/assets');
collectAssets('./client/icons', '/icons');

console.log(`Indexed ${assetMap.size} asset paths.`);

function inlineAssetUrls(css) {
	if (!css) return '';
	return css.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, (match, quote, url)=>{
		const cleanUrl = url.trim().replace(/^['"]|['"]$/g, '');
		if (cleanUrl.startsWith('data:')) return match;

		// Try different path resolutions
		const possibleKeys = [
			cleanUrl,
			cleanUrl.replace(/^(\.\.\/)+/, '/'),
			cleanUrl.replace(/^\.\//, '/'),
			cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`,
			path.basename(cleanUrl),
			decodeURIComponent(cleanUrl),
			decodeURIComponent(cleanUrl).replace(/^(\.\.\/)+/, '/')
		];

		for (const key of possibleKeys) {
			if (assetMap.has(key)) {
				return `url("${assetMap.get(key)}")`;
			}
		}

		return match;
	});
}

async function compileLess(filePath, options = {}) {
	if (!fs.existsSync(filePath)) return '';
	const content = fs.readFileSync(filePath, 'utf8');
	const output = await less.render(content, {
		filename: filePath,
		paths: ['./themes', './themes/fonts', './themes/assets', './shared', './client', './node_modules'],
		compress: true,
		...options
	});
	return inlineAssetUrls(output.css);
}

(async ()=>{
	console.log('2. Compiling Theme Stylesheets...');

	// Ensure themes.json exists
	const themes = { Legacy: {}, V3: {} };
	let themeFiles = fs.readdirSync('./themes/Legacy');
	for (const dir of themeFiles) {
		const themeData = JSON.parse(fs.readFileSync(`./themes/Legacy/${dir}/settings.json`).toString());
		themeData.path = dir;
		themes.Legacy[dir] = themeData;
	}
	themeFiles = fs.readdirSync('./themes/V3');
	for (const dir of themeFiles) {
		const themeData = JSON.parse(fs.readFileSync(`./themes/V3/${dir}/settings.json`).toString());
		themeData.path = dir;
		themes.V3[dir] = themeData;
	}
	await fs.outputFile('./themes/themes.json', JSON.stringify(themes, null, 2));

	// Compile each theme
	const themeCssMap = {};
	themeCssMap['V3_Blank']           = await compileLess('./themes/V3/Blank/style.less');
	themeCssMap['V3_5ePHB']           = await compileLess('./themes/V3/5ePHB/style.less');
	themeCssMap['V3_5eDMG']           = await compileLess('./themes/V3/5eDMG/style.less');
	themeCssMap['V3_Journal']         = await compileLess('./themes/V3/Journal/style.less');
	themeCssMap['V3_UnearthedArcana'] = await compileLess('./themes/V3/UnearthedArcana/style.less');
	themeCssMap['Legacy_5ePHB']       = await compileLess('./themes/Legacy/5ePHB/style.less');

	// Write themeCssMap.js
	const themeCssMapContent = `export default ${JSON.stringify(themeCssMap, null, 2)};\n`;
	await fs.outputFile('./client/singlefile/themeCssMap.js', themeCssMapContent);

	console.log('3. Compiling Font & Icon Stylesheets...');
	const fonts5eCss         = await compileLess('./themes/fonts/5e/fonts.less');
	const fontsLegacyCss     = await compileLess('./themes/fonts/5e legacy/fonts.less');
	const fontsBlankCss      = await compileLess('./themes/fonts/Blank/fonts.less');
	const fontsJournalCss    = await compileLess('./themes/fonts/Journal/fonts.less');
	const fontAwesomeCss     = await compileLess('./themes/fonts/iconFonts/fontAwesome.less');
	const diceFontCss        = await compileLess('./themes/fonts/iconFonts/diceFont.less');
	const elderberryInnCss   = await compileLess('./themes/fonts/iconFonts/elderberryInn.less');
	const gameIconsCss       = await compileLess('./themes/fonts/iconFonts/gameIcons.less');

	const allFontsAndIconsCss = [
		fonts5eCss,
		fontsLegacyCss,
		fontsBlankCss,
		fontsJournalCss,
		fontAwesomeCss,
		diceFontCss,
		elderberryInnCss,
		gameIconsCss
	].join('\n\n');

	console.log('4. Compiling CodeMirror Themes...');
	const editorThemesDir = './themes/codeMirror/customThemes';
	let editorThemesCss = '';
	if (fs.existsSync(editorThemesDir)) {
		const files = fs.readdirSync(editorThemesDir);
		for (const f of files) {
			if (f.endsWith('.css') || f.endsWith('.less')) {
				const full = path.join(editorThemesDir, f);
				const css = await compileLess(full);
				editorThemesCss += `\n/* CodeMirror Theme: ${f} */\n${css}\n`;
			}
		}
	}

	const nmCmThemesDir = './node_modules/codemirror/theme';
	if (fs.existsSync(nmCmThemesDir)) {
		const files = fs.readdirSync(nmCmThemesDir);
		for (const f of files) {
			if (f.endsWith('.css')) {
				const full = path.join(nmCmThemesDir, f);
				const raw = fs.readFileSync(full, 'utf8');
				editorThemesCss += `\n/* CM Theme: ${f} */\n${raw}\n`;
			}
		}
	}

	// Update CodeMirror editorThemes.json
	const customThemes = fs.existsSync(editorThemesDir) ? fs.readdirSync(editorThemesDir) : [];
	const nmThemes = fs.existsSync(nmCmThemesDir) ? fs.readdirSync(nmCmThemesDir) : [];
	const allThemeFiles = [...nmThemes, ...customThemes];
	const editorThemesList = ['default', ...allThemeFiles.filter((f)=>f.endsWith('.css')).map((f)=>f.slice(0, -4))];
	await fs.outputFile('./themes/codeMirror/editorThemes.json', JSON.stringify(editorThemesList, null, 2));

	console.log('5. Bundling Standalone React Application with Vitreum...');
	const babelify = async (code)=>(await babel.transformAsync(code, babelConfig)).code;
	const transforms = {
		'.js'   : (code, filename, opts)=>babelify(code),
		'.jsx'  : (code, filename, opts)=>babelify(code),
		'.less' : lessTransform,
		'*'     : assetTransform('./build')
	};

	const bundles = await pack('./client/singlefile/standalone.jsx', {
		paths : ['./shared', './'],
		libs  : Proj.libs,
		dev   : false,
		transforms
	});

	let bundleCss = await lessTransform.generate({ paths: ['./shared', './client', './'] });
	bundleCss = inlineAssetUrls(bundleCss);

	let bundleJs = bundles.bundle;

	// In single-file mode without server hydration, replace hydrateRoot with createRoot.render
	bundleJs = bundleJs.replace(
		/require\(['"]react-dom\/client['"]\)\.hydrateRoot\(target,\s*require\(['"]react['"]\)\.createElement\(__entrypoint__,\s*props\)\)/g,
		"require('react-dom/client').createRoot(target).render(require('react').createElement((__entrypoint__.default || __entrypoint__), props))"
	);

	console.log('6. Assembling Standalone Offline HTML File...');

	const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1, height=device-height, interactive-widget=resizes-visual">
	<title>The Homebrewery (Standalone Offline Edition)</title>
	<meta name="description" content="Standalone single-file offline edition of The Homebrewery. Create authentic looking D&D homebrews with Markdown.">
	<script>
		// Safe storage polyfill for file:// origin restrictions
		(function() {
			var memStore = {};
			var storageObj = {
				getItem: function(k) { return memStore.hasOwnProperty(k) ? memStore[k] : null; },
				setItem: function(k, v) { memStore[k] = String(v); },
				removeItem: function(k) { delete memStore[k]; },
				clear: function() { memStore = {}; }
			};

			var storageAvailable = false;
			try {
				if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage !== null) {
					var testKey = '__hb_test_storage__';
					window.localStorage.setItem(testKey, '1');
					window.localStorage.removeItem(testKey);
					storageAvailable = true;
				}
			} catch (e) {
				storageAvailable = false;
			}

			if (!storageAvailable && typeof window !== 'undefined') {
				try {
					Object.defineProperty(window, 'localStorage', {
						value: storageObj,
						configurable: true,
						writable: true,
						enumerable: true
					});
				} catch (e2) {
					try {
						window.localStorage = storageObj;
					} catch(e3) {}
				}
				try {
					Object.defineProperty(globalThis, 'localStorage', {
						value: storageObj,
						configurable: true,
						writable: true,
						enumerable: true
					});
				} catch (e4) {}
			}
		})();
	</script>
	<style id="hb-embedded-fonts">
${allFontsAndIconsCss}
	</style>
	<style id="hb-codemirror-themes">
${editorThemesCss}
	</style>
	<style id="hb-bundle-styles">
${bundleCss}
	</style>
</head>
<body>
	<main id="reactRoot"></main>
	<script>
${bundleJs}
	</script>
	<script>
		document.addEventListener('DOMContentLoaded', function() {
			if (typeof start_app === 'function') {
				start_app({}, document.getElementById('reactRoot'));
			}
		});
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			if (typeof start_app === 'function') {
				start_app({}, document.getElementById('reactRoot'));
			}
		}
	</script>
</body>
</html>`;

	await fs.outputFile('./index.html', htmlContent);
	await fs.outputFile('./homebrewery.html', htmlContent);

	const stats = fs.statSync('./homebrewery.html');
	const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

	console.log(`\n======================================================`);
	console.log(`SUCCESS: Single-file offline build complete!`);
	console.log(`Output files:`);
	console.log(`  - /homebrewery.html (${sizeMB} MB)`);
	console.log(`  - /index.html (${sizeMB} MB)`);
	console.log(`======================================================\n`);
})().catch((err)=>{
	console.error('Build failed with error:', err);
	process.exit(1);
});
