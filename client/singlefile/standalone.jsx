/* eslint-disable max-lines */
import './standalone.less';

import React, { useState, useEffect, useRef } from 'react';
import Markdown                               from 'naturalcrit/markdown.js';
import _                                      from 'lodash';

import SplitPane    from 'client/components/splitPane/splitPane.jsx';
import Editor       from '../homebrew/editor/editor.jsx';
import BrewRenderer from '../homebrew/brewRenderer/brewRenderer.jsx';

import { DEFAULT_BREW }               from '../../server/brewDefaults.js';
import { getThemeBundle }             from './themeBundles.js';
import { WELCOME_BREW_TEXT, FAQ_TEXT, CHANGELOG_TEXT } from './staticTexts.js';

const STORAGE_KEY_BREWS    = 'HOMEBREWERY_STANDALONE_BREWS_V1';
const STORAGE_KEY_ACTIVE   = 'HOMEBREWERY_STANDALONE_ACTIVE_ID';
const AUTOSAVE_DELAY_MS    = 1500;

global.version       = '3.19.3-singlefile';
global.enable_v3     = true;
global.enable_themes = true;
global.config        = global.config || { deployment: false };
global.account       = global.account || null;

// Fallback in-memory storage if localStorage is blocked on file://
const memoryStorage = {};
const safeStorage = {
	getItem : (key)=>{
		try {
			return window.localStorage?.getItem(key) ?? memoryStorage[key] ?? null;
		} catch (e) {
			return memoryStorage[key] ?? null;
		}
	},
	setItem : (key, val)=>{
		try {
			window.localStorage?.setItem(key, val);
		} catch (e) {
			// ignore or memory fallback
		}
		memoryStorage[key] = val;
	},
	removeItem : (key)=>{
		try {
			window.localStorage?.removeItem(key);
		} catch (e) {
			// ignore
		}
		delete memoryStorage[key];
	}
};

const createInitialVault = ()=>{
	const initialBrew = {
		...DEFAULT_BREW,
		id          : 'brew-welcome',
		title       : 'Welcome to Standalone Homebrewery',
		text        : WELCOME_BREW_TEXT,
		style       : '.page {\n\tpadding-bottom : 1.1cm;\n}',
		snippets    : '',
		renderer    : 'V3',
		theme       : '5ePHB',
		description : 'Single-file offline starter document for The Homebrewery.',
		createdAt   : new Date().toISOString(),
		updatedAt   : new Date().toISOString()
	};

	return [initialBrew];
};

const StandaloneApp = ()=>{
	const [vaultBrews, setVaultBrews]               = useState([]);
	const [activeId, setActiveId]                   = useState('brew-welcome');
	const [currentBrew, setCurrentBrew]             = useState({ ...DEFAULT_BREW, text: WELCOME_BREW_TEXT });
	const [themeBundle, setThemeBundle]             = useState(getThemeBundle('V3', '5ePHB'));
	const [saveStatus, setSaveStatus]               = useState('saved'); // 'saved', 'saving', 'unsaved'
	const [toast, setToast]                         = useState(null);
	const [vaultModalOpen, setVaultModalOpen]       = useState(false);
	const [helpModalOpen, setHelpModalOpen]         = useState(false);
	const [exportModalOpen, setExportModalOpen]     = useState(false);
	const [HTMLErrors, setHTMLErrors]               = useState([]);

	const [currentEditorViewPageNum, setCurrentEditorViewPageNum]     = useState(1);
	const [currentEditorCursorPageNum, setCurrentEditorCursorPageNum] = useState(1);
	const [currentBrewRendererPageNum, setCurrentBrewRendererPageNum] = useState(1);

	const editorRef      = useRef(null);
	const autoSaveTimer  = useRef(null);
	const fileInputRef   = useRef(null);

	// Load vault on initialization
	useEffect(()=>{
		let brews = [];
		try {
			const stored = safeStorage.getItem(STORAGE_KEY_BREWS);
			if (stored) {
				brews = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed reading brews from storage:', e);
		}

		if (!brews || !brews.length) {
			brews = createInitialVault();
			safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(brews));
		}

		let active = safeStorage.getItem(STORAGE_KEY_ACTIVE);
		if (!active || !brews.some((b)=>b.id === active)) {
			active = brews[0].id;
			safeStorage.setItem(STORAGE_KEY_ACTIVE, active);
		}

		const current = brews.find((b)=>b.id === active) || brews[0];

		setVaultBrews(brews);
		setActiveId(active);
		setCurrentBrew(current);
		setThemeBundle(getThemeBundle(current.renderer || 'V3', current.theme || '5ePHB'));
		setHTMLErrors(Markdown.validate(current.text || ''));

		// Setup keyboard shortcuts (Ctrl+S, Ctrl+P)
		const handleKeyDown = (e)=>{
			if (!(e.ctrlKey || e.metaKey)) return;
			if (e.key === 's' || e.keyCode === 83) {
				e.preventDefault();
				e.stopPropagation();
				saveNow();
			} else if (e.key === 'p' || e.keyCode === 80) {
				e.preventDefault();
				e.stopPropagation();
				handlePrint();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return ()=>{
			window.removeEventListener('keydown', handleKeyDown);
			clearTimeout(autoSaveTimer.current);
		};
	}, []);

	const showToast = (message, type = 'info', duration = 3000)=>{
		setToast({ message, type });
		setTimeout(()=>{
			setToast(null);
		}, duration);
	};

	const saveNow = (brewToSave = currentBrew)=>{
		clearTimeout(autoSaveTimer.current);
		setSaveStatus('saving');

		const updated = {
			...brewToSave,
			updatedAt : new Date().toISOString()
		};

		setVaultBrews((prevBrews)=>{
			const index = prevBrews.findIndex((b)=>b.id === activeId);
			let nextBrews;
			if (index >= 0) {
				nextBrews = [...prevBrews];
				nextBrews[index] = updated;
			} else {
				nextBrews = [...prevBrews, updated];
			}
			safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(nextBrews));
			safeStorage.setItem(STORAGE_KEY_ACTIVE, activeId);
			return nextBrews;
		});

		setSaveStatus('saved');
		showToast(`Saved "${updated.title || 'Untitled Brew'}" to local storage.`, 'success', 2000);
	};

	const triggerAutoSave = (updatedBrew)=>{
		setSaveStatus('unsaved');
		clearTimeout(autoSaveTimer.current);
		autoSaveTimer.current = setTimeout(()=>{
			saveNow(updatedBrew);
		}, AUTOSAVE_DELAY_MS);
	};

	const handleTextChange = (text)=>{
		const errs = Markdown.validate(text);
		setHTMLErrors(errs);
		setCurrentBrew((prev)=>{
			const next = { ...prev, text };
			triggerAutoSave(next);
			return next;
		});
	};

	const handleStyleChange = (style)=>{
		setCurrentBrew((prev)=>{
			const next = { ...prev, style };
			triggerAutoSave(next);
			return next;
		});
	};

	const handleSnipChange = (snippets)=>{
		setCurrentBrew((prev)=>{
			const next = { ...prev, snippets };
			triggerAutoSave(next);
			return next;
		});
	};

	const handleMetaChange = (metadata, field = undefined)=>{
		setCurrentBrew((prev)=>{
			const next = { ...prev, ...metadata };
			if (field === 'renderer' || field === 'theme' || !field) {
				setThemeBundle(getThemeBundle(next.renderer || 'V3', next.theme || '5ePHB'));
			}
			triggerAutoSave(next);
			return next;
		});
	};

	const handleTitleChange = (e)=>{
		const title = e.target.value;
		setCurrentBrew((prev)=>{
			const next = { ...prev, title };
			triggerAutoSave(next);
			return next;
		});
	};

	const handleRendererChange = (e)=>{
		const renderer = e.target.value;
		handleMetaChange({ renderer }, 'renderer');
	};

	const handleThemeChange = (e)=>{
		const theme = e.target.value;
		handleMetaChange({ theme }, 'theme');
	};

	const handleCreateNew = (template = 'blank')=>{
		const id = `brew-${Date.now()}`;
		let text = '';
		let title = 'New Brew';

		if (template === 'welcome') {
			text = WELCOME_BREW_TEXT;
			title = 'Welcome Brew';
		} else {
			text = '# My New Homebrew\n\nWrite your content here...\n\n\\page\n\n# Page Two\n\nMore content...';
		}

		const newBrew = {
			...DEFAULT_BREW,
			id,
			title,
			text,
			style       : '',
			snippets    : '',
			renderer    : 'V3',
			theme       : '5ePHB',
			createdAt   : new Date().toISOString(),
			updatedAt   : new Date().toISOString()
		};

		const nextBrews = [newBrew, ...vaultBrews];
		setVaultBrews(nextBrews);
		setActiveId(id);
		setCurrentBrew(newBrew);
		setThemeBundle(getThemeBundle(newBrew.renderer, newBrew.theme));
		safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(nextBrews));
		safeStorage.setItem(STORAGE_KEY_ACTIVE, id);
		setVaultModalOpen(false);
		showToast(`Created new brew "${title}".`, 'info');
	};

	const handleSwitchBrew = (targetId)=>{
		if (targetId === activeId) {
			setVaultModalOpen(false);
			return;
		}

		// Ensure current brew is saved first
		saveNow();

		const target = vaultBrews.find((b)=>b.id === targetId);
		if (target) {
			setActiveId(targetId);
			setCurrentBrew(target);
			setThemeBundle(getThemeBundle(target.renderer || 'V3', target.theme || '5ePHB'));
			setHTMLErrors(Markdown.validate(target.text || ''));
			safeStorage.setItem(STORAGE_KEY_ACTIVE, targetId);
			setVaultModalOpen(false);
			showToast(`Switched to "${target.title || 'Untitled'}"`, 'info');
		}
	};

	const handleDuplicateBrew = (targetId)=>{
		const target = vaultBrews.find((b)=>b.id === targetId) || currentBrew;
		const id = `brew-${Date.now()}`;
		const copy = {
			..._.cloneDeep(target),
			id,
			title     : `${target.title || 'Brew'} (Copy)`,
			createdAt : new Date().toISOString(),
			updatedAt : new Date().toISOString()
		};

		const nextBrews = [copy, ...vaultBrews];
		setVaultBrews(nextBrews);
		safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(nextBrews));
		showToast(`Duplicated "${target.title || 'Untitled'}".`, 'info');
	};

	const handleDeleteBrew = (targetId)=>{
		if (vaultBrews.length <= 1) {
			alert('You must keep at least one brew in your vault!');
			return;
		}

		const target = vaultBrews.find((b)=>b.id === targetId);
		if (!window.confirm(`Are you sure you want to delete "${target?.title || 'this brew'}"?`)) {
			return;
		}

		const nextBrews = vaultBrews.filter((b)=>b.id !== targetId);
		setVaultBrews(nextBrews);
		safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(nextBrews));

		if (targetId === activeId) {
			const nextActive = nextBrews[0];
			setActiveId(nextActive.id);
			setCurrentBrew(nextActive);
			setThemeBundle(getThemeBundle(nextActive.renderer || 'V3', nextActive.theme || '5ePHB'));
			safeStorage.setItem(STORAGE_KEY_ACTIVE, nextActive.id);
		}

		showToast(`Deleted brew.`, 'info');
	};

	const handlePrint = ()=>{
		try {
			const iframe = document.getElementById('BrewRenderer');
			if (iframe?.contentWindow) {
				iframe.contentWindow.focus();
				iframe.contentWindow.print();
			} else {
				window.print();
			}
		} catch (e) {
			window.print();
		}
	};

	const handleExportTxt = ()=>{
		const filename = `${(currentBrew.title || 'brew').replace(/[^a-z0-9_-]/gi, '_')}.txt`;
		let fullContent = '';

		// Format metadata block
		fullContent += '```metadata\n';
		fullContent += `title: "${currentBrew.title || 'Untitled'}"\n`;
		fullContent += `description: "${currentBrew.description || ''}"\n`;
		fullContent += `renderer: "${currentBrew.renderer || 'V3'}"\n`;
		fullContent += `theme: "${currentBrew.theme || '5ePHB'}"\n`;
		fullContent += `lang: "${currentBrew.lang || 'en'}"\n`;
		fullContent += '```\n\n';

		if (currentBrew.style) {
			fullContent += '```css\n';
			fullContent += currentBrew.style;
			fullContent += '\n```\n\n';
		}

		fullContent += currentBrew.text;

		const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		showToast(`Exported ${filename}`, 'success');
		setExportModalOpen(false);
	};

	const handleExportJson = ()=>{
		const filename = `${(currentBrew.title || 'brew').replace(/[^a-z0-9_-]/gi, '_')}.json`;
		const jsonStr = JSON.stringify(currentBrew, null, 2);
		const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		showToast(`Exported ${filename}`, 'success');
		setExportModalOpen(false);
	};

	const handleExportAllVault = ()=>{
		const filename = `homebrewery_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
		const jsonStr = JSON.stringify(vaultBrews, null, 2);
		const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		showToast(`Vault backup exported: ${filename}`, 'success');
	};

	const handleImportClick = ()=>{
		fileInputRef.current?.click();
	};

	const handleFileSelected = (e)=>{
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event)=>{
			try {
				const content = event.target.result;
				let importedBrew = null;

				if (file.name.endsWith('.json')) {
					const parsed = JSON.parse(content);
					if (Array.isArray(parsed)) {
						// Multiple brews backup
						const nextBrews = [...parsed, ...vaultBrews];
						setVaultBrews(nextBrews);
						safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(nextBrews));
						showToast(`Imported ${parsed.length} brews into vault!`, 'success');
						return;
					} else {
						importedBrew = {
							...DEFAULT_BREW,
							...parsed,
							id        : `brew-${Date.now()}`,
							createdAt : new Date().toISOString(),
							updatedAt : new Date().toISOString()
						};
					}
				} else {
					// Markdown or text format
					importedBrew = {
						...DEFAULT_BREW,
						id        : `brew-${Date.now()}`,
						title     : file.name.replace(/\.[^/.]+$/, ''),
						text      : content,
						renderer  : 'V3',
						theme     : '5ePHB',
						createdAt : new Date().toISOString(),
						updatedAt : new Date().toISOString()
					};
				}

				if (importedBrew) {
					const nextBrews = [importedBrew, ...vaultBrews];
					setVaultBrews(nextBrews);
					setActiveId(importedBrew.id);
					setCurrentBrew(importedBrew);
					setThemeBundle(getThemeBundle(importedBrew.renderer, importedBrew.theme));
					safeStorage.setItem(STORAGE_KEY_BREWS, JSON.stringify(nextBrews));
					safeStorage.setItem(STORAGE_KEY_ACTIVE, importedBrew.id);
					showToast(`Imported "${importedBrew.title}"!`, 'success');
					setVaultModalOpen(false);
				}
			} catch (err) {
				alert(`Failed to import file: ${err.message}`);
			}
		};
		reader.readAsText(file);
		e.target.value = '';
	};

	const updateBrew = (newData)=>setCurrentBrew((prev)=>({
		...prev,
		style    : newData.style,
		text     : newData.text,
		snippets : newData.snippets
	}));

	return (
		<div className='standaloneApp'>
			<header className='standaloneNav'>
				<div className='navGroup'>
					<div className='brandTitle' onClick={()=>setHelpModalOpen(true)} title='Click for offline guide & help'>
						<i className='fas fa-dragon logoIcon' />
						<span>The Homebrewery</span>
						<span className='badgeOffline'>Offline</span>
					</div>

					<input
						type='text'
						className='brewTitleInput'
						value={currentBrew.title || ''}
						onChange={handleTitleChange}
						placeholder='Untitled Brew'
						title='Click to rename brew'
					/>
				</div>

				<div className='navGroup'>
					<button className={`navButton saveStatus ${saveStatus}`} onClick={()=>saveNow()} title='Click to save now'>
						<i className={`fas ${saveStatus === 'saving' ? 'fa-spinner fa-spin' : saveStatus === 'unsaved' ? 'fa-circle-dot' : 'fa-check'}`} />
						<span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}</span>
					</button>

					<select
						className='navSelect'
						value={currentBrew.renderer || 'V3'}
						onChange={handleRendererChange}
						title='Select Markdown Renderer'
					>
						<option value='V3'>Renderer: V3</option>
						<option value='legacy'>Renderer: Legacy</option>
					</select>

					<select
						className='navSelect'
						value={currentBrew.theme || '5ePHB'}
						onChange={handleThemeChange}
						title='Select Theme Style'
					>
						<option value='5ePHB'>Theme: 5e PHB</option>
						<option value='5eDMG'>Theme: 5e DMG</option>
						<option value='Blank'>Theme: Blank</option>
						<option value='Journal'>Theme: Journal</option>
						<option value='UnearthedArcana'>Theme: Unearthed Arcana</option>
					</select>

					<button className='navButton primary' onClick={()=>handleCreateNew('blank')} title='Create a new blank brew'>
						<i className='fas fa-plus' />
						<span>New</span>
					</button>

					<button className='navButton' onClick={()=>setVaultModalOpen(true)} title='Open Local Brew Vault'>
						<i className='fas fa-folder-open' />
						<span>My Brews ({vaultBrews.length})</span>
					</button>

					<button className='navButton' onClick={()=>setExportModalOpen(true)} title='Export or Backup brew'>
						<i className='fas fa-download' />
						<span>Export</span>
					</button>

					<button className='navButton' onClick={handlePrint} title='Print or Save to PDF (Ctrl+P)'>
						<i className='fas fa-print' />
						<span>Print</span>
					</button>

					<button className='navButton' onClick={()=>setHelpModalOpen(true)} title='Help, FAQ, and Guide'>
						<i className='fas fa-question-circle' />
						<span>Help</span>
					</button>
				</div>
			</header>

			<main className='mainContentArea'>
				<SplitPane onDragFinish={()=>editorRef.current?.update()}>
					<Editor
						ref={editorRef}
						brew={currentBrew}
						onTextChange={handleTextChange}
						onStyleChange={handleStyleChange}
						onSnipChange={handleSnipChange}
						onMetaChange={handleMetaChange}
						renderer={currentBrew.renderer}
						themeBundle={themeBundle}
						updateBrew={updateBrew}
						onCursorPageChange={(p)=>setCurrentEditorCursorPageNum(p)}
						onViewPageChange={(p)=>setCurrentEditorViewPageNum(p)}
						currentEditorViewPageNum={currentEditorViewPageNum}
						currentEditorCursorPageNum={currentEditorCursorPageNum}
						currentBrewRendererPageNum={currentBrewRendererPageNum}
					/>
					<BrewRenderer
						text={currentBrew.text}
						style={currentBrew.style}
						renderer={currentBrew.renderer}
						theme={currentBrew.theme}
						themeBundle={themeBundle}
						errors={HTMLErrors}
						lang={currentBrew.lang}
						onPageChange={(p)=>setCurrentBrewRendererPageNum(p)}
						currentEditorViewPageNum={currentEditorViewPageNum}
						currentEditorCursorPageNum={currentEditorCursorPageNum}
						currentBrewRendererPageNum={currentBrewRendererPageNum}
						allowPrint={true}
					/>
				</SplitPane>
			</main>

			{/* Vault Manager Modal */}
			{vaultModalOpen && (
				<div className='standaloneModalOverlay' onClick={()=>setVaultModalOpen(false)}>
					<div className='standaloneModal' onClick={(e)=>e.stopPropagation()}>
						<div className='modalHeader'>
							<h2><i className='fas fa-vault' /> Local Brew Vault</h2>
							<button className='closeBtn' onClick={()=>setVaultModalOpen(false)}>✕</button>
						</div>
						<div className='modalBody'>
							<div className='vaultControls'>
								<div style={{ display: 'flex', gap: '8px' }}>
									<button className='actionBtn' onClick={()=>handleCreateNew('blank')}>
										<i className='fas fa-plus' /> Blank Brew
									</button>
									<button className='actionBtn secondary' onClick={()=>handleCreateNew('welcome')}>
										<i className='fas fa-book' /> Starter Guide Brew
									</button>
								</div>
								<div style={{ display: 'flex', gap: '8px' }}>
									<button className='actionBtn secondary' onClick={handleImportClick}>
										<i className='fas fa-upload' /> Import File (.txt / .json)
									</button>
									<button className='actionBtn secondary' onClick={handleExportAllVault}>
										<i className='fas fa-file-export' /> Backup Vault
									</button>
								</div>
							</div>

							<table className='brewTable'>
								<thead>
									<tr>
										<th>Title</th>
										<th>Renderer</th>
										<th>Theme</th>
										<th>Updated</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{vaultBrews.map((brew)=>(
										<tr key={brew.id} className={brew.id === activeId ? 'activeBrewRow' : ''}>
											<td className='titleCol' style={{ cursor: 'pointer' }} onClick={()=>handleSwitchBrew(brew.id)}>
												{brew.id === activeId && <i className='fas fa-arrow-right' style={{ marginRight: '6px' }} />}
												{brew.title || 'Untitled'}
											</td>
											<td>{brew.renderer || 'V3'}</td>
											<td>{brew.theme || '5ePHB'}</td>
											<td>{new Date(brew.updatedAt || brew.createdAt || Date.now()).toLocaleDateString()}</td>
											<td>
												<div className='actionButtons'>
													<button onClick={()=>handleSwitchBrew(brew.id)} title='Open this brew'>
														Open
													</button>
													<button onClick={()=>handleDuplicateBrew(brew.id)} title='Duplicate brew'>
														<i className='fas fa-copy' />
													</button>
													<button className='deleteBtn' onClick={()=>handleDeleteBrew(brew.id)} title='Delete brew'>
														<i className='fas fa-trash' />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className='modalFooter'>
							<button className='closeFooterBtn' onClick={()=>setVaultModalOpen(false)}>Close</button>
						</div>
					</div>
				</div>
			)}

			{/* Export Modal */}
			{exportModalOpen && (
				<div className='standaloneModalOverlay' onClick={()=>setExportModalOpen(false)}>
					<div className='standaloneModal' onClick={(e)=>e.stopPropagation()}>
						<div className='modalHeader'>
							<h2><i className='fas fa-download' /> Export & Backup</h2>
							<button className='closeBtn' onClick={()=>setExportModalOpen(false)}>✕</button>
						</div>
						<div className='modalBody'>
							<p>Choose an export format for <strong>"{currentBrew.title || 'Untitled Brew'}"</strong>:</p>

							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
								<div
									style={{ background: '#202225', padding: '15px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #40444b' }}
									onClick={handleExportTxt}
								>
									<h3 style={{ margin: '0 0 6px 0', color: '#5865f2' }}><i className='fas fa-file-lines' /> Markdown Document (.txt)</h3>
									<p style={{ fontSize: '12px', margin: 0, color: '#8e9297' }}>
										Exports raw Markdown text with full metadata and CSS styling blocks included.
									</p>
								</div>

								<div
									style={{ background: '#202225', padding: '15px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #40444b' }}
									onClick={handleExportJson}
								>
									<h3 style={{ margin: '0 0 6px 0', color: '#43b581' }}><i className='fas fa-code' /> Homebrewery JSON (.json)</h3>
									<p style={{ fontSize: '12px', margin: 0, color: '#8e9297' }}>
										Complete structured data backup of this brew that can be re-imported anytime.
									</p>
								</div>
							</div>
						</div>
						<div className='modalFooter'>
							<button className='closeFooterBtn' onClick={()=>setExportModalOpen(false)}>Cancel</button>
						</div>
					</div>
				</div>
			)}

			{/* Help & FAQ Modal */}
			{helpModalOpen && (
				<div className='standaloneModalOverlay' onClick={()=>setHelpModalOpen(false)}>
					<div className='standaloneModal' onClick={(e)=>e.stopPropagation()}>
						<div className='modalHeader'>
							<h2><i className='fas fa-circle-question' /> Homebrewery Standalone Guide & FAQ</h2>
							<button className='closeBtn' onClick={()=>setHelpModalOpen(false)}>✕</button>
						</div>
						<div className='modalBody'>
							<div dangerouslySetInnerHTML={{ __html: Markdown.render(FAQ_TEXT) }} />
							<hr style={{ borderColor: '#3e4147', margin: '20px 0' }} />
							<div dangerouslySetInnerHTML={{ __html: Markdown.render(CHANGELOG_TEXT) }} />
						</div>
						<div className='modalFooter'>
							<button className='closeFooterBtn' onClick={()=>setHelpModalOpen(false)}>Close</button>
						</div>
					</div>
				</div>
			)}

			{/* Hidden file input for import */}
			<input
				type='file'
				ref={fileInputRef}
				style={{ display: 'none' }}
				accept='.txt,.json,.md,.html'
				onChange={handleFileSelected}
			/>

			{/* Toast notification */}
			{toast && (
				<div className={`standaloneToast ${toast.type}`}>
					<i className={`fas ${toast.type === 'error' ? 'fa-exclamation-triangle' : toast.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`} />
					<span>{toast.message}</span>
				</div>
			)}
		</div>
	);
};

module.exports = StandaloneApp;

