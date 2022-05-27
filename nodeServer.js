const express = require( 'express' );
const path = require( 'path' );
const fs = require( 'fs' );
const app = express();

var guestbook = [ {name: 'Peri', text: 'Hello, World!', at: new Date(), source: '192.168.0.2'} ];
var postsPerPage = 20;

var guestBookFile = fs.openSync( './Private/guestbook.ndjson', 'a+' );
var gb = fs.readFileSync( guestBookFile, 'utf-8' ).split( '\n' );
gb.pop();
guestbook = gb.map( JSON.parse );

app.get( '/Contact/guestbook', (req, res) => {
    var url = new URL( req.url, `https://${req.headers.host}` );
    var index = url.searchParams.get( 'index' ) ?? guestbook.length;
    var from = Math.max( 0, index - postsPerPage );
    var to = Math.min( guestbook.length, index );

    res.setHeader( 'Content-Type', 'application/json' );
    res.send( JSON.stringify( {
        index: index,
        nextIndex: Math.max( 0, from ),
        prevIndex: Math.min( guestbook.length, to + postsPerPage ),
        postsPerPage: postsPerPage,
        data: guestbook.slice( from, to ).map( x => ({name: x.name, text: x.text}) ).reverse()
    }, undefined, '\t' ) );
} );

app.post( '/Contact/guestbook', (req, res) => {
    var url = new URL( req.url, `https://${req.headers.host}` );
    var name = url.searchParams.get( 'name' );
    var text = url.searchParams.get( 'text' );
    
    if ( name == null || name.length == 0 || text == null || text.length == 0 ) {
        res.status( 400 );
        res.end();
        return;
    }

    var post = { name: name, text: text, at: new Date(), source: req.ip };
    fs.appendFile( guestBookFile, JSON.stringify( post ) + '\n', () => {} );
    guestbook.push( post );

    res.status( 200 );
    res.end();
} );

app.get( '/ack', (req, res) => {
    res.send( 'ack' );
} );
app.get( '/', (req, res) => {
    res.redirect( '/Home' );
} );

var options = { 
    root: path.join( __dirname ) 
};
app.get( '*', (req, res, next) => {
    let last = req.url.split( '/' );
    last = last[ last.length - 1 ];
    if ( !last.includes( '.' ) ) {
        res.sendFile( `./Private/Template.html`, options );
    }
    else {
        next();
    }
} );

express.static.mime.define({'text/html': ['html','htm','part']});

app.use( express.static( 'Public' ) );

app.listen( process.env.PORT || 8080, () => console.log( 'running' ) );