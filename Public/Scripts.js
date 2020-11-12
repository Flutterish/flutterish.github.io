window.addEventListener( 'load', () => {
	document.getElementById( 'content' ).innerHTML = '';
	document.getElementById( 'titlespace' ).innerHTML = '';

	window.content = document.getElementById( 'content' );
	window.titlespace = document.getElementById( 'titlespace' );
	window.mainTitle = document.title;
	begin();
	loadContent( location.pathname, false );
} );

(function(){
	var header;
	var themes = {
		'pink': { accent: '--accent-pink', accentActive: '--accent-pink-active' },
		'red': { accent: '--accent-red', accentActive: '--accent-red-active' },
		'yellow': { accent: '--accent-yellow', accentActive: '--accent-yellow-active' },
		'green': { accent: '--accent-green', accentActive: '--accent-green-active' },
		'purple': { accent: '--accent-purple', accentActive: '--accent-purple-active' },
		'orange': { accent: '--accent-orange', accentActive: '--accent-orange-active' },
		'dark': { accent: '--accent-dark', accentActive: '--accent-dark-active' },
		'error': { accent: '--accent-dark', accentActive: '--accent-dark-active' },
	};

	window.begin = function () {
		themes.avaiable = Object.keys( themes );
		header = new Header( document.getElementById( 'header' ) );
	};

	window.loadContent = function ( path, saveHistory = true ) {
		return new Promise( (res,rej) => {
			GetContent( path ).then( x => {
				loadContentState( x );
				if ( saveHistory ) window.history.pushState( x, x.title, x.path );
				res();
			} ).catch( x => {
				x = { ...x, failed: true };
				loadContentState( x );
				if ( saveHistory ) window.history.pushState( x, x.title, x.path );
				rej();
			} );
		} );
	}

	window.loadContentState = function loadContentState ( state ) {
		let selectedTheme = false;

		content.innerHTML = state.html;
		let title = document.title;
		if ( state.title ) document.title = window.mainTitle + ' - ' + state.title.replace( /%20/g, ' ' );

		if ( content.querySelector( 'title' ) ) {
			title = content.querySelector( 'title' ).innerText;
		}
		if ( content.querySelector( 'meta[title]' ) ) {
			document.title = window.mainTitle + ' - ' + content.querySelector( 'meta[title]' ).attributes.title.value
		}
		if ( content.querySelector( 'meta[theme]' ) ) {
			SetTheme( content.querySelector( 'meta[theme]' ).attributes.theme.value );
			selectedTheme = true;
		}
		for ( let md of content.querySelectorAll( 'md' ) ) {
			md.innerHTML = ParseMD( md.innerHTML );
			for ( let link of md.querySelectorAll( 'a' ) ) {
				let url = link.getAttribute( 'href' );
				if ( url[ 0 ] == '/' ) {
					link.onclick = () => loadContent( url );
					link.removeAttribute( 'href' );
				}
			}
			for ( let snippet of md.querySelectorAll( 'pre code' ) ) {
				let button = document.createElement( 'div' );
				button.classList.add( 'button' );
				button.innerText = 'Copy snippet';
				button.onclick = () => {
					let prev = document.oncopy;
					document.oncopy = e => {
						e.clipboardData.setData( 'text/plain', snippet.innerText );
						e.preventDefault();
					};

					document.execCommand( 'copy' );
					document.oncopy = prev;
				};
				snippet.parentNode.insertBefore( button, snippet );
			}
		}
		for ( let i of content.querySelectorAll( 'script' ) ) {
			if ( i.src ) document.head.appendChild( i.cloneNode( true ) );
			else eval( i.innerText );
		}

		titlespace.innerHTML = `<h2>${title}</h2>`;

		if ( state.path ) {
			let selectors = document.querySelectorAll( '#header .button .selector' );
			for ( let i of selectors ) {
				i.classList.remove( 'selected' );
			}
			let anySelected = false;
			let fragment = state.path.replace( /%20/g, ' ' );
			while ( !anySelected && fragment.length > 1 ) {
				for ( let i of selectors ) {
					if ( i.parentElement.attributes.onclick.nodeValue == `loadContent('${fragment}')` ) {
						i.classList.add( 'selected' );
						anySelected = true;
						if ( !selectedTheme ) {
							SetThemeAlike( i );
							selectedTheme = true;
						}
					}
				}
				fragment = fragment.split( '/' );
				fragment.pop();
				fragment = fragment.join( '/' );
			}
		}

		setTimeout( window.scrollTop, 10 );
	}

	function ParseMD ( str ) {
		str = removeIndentation( str ).replace( /&gt;/g, '>' ).replace( /&lt;/g, '<' );

		var md = window.markdownit({
			highlight: function (str, lang) {
				if (lang && window.hljs.getLanguage(lang)) {
					try {
						return window.hljs.highlight(lang, str).value;
					} catch (__) { }
				}

				return ''; // use external default escaping
			}
		});

		return md.render( str );
	}

	window.SetTheme = function SetTheme ( theme ) {
		if ( theme ) {
			document.body.setAttribute( 'theme', theme );
			document.body.style.setProperty( '--accent', '' );
			document.body.style.setProperty( '--accent-active', '' );
		}
	}

	function SetThemeAlike ( el ) {
		if ( el ) {
			document.body.style.setProperty( '--accent', getComputedStyle( el ).getPropertyValue( '--accent' ) );
			document.body.style.setProperty( '--accent-active', getComputedStyle( el ).getPropertyValue( '--accent-active' ) );
			document.body.removeAttribute( 'theme' );
		}
	}

	function GetContent ( path ) {
		let title = path.split( '/' );
		title = title[ title.length - 1 ];

		return new Promise( (res,rej) => {
			Get( path + '.part' ).then( v => {
				res({
					html: v,
					title: title,
					path: path
				});
			} ).catch( e => {
				if ( typeof e === 'number' ) {
					Get( `/Errors/${e}.part` ).then( v => {
						rej({
							html: v,
							title: title,
							path: path
						});
					} ).catch( e => {
						rej({
							html: `<title><i class="fas fa-exclamation-triangle"></i> | Error ${e}</title><meta title="Error"><meta theme="error"><p>Something went wrong on the backend and the error page is not avaiable. Sorry about that.</p>`,
							title: title,
							path: path
						});
					} );
				}
				else {
					rej({
						html: `<title><i class="fas fa-exclamation-triangle"></i> | Whoops!</title><meta title="Whoops!"><meta theme="error"><p>Something went wrong on the frontend while fetching the requested resource. Sorry about that.<br>Please report this to the administrator:<br>` + e.toString().replace( /\n/g, '<br>' ).replace( /\t/g, '    ' ).replace( / /g, '&nbsp;' ) + "</p>",
						title: title,
						path: path
					});
				}
			} );
		} );
	}

	window.DisplayError = function DisplayError ( e ) {
		loadContentState({
			html: `<title><i class="fas fa-exclamation-triangle"></i> | Whoops!</title><meta title="Whoops!"><meta theme="error"><p>Something went wrong on the frontend while fetching the requested resource. Sorry about that.<br>Please report this to the administrator:<br>` + e.toString().replace( /\n/g, '<br>' ).replace( /\t/g, '    ' ).replace( / /g, '&nbsp;' ) + "</p>"
		});
	}

	window.onpopstate = function ( e ) {
		if ( e.state == null ) {
			loadContent( e.target.location.pathname, false );
		}
		else {
			loadContent( e.state.path, false );
		}
	}

	class Header {
		constructor ( el ) {
			this.el = el;
			window.addEventListener( 'scroll', e => this.AdjustToScroll() );
			this.AdjustToScroll();
		}

		AdjustToScroll () {
			if ( window.scrollY > this.el.clientHeight / 5 * 4 )
				this.el.style.top = `${-this.el.clientHeight}px`;
			else
				this.el.style.top = `0px`;
		}
	}

	function Get ( path ) {
		return new Promise( (res,rej) => {
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function () {
				if ( this.readyState == 4 && this.status == 200 ) {
					res( this.responseText );
				}
				else if ( this.status == 404 ) {
					rej( 404 );
				}
			};
			xhttp.onerror = rej;
			xhttp.open( 'GET', path, true );
			xhttp.send();
		} );
	}

	function removeIndentation ( str ) {
		let lines = str.split( /^/gm );
		let any = true;
		while ( true ) {
			if ( lines.some( x => x[0] == ' ' ) && lines.every( x => x[0] == ' ' || x[0] == '\n' ) ) {
				lines = lines.map( x => x[0] == '\n' ? x : x.substr( 1 ) );
				continue;
			}
			if ( lines.some( x => x[0] == '\t' ) && lines.every( x => x[0] == '\t' || x[0] == '\n' ) ) {
				lines = lines.map( x => x[0] == '\n' ? x : x.substr( 1 ) );
				continue;
			}
			return lines.join( '' );
		}
	}

	window.addEventListener( 'click', e => {
		if ( /^H[1-6]$/.test( e.target.tagName ) ) {
			e.target.scrollIntoView( {block: "start", inline: "nearest", behavior: "smooth"} );
		}
	} );

	window.scrollTop = function () {
		window.scrollTo( { top: 0, behavior: 'smooth' } );
	}
})();