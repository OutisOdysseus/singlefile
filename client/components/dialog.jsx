// Dialog box, for popups and modal blocking messages
import React from 'react';
const { useRef, useEffect } = React;

function Dialog({ dismisskeys = [], closeText = 'Close', blocking = false, ...rest }) {
	const dialogRef = useRef(null);

	useEffect(()=>{
		if (blocking) {
			if (typeof dialogRef.current?.showModal === 'function') {
				dialogRef.current.showModal();
			} else if (typeof dialogRef.current?.show === 'function') {
				dialogRef.current.show();
			}
		} else {
			if (typeof dialogRef.current?.show === 'function') {
				dialogRef.current.show();
			}
		}
	}, []);

	const dismiss = ()=>{
		dismisskeys.forEach((key)=>{
			if(key) {
				try {
					localStorage.setItem(key, 'true');
				} catch (e) {}
			}
		});
		if (typeof dialogRef.current?.close === 'function') {
			dialogRef.current.close();
		}
	};

	return (
		<dialog ref={dialogRef} onCancel={dismiss} {...rest}>
			{rest.children}
			<button className='dismiss' onClick={dismiss}>
				{closeText}
			</button>
		</dialog>
	);
};

export default Dialog;
