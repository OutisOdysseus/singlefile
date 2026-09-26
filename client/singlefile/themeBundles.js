import themeCss from './themeCssMap.js';

export function getThemeBundle(renderer = 'V3', theme = '5ePHB') {
	const r = (renderer === 'legacy' || renderer === 'Legacy') ? 'Legacy' : 'V3';
	let styles = [];
	let snippets = [];

	if (r === 'Legacy') {
		const css = themeCss['Legacy_5ePHB'] || '';
		styles = [css];
		snippets = ['Legacy_5ePHB'];
	} else {
		const blankCss   = themeCss['V3_Blank'] || '';
		const phbCss     = themeCss['V3_5ePHB'] || '';
		const dmgCss     = themeCss['V3_5eDMG'] || '';
		const journalCss = themeCss['V3_Journal'] || '';
		const uaCss      = themeCss['V3_UnearthedArcana'] || '';

		if (theme === '5eDMG') {
			styles   = [blankCss, phbCss, dmgCss];
			snippets = ['V3_Blank', 'V3_5ePHB', 'V3_5eDMG'];
		} else if (theme === 'Journal') {
			styles   = [blankCss, journalCss];
			snippets = ['V3_Blank', 'V3_5ePHB', 'V3_Journal'];
		} else if (theme === 'UnearthedArcana') {
			styles   = [blankCss, uaCss];
			snippets = ['V3_Blank'];
		} else if (theme === 'Blank') {
			styles   = [blankCss];
			snippets = ['V3_Blank'];
		} else {
			// Default 5ePHB
			styles   = [blankCss, phbCss];
			snippets = ['V3_Blank', 'V3_5ePHB'];
		}
	}

	const joinedStyles = styles.map((s)=>`<style>${s}</style>`).join('\n\n');

	return {
		name     : theme,
		renderer : r,
		styles,
		snippets,
		joinedStyles
	};
};
