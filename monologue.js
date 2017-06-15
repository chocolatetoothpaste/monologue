(function(exports) {
"use strict";

function condition(cond, sep = 'AND', part) {
	sep = ( sep.length > 0 ? " " + sep + " " : sep );

	if( cond instanceof Array && Object(cond[0]) === cond[0] ) {
		cond = cond.map((v, k, arr) => {
			return arr[k] = this.stringify( v ).join(' AND ');
		}).join(' OR ');

		// join an array of objects with OR
		cond = `(${cond})`;
	}

	else if( cond instanceof Array ) {
		cond = cond.join(' OR ');
	}

	else if( cond === Object(cond) ) {
		// stringify the where statements
		cond = this.stringify( cond, '=', 'IS' ).join( sep );
	}

	part = ( part.length > 0 ? part + sep + cond : cond );

	return part;
}


function monologue(opt) {
	return new Monologue(opt);
}

function Monologue(opt) {
	// default values
	this.opt = {};

	var dict = { escape: true, backquote: true, sort_keys: false };

	if( typeof opt === "undefined" ) {
		this.opt = dict;
	}

	else {
		for( var i in dict ) {
			this.opt[i] = ( typeof opt[i] === "undefined" ? dict[i] : opt[i] );
		}
	}

	this.parts = {};

	// store whether where() or having() was used last
	// default is "where" (presumably used more often)
	// (I hope this doesn't get ugly)
	this.last_condition = this.where;

	// set the inital parts container
	this.reset();
}


/**
 * all the "parts" of a query
 */

Monologue.prototype.reset = function reset() {
	this.parts = {
		stmt: '',
		sql: '',
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
	if( typeof tbl === 'undefined' ) {
		tbl = col;
		col = '*';
	}

	if( this.opt.backquote ) {
		tbl = this.backquote(tbl);

		if( col !== '*' ) col = this.backquote(col);
	}

	if( col instanceof Array ) {
		col = col.join( ', ' );
	}

	this.parts.stmt = `SELECT ${col} FROM ${tbl}`;

	return this;
};


/**
 * direction, table, statement
 */

Monologue.prototype.join = function join( dir, tbl, stmt ) {
	// default to inner join if not specified (parity with mysql)
	if( typeof stmt === 'undefined' ) {
		stmt = tbl;
		tbl = dir;
		dir = 'INNER';
	}

	if( this.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( typeof stmt === 'object' ) {
		if( this.opt.backquote ) {
			stmt = this.backquote(stmt);
		}

		const fields = [];
		for( let ii in stmt ) {
			fields.push( `${ii} = ${stmt[ii]}` );
		}

		stmt = fields.join(' AND ');
	}

	this.parts.join.push( `${dir} JOIN ${tbl} ON ${stmt}` );

	return this;
};

Monologue.prototype.ljoin = function ljoin( tbl, stmt ) {
	return this.join( 'LEFT', tbl, stmt );
};

Monologue.prototype.rjoin = function rjoin( tbl, stmt ) {
	return this.join( 'RIGHT', tbl, stmt );
};

Monologue.prototype.lojoin = function lojoin( tbl, stmt ) {
	return this.join( 'LEFT OUTER', tbl, stmt );
};

Monologue.prototype.rojoin = function rojoin( tbl, stmt ) {
	return this.join( 'RIGHT OUTER', tbl, stmt );
};


/**
 * t: table, p: params, d: data
 */

Monologue.prototype.insert = function insert( tbl, p, d ) {
	let col = '';

	if( this.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( p instanceof Array && d instanceof Array ) {
		p = this.backquote( p ).join(',');
		var d = this.stringify( d, "", "");
		// stringify should be refactored a bit so this isn't necessary
		d.shift();
		d = d.join(',');

		col = `(${p}) VALUES ${d}`;
	}

	// Array is also an object
	else if( typeof p === "object" ) {
		// if it's not a nested array, cheat and make it one
		if( ! ( p instanceof Array ) ) {
			p = [p];
		}

		let a = this.stringify( p, "", "");

		col = `(${a.shift()}) VALUES ${a.join(',')}`;
	}

	else if( typeof p === "string" ) {
		col = p;
	}

	this.parts.stmt = `INSERT INTO ${tbl} ${col}`;

	return this;
};


/**
 * t: table, p: params
 */

Monologue.prototype.update = function update( tbl, p ) {
	let col = '';

	if( this.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	if( typeof p === 'object' ) {
		col = this.stringify( p ).join( ', ' );
		col = `SET ${col}`;
	}

	else {
		col = p;
	}

	this.parts.stmt = `UPDATE ${tbl} ${col}`;

	return this;
};

Monologue.prototype.on_duplicate = function on_duplicate(tbl, p) {

};


/**
 * Free-hand queries
 */
 
Monologue.prototype.query = function query(stmt) {
	this.parts.stmt = stmt;

	return this;
};


/**
 */

Monologue.prototype.delete = function _delete( tbl, wh ) {
	if( this.opt.backquote ) {
		tbl = this.backquote(tbl);
	}

	this.parts.stmt = `DELETE FROM ${tbl}`;
	return ( wh ? this.where( wh ) : this );
};


/**
 */

Monologue.prototype.where = function where( wh, sep ) {
	this.parts.where = condition.call( this, wh, sep, this.parts.where );

	this.last_condition = this.where;

	return this;
};


/**
 */

Monologue.prototype.having = function having( hav, sep ) {
	this.parts.having = condition.call( this, hav, sep, this.parts.having );

	this.last_condition = this.having;

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
	if( this.opt.escape ) {
		like = this.escape(like);
	}

	return this.where(` LIKE ${like}`, '');
};


/**
 */

Monologue.prototype.between = function between( one, two ) {
	if( this.opt.escape ) {
		one = this.escape(one);
		two = this.escape(two);
	}

	return this.where(` BETWEEN ${one} AND ${two}`, '');
};


/**
 */

Monologue.prototype.group = function group( grp, dir = 'ASC' ) {
	if( this.opt.backquote ) {
		grp = this.backquote(grp);
	}

	if( grp instanceof Array )
		grp = grp.join( ', ' );

	this.parts.group.push( `${grp} ${dir}` );

	return this;
};


/**
 */

Monologue.prototype.order = function order( ord, dir = 'ASC' ) {
	if( this.opt.backquote ) {
		ord = this.backquote(ord);
	}

	if( ord instanceof Array )
		ord = ord.join( ', ' );

	this.parts.order.push( `${ord} ${dir}` );

	return this;
};


/**
 */

Monologue.prototype.limit = function limit( lim, off ) {
	this.parts.limit = ( typeof off === "undefined"
		? `${lim}`
		: `${lim} OFFSET ${off}` );

	return this;
};


Monologue.prototype.union = function union( c, t ) {
	if( this.opt.backquote ) {
		t = this.backquote(t);

		if( c !== '*' ) c = this.backquote(c);
	}

	if( c instanceof Array )
		c = c.join( ", " );

	let sql = this.sql();

	this.reset();

	this.parts.stmt = `${sql} UNION SELECT ${c} FROM ${t}`;

	return this;
};


Monologue.prototype.not = function not(p, sep = 'AND') {
	sep = ` ${sep} `;

	if( p instanceof Array && Object(p[0]) === p[0]  ) {
		this.where( p.map(function(v, k) {
			return this.stringify(v, '!=')
		}.bind(this)).join(sep) );
	}

	else if( p instanceof Array ) {
		this.where( ' NOT' + this.format(p, ''), '' );
	}

	else if( Object(p) === p ) {
		this.where( this.stringify(p, '!=', 'IS NOT').join(sep) );
	}

	//*** not sure if these 2 blocks belong. they make queries read more
	//*** naturally, but by adding complexity...

	//*** sample usage
	// mono().select('dinner').where('meat').not('pork').sql()
	// mono().select('dinner').where('meat').not(null).sql()

	// else if( typeof p === 'string' ) {
	// 	this.where( this.format(p), '!=' );
	// }

	// else if( p === null ) {
	// 	this.where( ' IS NOT NULL', '' );
	// }

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

Monologue.prototype.comparison = function comparison(p, sep = 'AND', eq) {
	sep = ` ${sep} `;

	if( p instanceof Array && Object(p[0]) === p[0]  ) {
		sep = sep.trim();

		this.last_condition.call( this, p.map((val) => {
			return this.stringify( val, eq ).join(' AND ');
		}), sep );
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
	if( typeof l === 'undefined' ) {
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

Monologue.prototype.sql = function sql() {
	// start from scratch each time this is called
	this.parts.sql = this.parts.stmt;

	if( this.parts.join.length > 0 )
		this.parts.sql += ' ' + this.parts.join.join(' ');

	if( this.parts.where.length > 0 )
		this.parts.sql += ' WHERE ' + this.parts.where;

	if( this.parts.group.length > 0 )
		this.parts.sql += ' GROUP BY ' + this.parts.group.join(',');

	if( this.parts.having.length > 0 )
		this.parts.sql += ' HAVING ' + this.parts.having;

	if( this.parts.order.length > 0 )
		this.parts.sql += ' ORDER BY ' + this.parts.order.join(',');

	if( this.parts.limit.length > 0 )
		this.parts.sql += ' LIMIT ' + this.parts.limit;

	if( this.parts.last.length > 0 )
		this.parts.sql += this.parts.last;

	return this.parts.sql;
};


Monologue.prototype.explain = function explain() {
	return `EXPLAIN ${this.sql()}`;
};


/**
 * Takes an object or an array of objects and builds a SQL string
 * p: params, s: separator
 */

Monologue.prototype.stringify = function stringify( p, s = '=', ns = '=', j = ', ' ) {
	const c = [];

	if( p instanceof Array ) {
		for( let ii = 0, l = p.length; ii < l; ++ii ) {
			// if parent is an array and child is an object,
			// generate an encapsulated list of values (for inserts)
			if( p[ii] === Object(p[ii]) ) {
				if( c.length === 0 ) {
					// grab the column names from the first object
					this.parts.columns = Object.keys( p[0] );

					if( this.opt.sort_keys )
						this.parts.columns.sort();

					// these columns don't get passed through monologue.format
					// so do it here, if applicable
					let cols = ( this.opt.backquote
						? this.backquote( this.parts.columns )
						: this.parts.columns );

					c.push( cols.join(j) );
				}

				let str = this.stringify( p[ii], s, ns ).join(j);

				c.push( `(${str})` );
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
			var col = ( this.opt.sort_keys
				? Object.keys(p).sort()
				: Object.keys(p) );
		}
		else {
			var col = this.parts.columns;
		}

		for( var jj = 0, len = col.length; jj < len; ++jj ) {
			c.push( this.format( p[col[jj]], col[jj], s, ns ) );
		}
	}

	return c;
};


/**
 * takes a key/value and formats it for use in a bound-param query
 */

Monologue.prototype.format = function format( v, k = '', s, ns ) {
	if( v instanceof Array ) {
		let vesc = v.map( (v) => {
			return this.escape(v);
		}).join(',');

		let ret = ( this.opt.backquote && k ? this.backquote( k ) : k )
			+ ` IN (${vesc})`;

		return ret;
	}

	else {
		if( this.opt.escape ) {
			v = this.escape(v);
		}

		if( k && this.opt.backquote ) {
			k = this.backquote(k);

			// if( v === 'NULL' && s ) {
				// s = ( s === '=' ? 'IS' : 'IS NOT' );
			// }
			if( v === 'NULL' ) 
				s = ns;
		}

		// if s and/or k is undefined, it is an array of values so just format
		// value and ditch the key and separator
		return ( k && s ? `${k} ${s} ` : '' ) + v;
	}

};


/**
 * Escape unsafe characters to prevent sql injection
 */

Monologue.prototype.escape = function escape( val ) {
	if( val === undefined || val === null ) {
		return 'NULL';
	}

	if( val instanceof Array ) {
		return val.map( (v) => {
			return this.escape(v);
		});
	}

	else if( Object(val) === val ) {
		const obj = {};
		for( let i in val ) {
			obj[i] = val[i];
		}

		return obj;
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

	return `'${val}'`;
};


Monologue.prototype.backquote = function backquote( col, pre ) {
	if( col instanceof Array ) {
		return col.map( (v) => {
			return this.backquote(v, pre);
		});
	}

	else if( col === Object(col) ){
		const obj = {};
		for( let i in col ) {
			obj[this.backquote(i, pre)] = col[i];
		}

		return obj;
	}

	else {
		if( typeof pre !== 'undefined' ) {
			pre += '`.`';
		}
		else {
			pre = '';
		}

		//*** this could be turned on after some extensive testing, might be
		//*** handy when column prefixes must be handled manually
		//*** the regex seems to be working nicley in prelim tests though

		// return '`' + col.replace(/(?!\w)(\.)(?=[a-z])+/gi, '`$1`') + '`';

		return `\`${pre}${col}\``;
	}
};

Monologue.prototype.prepare = function prepare( p, pre ) {
	return this.backquote(this.escape(p), pre);
};

if( typeof module !== "undefined" && module.exports ) {
	module.exports = monologue;
}
else {
	window.monologue = monologue;
}

})( typeof window === 'undefined' ? module.exports : window );