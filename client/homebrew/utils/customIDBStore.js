import * as IDB from 'idb-keyval/dist/index.js';

export function initCustomStore(db, store){
	const memoryMap = new Map();

	const hasIDB = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;

	if (!hasIDB) {
		return {
			entries : async ()=>Array.from(memoryMap.entries()),
			keys    : async ()=>Array.from(memoryMap.keys()),
			values  : async ()=>Array.from(memoryMap.values()),
			clear   : async ()=>memoryMap.clear(),
			get     : async (key)=>memoryMap.get(key),
			getMany : async (keys)=>keys.map((k)=>memoryMap.get(k)),
			set     : async (key, value)=>memoryMap.set(key, value),
			setMany : async (entries)=>entries.forEach(([k, v])=>memoryMap.set(k, v)),
			update  : async (key, updateFn)=>{
				const old = memoryMap.get(key);
				const newVal = updateFn(old);
				memoryMap.set(key, newVal);
				return newVal;
			},
			del     : async (key)=>memoryMap.delete(key),
			delMany : async (keys)=>keys.forEach((k)=>memoryMap.delete(k))
		};
	}

	const createCustomStore = async ()=>{
		try {
			return await IDB.createStore(db, store);
		} catch (e) {
			return null;
		}
	};

	return {
		entries : async ()=>{
			try {
				const s = await createCustomStore();
				return s ? await IDB.entries(s) : Array.from(memoryMap.entries());
			} catch (e) {
				return Array.from(memoryMap.entries());
			}
		},
		keys : async ()=>{
			try {
				const s = await createCustomStore();
				return s ? await IDB.keys(s) : Array.from(memoryMap.keys());
			} catch (e) {
				return Array.from(memoryMap.keys());
			}
		},
		values : async ()=>{
			try {
				const s = await createCustomStore();
				return s ? await IDB.values(s) : Array.from(memoryMap.values());
			} catch (e) {
				return Array.from(memoryMap.values());
			}
		},
		clear : async ()=>{
			try {
				const s = await createCustomStore();
				if (s) await IDB.clear(s);
			} catch (e) {}
			memoryMap.clear();
		},
		get : async (key)=>{
			try {
				const s = await createCustomStore();
				return s ? await IDB.get(key, s) : memoryMap.get(key);
			} catch (e) {
				return memoryMap.get(key);
			}
		},
		getMany : async (keys)=>{
			try {
				const s = await createCustomStore();
				return s ? await IDB.getMany(keys, s) : keys.map((k)=>memoryMap.get(k));
			} catch (e) {
				return keys.map((k)=>memoryMap.get(k));
			}
		},
		set : async (key, value)=>{
			try {
				const s = await createCustomStore();
				if (s) await IDB.set(key, value, s);
			} catch (e) {}
			memoryMap.set(key, value);
		},
		setMany : async (entries)=>{
			try {
				const s = await createCustomStore();
				if (s) await IDB.setMany(entries, s);
			} catch (e) {}
			entries.forEach(([k, v])=>memoryMap.set(k, v));
		},
		update : async (key, updateFn)=>{
			try {
				const s = await createCustomStore();
				if (s) return await IDB.update(key, updateFn, s);
			} catch (e) {}
			const old = memoryMap.get(key);
			const newVal = updateFn(old);
			memoryMap.set(key, newVal);
			return newVal;
		},
		del : async (key)=>{
			try {
				const s = await createCustomStore();
				if (s) await IDB.del(key, s);
			} catch (e) {}
			memoryMap.delete(key);
		},
		delMany : async (keys)=>{
			try {
				const s = await createCustomStore();
				if (s) await IDB.delMany(keys, s);
			} catch (e) {}
			keys.forEach((k)=>memoryMap.delete(k));
		}
	};
};
