(function(exports) {
"use strict";

var opt = {};

function monologue(options) {
	var dict = { escape: true, backquote: true, sort_keys: false };

	if( typeof options === "undefined" ) {
		opt = dict;
	}

	else {
		for( var i in dict ) {
			opt[i] = ( typeof options[i] === "undefined" ? dict[i] : options[i] );
		}
	}

	return new Monologue();
}

function Monologue() {
	this.sql = '';

	// set the inital parts container
	this.reset();
}


/**
 * resets the global container object
 */

Monologue.prototype.reset = function reset() {
	this.parts = {
		query: '',
		join: [],
		where: '',
		having: '',
		order: [],
		group: [],
		limit: '',
		last: '',
		columns: []
	};
};



/**
 */

Monologue.prototype.select = function select( col, tbl ) {
	if( opt.backquote ) {
		tbl = this.backquote(tbl);

		if( col !== '*' ) col = this.backquote(col);
	}

	if( Array.isArray( col ) )
		col = col.join( ", " );

	this.parts.query = "SELECT " + col + " FROM " + tbl;

	return this;
};


/**
 * direction, table, statement
 */

Monologue.prototype.join = function join( dir, tbl, stmt ) {
	// default to inner join if unspecified (parity with mysql)
	if( typeof stmt === "undefined" ) {
		stmt = tbl;
		tbl = dir;
		dir = "INNER";
	}

	if( opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( typeof stmt === "object" ) {
		if( opt.backquote ) {
			stmt = this.backquote(stmt);
		}

		var fields = [];
		for( var ii in stmt ) {
			fields.push( ii + " = " + stmt[ii] );
		}

		stmt = fields.join(" AND ");
	}

	this.parts.join.push( " " + dir + " JOIN " + tbl + " ON " + stmt );

	return this;
};


/**
 * t: table, p: params
 */

Monologue.prototype.insert = function insert( tbl, p ) {
	var col = '';

	if( opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	// I don't know why this would ever NOT be the case
	if( typeof p === "object" ) {
		// if it's not a nested array, cheat and make it one
		if( ! Array.isArray( p ) ) {
			p = [p];
		}

		var a = this.stringify( p, "");
		col = "(" + a.shift() + ") VALUES " + a.join(',');
	}

	else if( typeof p === "string" ) {
		col = p;
	}

	this.parts.query = "INSERT INTO " + tbl + " " + col;

	return this;
};


/**
 * t: table, p: params
 */

Monologue.prototype.update = function update( tbl, p ) {
	var col = '';

	if( opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( typeof p === "object" ) {
		col = "SET " + this.stringify( p ).join( ', ' );
	}

	else {
		col = p;
	}

	this.parts.query = "UPDATE " + tbl + " " + col;

	return this;
};


/**
 */

Monologue.prototype.delete = function _delete( tbl, wh ) {
	if( opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	this.parts.query = "DELETE FROM " + tbl;
	return ( wh ? this.where( wh ) : this );
};


/**
 */

Monologue.prototype.where = function where( wh, sep ) {
	sep = ( typeof sep === "undefined" ? "AND" : sep );
	sep = ( sep.length > 0 ? " " + sep + " " : sep );

	if( Array.isArray( wh ) ) {
		wh.forEach(function(v, k, arr) {
			arr[k] = this.stringify( v ).join(' AND ');
		}.bind(this));

		// join an array of objects with OR
		wh = '(' + wh.join(' OR ') + ')';
	}

	else if( wh === Object(wh) ) {
		// stringify the where statements
		wh = this.stringify( wh ).join( sep );
	}

	// else {
	// 	if( opt.backquote ) {
	// 		wh = this.backquote(wh);
	// 	}
	// }

	// else wh is a string

	// check if a previous where statement has been set and glue it
	// all together
	this.parts.where = ( this.parts.where.length > 0
		? this.parts.where + sep + wh
		: wh );

	return this;
};

Monologue.prototype.and = function and( wh ) {
	return this.where( wh, 'AND' );
};

Monologue.prototype.or = function or( wh ) {
	return this.where( wh, 'OR' );
};


/**
 */

Monologue.prototype.in = function _in( ins ) {
	// returns "this"
	return this.where( this.format(ins), "" );
};


/**
 */

Monologue.prototype.like = function like( like ) {
	if( opt.escape ) {
		like = this.escape(like);
	}

	this.parts.where += " LIKE " + like;

	return this;
};


/**
 */

Monologue.prototype.between = function between( one, two ) {
	if( opt.escape ) {
		one = this.escape(one);
		two = this.escape(two);
	}

	this.parts.where += " BETWEEN " + one + " AND " + two;

	return this;
};


/**
 */

Monologue.prototype.group = function group( grp, dir ) {
	dir = dir || 'ASC';

	if( opt.backquote ) {
		grp = this.backquote(grp);
	}

	if( Array.isArray( grp ) )
		grp = grp.join( ', ' );

	this.parts.group.push( grp + " " + dir );

	return this;
};


/**
 */

Monologue.prototype.having = function having( hav, sep ) {
	sep = ( typeof sep === "undefined" ? "AND" : sep );
	sep = ( sep.length > 0 ? " " + sep + " " : sep );

	if( typeof hav !== "string" ) {
		// stringify the having statements
		hav = this.stringify(hav).join( sep );
	}

	// check if a previous statement has been set and glue it all together
	this.parts.having = ( this.parts.having.length > 0
		? this.parts.having + sep + hav
		: hav );

	return this;
};


/**
 */

Monologue.prototype.order = function order( ord, dir ) {
	dir = dir || 'ASC';

	if( opt.backquote ) {
		ord = this.backquote(ord);
	}

	if( Array.isArray( ord ) )
		ord = ord.join( ', ' );

	this.parts.order.push( ord + " " + dir );

	return this;
};


/**
 */

Monologue.prototype.limit = function limit( lim, off ) {
	this.parts.limit = ( typeof off === "undefined"
		? '' + lim
		: lim + ' OFFSET ' + off );
		// : off + ", " + lim );
	return this;
};


Monologue.prototype.union = function union( c, t ) {
	if( opt.backquote ) {
		t = this.backquote(t);

		if( c !== '*' ) c = this.backquote(c);
	}

	if( Array.isArray( c ) )
		c = c.join( ", " );

	var sql = this.query().sql;

	this.reset();

	this.parts.query = sql += " UNION SELECT " + c + " FROM " + t;

	return this;
};


/**
 * f: file path, t: field terminator, e: field enclosure,
 * l: line terminator
 */

Monologue.prototype.file = function file( f, t, e, l ) {
	if( typeof l === "undefined" ) {
		l = e;
		e = undefined;
	}

	this.parts.last += " INTO OUTFILE '" + f
		+ "' FIELDS TERMINATED BY '" + t + "' "
		+ ( e ? "OPTIONALLY ENCLOSED BY '" + e + "'" : '' )
		+ " LINES TERMINATED BY '" + l + "'";

	return this;
};


/**
 * Compile each part together and generate a valid SQL statement
 */

Monologue.prototype.query = function query() {
	if( this.parts.join.length > 0 )
		this.parts.query += this.parts.join.join('');
	if( this.parts.where.length > 0 )
		this.parts.query += " WHERE " + this.parts.where;
	if( this.parts.group.length > 0 )
		this.parts.query += " GROUP BY " + this.parts.group.join(',');
	if( this.parts.having.length > 0 )
		this.parts.query += " HAVING " + this.parts.having;
	if( this.parts.order.length > 0 )
		this.parts.query += " ORDER BY " + this.parts.order.join(',');
	if( this.parts.limit.length > 0 )
		this.parts.query += " LIMIT " + this.parts.limit;
	if( this.parts.last.length > 0 )
		this.parts.query += this.parts.last;

	this.sql = this.parts.query;

	return this;
};


/**
 * Takes an object or and array of objects and builds a SQL string
 * p: params, s: separator
 */

Monologue.prototype.stringify = function stringify( p, s ) {
	s = ( typeof s === "undefined" ? "=" : s );
	var c = [];

	if( Array.isArray( p ) ) {
		for( var ii = 0, l = p.length; ii < l; ++ii ) {
			// if parent is an array and child is an object,
			// generate an encapsulated list of values (for inserts)
			if( p[ii] === Object(p[ii]) ) {
				if( c.length === 0 ) {
					// grab the column names from the first object
					this.parts.columns = Object.keys( p[0] );

					if( opt.sort_keys )
						this.parts.columns.sort();

					// these columns don't get passed through monologue.format
					// so do it here, if applicable
					var cols = ( opt.backquote
						? this.backquote( this.parts.columns )
						: this.parts.columns );

					c.push( cols.join(', ') );
				}

				c.push( "(" + this.stringify( p[ii], "" ).join(',') + ")" );
			}

			else {
				// generate a comma-separated list of fields
				c.push( this.format( p[ii] ) );
			}
		}
	}

	else {
		// if this.parts.columns is set, it's already sorted (if sorting)
		// and backquoted (if backquoting). otherwise, columns will be
		// backquoted when they are formatted
		if( this.parts.columns.length === 0 ) {
			var col = ( opt.sort_keys
				? Object.keys(p).sort()
				: Object.keys(p) );
		}
		else {
			var col = this.parts.columns;
		}

		for( var jj = 0, len = col.length; jj < len; ++jj ) {
			c.push( this.format( p[col[jj]], col[jj], s ) );
		}
	}

	return c;
};


/**
 * takes a key/value and formats it for use in a bound-param query
 */

Monologue.prototype.format = function format( v, k, s ) {
	if( Array.isArray(v) ) {
		k = k || '';

		var vs = v.map(function(v, k) {
			return this.escape(v);
		}.bind(this)).join(',');

		var ret = ( opt.backquote && k ? this.backquote( k ) : k )
			+ " IN (" + vs + ")";

		return ret;
	}

	// else if( v === Object(v) ) {
	// 	var c = [];
	// 	for( var i in v ) {
	// 		if( s ) {
	// 			c.push(this.format(v[i], i, s))
	// 		}
	// 		else {
	// 			c.push(this.format(v[i]))
	// 		}
	// 	}

	// 	c = c.join(',');

	// 	if( ! s ) {
	// 		c = "(" + c + ")";
	// 	}

	// 	return c;
	// }

	else {
		if( opt.escape ) {
			v = this.escape(v);
		}

		if( k && opt.backquote ) {
			k = this.backquote(k);
		}

		// if s and/or k is undefined, it is an array of values so just format value
		// and ditch the key and separator
		return ( k && s ? k + " " + s + " " : '' ) + v;
	}

};


/**
 * Escape unsafe characters to prevent sql injection
 */

Monologue.prototype.escape = function escape( v ) {
	if( v === undefined || v === null ) {
		return 'NULL';
	}

	switch( typeof v ) {
		case 'boolean': return (v ? 'true' : 'false');
		case 'number': return v + '';
	}

	v = v.replace( /[\0\n\r\b\t\\\'\"\x1a]/g, function( s ) {
		switch( s ) {
			case "\0": return "\\0";
			case "\n": return "\\n";
			case "\r": return "\\r";
			case "\b": return "\\b";
			case "\t": return "\\t";
			case "\x1a": return "\\Z";
			default: return "\\" + s;
		}
	});

	return "'" + v + "'";
};


Monologue.prototype.backquote = function backquote( col ) {
	if( Array.isArray(col) ) {
		return col.map(function(v) {
			return this.backquote(v);
		// maintaining execution scope to avoid setting a var
		// (can't wait to upgrade node 4+)
		}.bind(this));
	}

	else if( col === Object(col) ){
		var obj = {};
		for( var i in col ) {
			obj[this.backquote(i)] = col[i];
		}

		return obj;
	}

	else {
		return '`' + col + '`';
	}
};

if( typeof module !== "undefined" && module.exports ) {
	module.exports = monologue;
}
else {
	window.monologue = monologue;
}

})( typeof window === 'undefined' ? module.exports : window );