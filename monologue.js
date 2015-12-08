(function(exports) {
"use strict";

var _g = {
	opt: {},
	parts: {}
}

function monologue(opt) {
	// default values
	var dict = { escape: true, backquote: true, sort_keys: false };

	if( typeof opt === "undefined" ) {
		_g.opt = dict;
	}

	else {
		for( var i in dict ) {
			_g.opt[i] = ( typeof opt[i] === "undefined" ? dict[i] : opt[i] );
		}
	}

	return new Monologue();
}

function Monologue() {
	this.sql = '';

	// store whether where() or having() was used last
	// (I hope this doesn't get ugly)
	this.last_condition = null;

	// set the inital parts container
	this.reset();
}


/**
 * all the "parts" of a query
 */

Monologue.prototype.reset = function reset() {
	_g.parts = {
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
	if( _g.opt.backquote ) {
		tbl = this.backquote(tbl);

		if( col !== '*' ) col = this.backquote(col);
	}

	if( Array.isArray( col ) ) {
		col = col.join( ", " );
	}

	_g.parts.query = ["SELECT", col, "FROM", tbl].join(' ');

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

	if( _g.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( typeof stmt === "object" ) {
		if( _g.opt.backquote ) {
			stmt = this.backquote(stmt);
		}

		var fields = [];
		for( var ii in stmt ) {
			fields.push( ii + " = " + stmt[ii] );
		}

		stmt = fields.join(" AND ");
	}

	_g.parts.join.push( [dir, "JOIN", tbl, "ON", stmt].join(' ') );

	return this;
};


/**
 * t: table, p: params
 */

Monologue.prototype.insert = function insert( tbl, p ) {
	var col = '';

	if( _g.opt.backquote ) {
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

	_g.parts.query = ["INSERT INTO", tbl, col].join(' ');

	return this;
};


/**
 * t: table, p: params
 */

Monologue.prototype.update = function update( tbl, p ) {
	var col = '';

	if( _g.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( typeof p === "object" ) {
		col = "SET " + this.stringify( p ).join( ', ' );
	}

	else {
		col = p;
	}

	_g.parts.query = ["UPDATE", tbl, col].join(' ');

	return this;
};


/**
 */

Monologue.prototype.delete = function _delete( tbl, wh ) {
	if( _g.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	_g.parts.query = "DELETE FROM " + tbl;
	return ( wh ? this.where( wh ) : this );
};


/**
 */

Monologue.prototype.where = function where( wh, sep ) {
	sep = ( typeof sep === "undefined" ? "AND" : sep );
	sep = ( sep.length > 0 ? " " + sep + " " : sep );

	wh = this.condition(wh, sep);

	// check if a previous where statement has been set and glue it
	// all together
	_g.parts.where = ( _g.parts.where.length > 0
		? _g.parts.where + sep + wh
		: wh );

	this.last_condition = this.where;

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
	if( _g.opt.escape ) {
		like = this.escape(like);
	}

	return this.where(" LIKE " + like, '');
};


/**
 */

Monologue.prototype.between = function between( one, two ) {
	if( _g.opt.escape ) {
		one = this.escape(one);
		two = this.escape(two);
	}

	return this.where(" BETWEEN " + one + " AND " + two, '');
};


/**
 */

Monologue.prototype.group = function group( grp, dir ) {
	dir = dir || 'ASC';

	if( _g.opt.backquote ) {
		grp = this.backquote(grp);
	}

	if( Array.isArray( grp ) )
		grp = grp.join( ', ' );

	_g.parts.group.push( grp + " " + dir );

	return this;
};


/**
 */

Monologue.prototype.having = function having( hav, sep ) {
	sep = ( typeof sep === "undefined" ? "AND" : sep );
	sep = ( sep.length > 0 ? " " + sep + " " : sep );

	hav = this.condition(hav, sep);

	// check if a previous statement has been set and glue it all together
	_g.parts.having = ( _g.parts.having.length > 0
		? _g.parts.having + sep + hav
		: hav );

	this.last_condition = this.having;

	return this;
};


Monologue.prototype.condition = function condition(cond, sep) {
	if( Array.isArray( cond ) && Object(cond[0]) === cond[0] ) {
		cond.forEach(function(v, k, arr) {
			arr[k] = this.stringify( v ).join(' AND ');
		}.bind(this));

		// join an array of objects with OR
		cond = '(' + cond.join(' OR ') + ')';
	}

	else if( Array.isArray(cond) ) {
		cond = cond.join(' OR ');
	}

	else if( cond === Object(cond) ) {
		// stringify the where statements
		cond = this.stringify( cond ).join( sep );
	}

	return cond;
};


/**
 */

Monologue.prototype.order = function order( ord, dir ) {
	dir = dir || 'ASC';

	if( _g.opt.backquote ) {
		ord = this.backquote(ord);
	}

	if( Array.isArray( ord ) )
		ord = ord.join( ', ' );

	_g.parts.order.push( ord + " " + dir );

	return this;
};


/**
 */

Monologue.prototype.limit = function limit( lim, off ) {
	_g.parts.limit = ( typeof off === "undefined"
		? '' + lim
		: lim + ' OFFSET ' + off );
		// : off + ", " + lim );
	return this;
};


Monologue.prototype.union = function union( c, t ) {
	if( _g.opt.backquote ) {
		t = this.backquote(t);

		if( c !== '*' ) c = this.backquote(c);
	}

	if( Array.isArray( c ) )
		c = c.join( ", " );

	var sql = this.query().sql;

	this.reset();

	_g.parts.query = sql += " UNION SELECT " + c + " FROM " + t;

	return this;
};


Monologue.prototype.not = function not(p, sep) {
	sep = sep || 'AND';
	sep = ' ' + sep + ' ';

	if( Array.isArray(p) && Object(p[0]) === p[0]  ) {
		this.where( p.map(function(v, k) {
			return this.stringify(v, '!=')
		}.bind(this)).join(sep) );
	}

	else if( Array.isArray(p) ) {
		this.where( ' NOT' + this.format(p, ''), '' );
	}

	else if( Object(p) === p ) {
		this.where( this.stringify(p, '!=').join(sep) );
	}

	else {
		this.where( ' NOT', '' );
	}

	return this;
};

Monologue.prototype.lt = function lt(p, sep) {
	return this.comparison(p, sep, '<');
};

Monologue.prototype.lte = function lte(p, sep) {
	return this.comparison(p, sep, '<=');
};

Monologue.prototype.gt = function gt(p, sep) {
	return this.comparison(p, sep, '>');
};

Monologue.prototype.gte = function gte(p, sep) {
	return this.comparison(p, sep, '>=');
};

Monologue.prototype.comparison = function comparison(p, sep, eq) {
	sep = sep || 'AND';
	sep = ' ' + sep + ' ';

	this.last_condition = this.last_condition || this.where;

	if( Array.isArray(p) && Object(p[0]) === p[0]  ) {
		sep = sep.trim();

		this.last_condition.call( this, p.map(function(val) {
			var str = this.stringify( val, eq ).join(' AND ');
			return str;
		}.bind(this)), sep );
	}
	else if( Object(p) === p ) {
		this.last_condition.call( this, this.stringify( p, eq ).join(sep) );
	}
	else {
		this.last_condition.call( this, this.format(p), eq );
	}

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

	_g.parts.last += " INTO OUTFILE '" + f
		+ "' FIELDS TERMINATED BY '" + t + "' "
		+ ( e ? "OPTIONALLY ENCLOSED BY '" + e + "'" : '' )
		+ " LINES TERMINATED BY '" + l + "'";

	return this;
};


/**
 * Compile each part together and generate a valid SQL statement
 */

Monologue.prototype.query = function query() {
	if( _g.parts.join.length > 0 )
		_g.parts.query += ' ' + _g.parts.join.join(' ');
	if( _g.parts.where.length > 0 )
		_g.parts.query += " WHERE " + _g.parts.where;
	if( _g.parts.group.length > 0 )
		_g.parts.query += " GROUP BY " + _g.parts.group.join(',');
	if( _g.parts.having.length > 0 )
		_g.parts.query += " HAVING " + _g.parts.having;
	if( _g.parts.order.length > 0 )
		_g.parts.query += " ORDER BY " + _g.parts.order.join(',');
	if( _g.parts.limit.length > 0 )
		_g.parts.query += " LIMIT " + _g.parts.limit;
	if( _g.parts.last.length > 0 )
		_g.parts.query += _g.parts.last;

	this.sql = _g.parts.query;

	return this;
};


/**
 * Takes an object or and array of objects and builds a SQL string
 * p: params, s: separator
 */

Monologue.prototype.stringify = function stringify( p, s, j ) {
	j = j || ', ';
	s = ( typeof s === "undefined" ? "=" : s );
	var c = [];

	if( Array.isArray( p ) ) {
		for( var ii = 0, l = p.length; ii < l; ++ii ) {
			// if parent is an array and child is an object,
			// generate an encapsulated list of values (for inserts)
			if( p[ii] === Object(p[ii]) ) {
				if( c.length === 0 ) {
					// grab the column names from the first object
					_g.parts.columns = Object.keys( p[0] );

					if( _g.opt.sort_keys )
						_g.parts.columns.sort();

					// these columns don't get passed through monologue.format
					// so do it here, if applicable
					var cols = ( _g.opt.backquote
						? this.backquote( _g.parts.columns )
						: _g.parts.columns );

					c.push( cols.join(j) );
				}

				c.push( "(" + this.stringify( p[ii], "" ).join(j) + ")" );
			}

			else {
				// generate a comma-separated list of fields
				c.push( this.format( p[ii] ) );
			}
		}
	}

	else {
		// if _g.parts.columns is set, it's already sorted (if sorting)
		// and backquoted (if backquoting). otherwise, columns will be
		// backquoted when they are formatted
		if( _g.parts.columns.length === 0 ) {
			var col = ( _g.opt.sort_keys
				? Object.keys(p).sort()
				: Object.keys(p) );
		}
		else {
			var col = _g.parts.columns;
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

		var ret = ( _g.opt.backquote && k ? this.backquote( k ) : k )
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
		if( _g.opt.escape ) {
			v = this.escape(v);
		}

		if( k && _g.opt.backquote ) {
			k = this.backquote(k);

			if( v === 'NULL' && s ) {
				s = ( s === '=' ? 'IS' : 'IS NOT' );
			}
		}

		// if s and/or k is undefined, it is an array of values so just format value
		// and ditch the key and separator
		return ( k && s ? k + " " + s + " " : '' ) + v;
	}

};


/**
 * Escape unsafe characters to prevent sql injection
 */

Monologue.prototype.escape = function escape( val ) {
	if( Array.isArray(val) ) {
		return val.map(function(v) {
			return this.escape(v);
		// maintaining execution scope to avoid setting a var
		// (can't wait to upgrade node 4+)
		}.bind(this));
	}

	else if( Object(val) === val ) {
		var obj = {};
		for( var i in val ) {
			obj[this.escape(i)] = val[i];
		}

		return obj;
	}

	if( val === undefined || val === null ) {
		return 'NULL';
	}

	switch( typeof val ) {
		case 'boolean': return (val ? 'true' : 'false');
		case 'number': return val + '';
	}

	val = val.replace( /[\0\n\r\b\t\\\'\"\x1a]/g, function( s ) {
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

	return "'" + val + "'";
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