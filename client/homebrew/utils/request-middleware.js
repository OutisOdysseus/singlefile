import request from 'superagent';

const addHeader = (request)=>request.set('Homebrewery-Version', global.version);

const isStandaloneMode = ()=>typeof window !== 'undefined' && (
	window.location?.protocol === 'file:' ||
	Boolean(document.getElementById('hb-embedded-fonts')) ||
	global.version?.includes('singlefile')
);

const requestMiddleware = {
	get : (path)=>{
		if (isStandaloneMode()) {
			if (path.startsWith('/admin/notification')) {
				return Promise.resolve({ ok: true, status: 200, body: [] });
			}
		}
		return addHeader(request.get(path));
	},
	put    : (path)=>addHeader(request.put(path)),
	post   : (path)=>addHeader(request.post(path)),
	delete : (path)=>addHeader(request.delete(path)),
};

export default requestMiddleware;
