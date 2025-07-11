const express = require( 'express' );
const path = require( 'path' );
const fs = require( 'fs' );
const app = express();

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