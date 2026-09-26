export const WELCOME_BREW_TEXT = `\`\`\`css
/* You can add custom styling for this brew in the Style Editor tab! */
.page {
	padding-bottom : 1.1cm;
}
\`\`\`

# The Homebrewery (Standalone Offline Edition)
Welcome traveler! You are using the **Single-File Offline Build** of The Homebrewery. Everything you need to create, format, preview, and print authentic D&D 5e documents is bundled inside this single file—**no server or internet connection required!**

### Features of the Standalone Build
- **100% Offline & Portable:** Double-click this HTML file in any browser or file manager (\`file://\` protocol) to start brewing.
- **Local Vault Storage:** Your brews are saved automatically to your browser's local storage.
- **Full Theme Support:** Switch between **5e PHB**, **5e DMG**, **Blank**, **Journal**, and **Unearthed Arcana** themes seamlessly.
- **Snippet Generator:** Use the top snippet bar to insert monster stat blocks, spell cards, tables, class features, and page layouts with one click.
- **Import & Export:** Export your brews as standalone HTML files, raw Markdown files (\`.txt\`), or JSON backups, and import them anytime.
- **Print to PDF:** Click **Print** in the top navigation bar to generate clean, print-ready PDF files.

{{note
##### PDF Printing Tips
To save your brew as a PDF:
1. Click **Print** in the top navbar (or press **Ctrl+P** / **Cmd+P**).
2. Set the destination to **Save as PDF**.
3. In printer settings / options, ensure **Background graphics** is checked.
4. Set Margins to **None** or **Default**.
}}

\\column

### Sample Monster Stat Block
Here is an example of a V3 monster stat block generated with built-in snippets:

{{monster,frame,wide
## Cave Drake
*Large dragon, unaligned*
___
**Armor Class** :: 16 (natural armor)
**Hit Points**  :: 110 (13d10 + 39)
**Speed**       :: 40 ft., burrow 20 ft., fly 60 ft.
___
|  STR  |  DEX  |  CON  |  INT  |  WIS  |  CHA  |
|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
|19 (+4)|12 (+1)|17 (+3)| 6 (-2)|12 (+1)| 8 (-1)|
___
**Damage Resistances** :: acid, fire
**Senses**             :: darkvision 120 ft., passive Perception 11
**Languages**          :: Draconic
**Challenge**          :: 5 (1,800 XP)
___
***Keen Smell.*** The drake has advantage on Wisdom (Perception) checks that rely on smell.

***Pack Tactics.*** The drake has advantage on an attack roll against a creature if at least one of the drake's allies is within 5 ft.

### Actions
***Multiattack.*** The drake makes two attacks: one with its bite and one with its tail.

***Bite.*** *Melee Weapon Attack:* +7 to hit, reach 10 ft., one target. *Hit:* 15 (2d10 + 4) piercing damage.

***Tail.*** *Melee Weapon Attack:* +7 to hit, reach 10 ft., one target. *Hit:* 13 (2d8 + 4) bludgeoning damage.
}}

\\page

# Creating Multi-Page Documents

To create a new page, simply insert \`\\page\` on a line by itself. To break into a second column on the same page, insert \`\\column\`!

### Markdown & V3 Enhancements

The Homebrewery V3 renderer includes powerful Markdown extensions:

- **Definition Lists:** Use \`Term :: Definition\` to create clean aligned definition pairs.
- **Injectors:** Add custom classes and CSS variables directly using \`{class,style}\` syntax.
- **Div / Span Blocks:** Wrap content in \`{{\` and \`}}\` to create custom layout blocks.
- **Subscript & Superscript:** Wrap text in \`^superscript^\` or \`^^subscript^^\`.

### Class Table Example

{{classTable,frame
##### The Spellblade
| Level | Proficiency Bonus | Features | Cantrips Known | Spells Known | 1st | 2nd | 3rd |
|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 1st | +2 | Arcane Strike, Spellcasting | 2 | 2 | 2 | — | — |
| 2nd | +2 | Blade Magic, Fighting Style | 2 | 3 | 3 | — | — |
| 3rd | +2 | Martial Archetype | 2 | 4 | 4 | 2 | — |
| 4th | +2 | Ability Score Improvement | 3 | 5 | 4 | 3 | — |
| 5th | +3 | Extra Attack | 3 | 6 | 4 | 3 | 2 |
}}

\\column

### Custom Styling in Single-File Mode
Click the **Style** tab above the editor to write custom CSS rules. Your styles will immediately apply to the preview pane!

{{descriptive
##### Getting Started
1. Click **New** in the top navigation bar to create a blank brew.
2. Open the **Vault** menu to switch between brews or manage backups.
3. Edit your content on the left, watch it render on the right, and enjoy brewing offline!
}}
`;

export const FAQ_TEXT = `# Frequently Asked Questions

### What is this single-file version?
This is a self-contained offline build of The Homebrewery. It packages all required fonts, icons, styling, scripts, and theme assets into a single HTML file that works offline without needing a server.

### Where are my brews saved?
Your brews are saved in your browser's \`localStorage\`. They persist across sessions on this device and browser. You can also export your brews to \`.html\`, \`.txt\`, or \`.json\` files at any time via the Vault modal.

### How do I print to PDF?
Click the **Print** button in the navigation bar (or press Ctrl+P / Cmd+P). In the print dialog, select "Save as PDF" and make sure "Background graphics" is enabled.
`;

export const CHANGELOG_TEXT = `# Standalone Offline Homebrewery Changelog

### Version 3.19.3 Standalone
- Single-file standalone HTML build with embedded base64 fonts, icons, and textures.
- Full offline support with LocalStorage Vault, instant auto-save, and multi-brew management.
- Complete theme support: 5e PHB, 5e DMG, Blank, Journal, Unearthed Arcana, Legacy 5e PHB.
- Built-in snippet library and CodeMirror syntax highlighting.
- One-click export to standalone HTML, Markdown (.txt), JSON, and PDF printing.
`;
