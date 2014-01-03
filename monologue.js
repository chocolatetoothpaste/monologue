(function() {
	var rx = /[^a-zA-Z0-9_]/g,
		root = this,
		global = {
			query: '',
			join: [],
			where: '',
			having: '',
			order: [],
			group: [],
			limit: '',
			last: ''
		};

	function Monologue() {
		this.params = {}, this.sql = '';
	};

	function monologue() {
		global = {
			query: '',
			join: [],
			where: '',
			having: '',
			order: [],
			group: [],
			limit: '',
			last: ''
		};

		return new Monologue;
	}

	if( typeof module !== "undefined" && module.exports ) {
		module.exports = new Monologue;
		// module.exports = monologue;
	}
	else {
		root.monologue = new Monologue;
		// root.monologue = monologue;
	}


	/**
	 */

	Monologue.prototype.select = function( c, t ) {
		this.reset();

		if( toString.call( c ) === "[object Array]" )
			c = c.join( ", " );

		global.query = "SELECT " + c + " FROM " + t;

		return this;
	}


	/**
	 * d: direction, t: table, f: fields
	 */

	Monologue.prototype.join = function( d, t, f ) {
		if( typeof f === "undefined" ) {
			f = t;
			t = d;
			d = "LEFT";
		}

		if( typeof f === "object" ) {
			var fields = [];
			for( var ii in f ) {
				fields.push( ii + " = " + f[ii] );
			}

			f = fields.join(" AND ");
		}

		global.join.push( " " + d + " JOIN " + t + " ON " + f );

		return this;
	}


	/**
	 */

	Monologue.prototype.insert = function( table, params ) {
		this.reset();

		// I don't know why this would ever NOT be ther case
		if( typeof params === "object" ) {
			var columns = [], values = [], index = 0;

			// if it's not a multidimensional array, cheat and make it one
			if( toString.call( params ) !== "[object Array]" ) {
				params = [params];
			}

			columns = this.stringify( params, "");
			columns = "(" + columns.shift() + ") VALUES " + columns.join(',');
		}

		else if( typeof params === "string" ) {
			var columns = params;
		}

		else {
			// emit error
		}

		global.query = "INSERT INTO " + table + " " + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.update = function( table, params ) {
		this.reset();

		if( typeof params === "object" ) {
			var columns = this.stringify(params);
			columns = "SET " + columns.join( ', ' );
		}

		else if( typeof params === "string" ) {
			var columns = params;
		}

		else {
			// throw error
		}

		global.query = "UPDATE " + table + " " + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.delete = function( table, where ) {
		this.reset();

		global.query = "DELETE FROM " + table;
		return ( where ? this.where( where ) : this );
	};


	/**
	 * w: where statement, s: separator
	 */

	Monologue.prototype.where = function( w, s ) {
		s = ( typeof s === "undefined" ? "AND" : s );
		s = ( s.length > 0 ? " " + s + " " : s );

		// console.log(w)

		if( toString.call( w ) === "[object Object]" ) {
			var criteria = this.stringify( w );

			// stringify the where statements
			w = criteria.join( s );
		}

		// check if a previous where statement has been set and glue it all together
		global.where = ( global.where.length > 0
			? global.where + s + w
			: w );

		return this;
	}


	/**
	 */

	Monologue.prototype.in = function( ins ) {
		var i = this.stringify( ins, '' );

		// returns "this"
		return this.where( " IN (" + i.join( "," ) + ")", "" );
	}


	/**
	 */

	Monologue.prototype.like = function( like, separator ) {
		separator = separator || "AND";

		// calling this.where() will take of stringifying, so gluing the
		// statement together is all that needs to be done here
		var k = "l_" + like.replace(rx, '');
		this.params[k] = like;
		like = " LIKE :" + k;

		return this.where( like, "" );
	}


	/**
	 */

	Monologue.prototype.between = function( one, two ) {
		// create unique field names for each value
		var k1 = "b_" + one.replace(rx, "");
		var k2 = "b_" + two.replace(rx, "");

		this.params[k1] = one;
		this.params[k2] = two;

		return this.where( " BETWEEN :" + k1 + " AND :" + k2, '' );
	}


	/**
	 * g: group, d: direction
	 */

	Monologue.prototype.group = function( g, d ) {
		d = d || 'ASC';

		if( toString.call( g ) === "[object Array]" ) g = g.join( ',' );

		global.group.push( g + " " + d );

		return this;
	};


	/**
	 * h: having
	 */

	Monologue.prototype.having = function( h, separator ) {
		separator = ( typeof separator === "undefined" ? "AND" : separator );

		if( typeof h !== "string" ) {
			var criteria = this.stringify(h);

			// stringify the having statements
			h = criteria.join( " " + separator + " " );
		}

		// check if a previous where statement has been set and glue it all together
		global.having = ( global.having.length > 0
			? global.having + " " + separator + " " + h
			: h );

		return this;
	}


	/**
	 * o: order, d: direction
	 */

	Monologue.prototype.order = function( o, d ) {
		d = d || 'ASC';

		if( toString.call( o ) === "[object Array]" ) o = o.join( ',' );

		global.order.push( o + " " + d );

		return this;
	}


	/**
	 * l: limit, o: offset
	 */

	Monologue.prototype.limit = function( l, o ) {
		global.limit = ( typeof o === "undefined" ? l : o + ", " + l );
		return this;
	}


	/**
	 * f: file path, t: field terminator, e: field enclosure, l: line terminator
	 */

	Monologue.prototype.file = function( f, t, e, l ) {
		if( typeof l === "undefined" ) {
			l = e;
			e = undefined;
		}

		global.last += " INTO OUTFILE '" + f + "' FIELDS TERMINATED BY '"
			+ t + "' " + ( e ? "OPTIONALLY ENCLOSED BY '" + e + "'" : '' )
			+ " LINES TERMINATED BY '" + l + "'";

		return this;
	};


	/**
	 * Compile each part together and generate a valid SQL statement
	 */

	Monologue.prototype.query = function() {
		if( global.join.length > 0 )
			global.query += global.join.join();
		if( global.where.length > 0 )
			global.query += " WHERE " + global.where;
		if( global.group.length > 0 )
			global.query += " GROUP BY " + global.group.join(',');
		if( global.having.length > 0 )
			global.query += " HAVING " + global.having;
		if( global.order.length > 0 )
			global.query += " ORDER BY " + global.order.join(',');
		if( global.limit.length > 0 )
			global.query += " LIMIT " + global.limit;
		if( global.last.length > 0 )
			global.query += global.last;

		this.sql = global.query;

		return this;
	}


	/**
	 * p: params, s: separator, pre: bound param prefix
	 */

	Monologue.prototype.stringify = function( p, s ) {
		s = ( typeof s === "undefined" ? "=" : s );
		var c = [],
			type = toString.call( p );

		if( type === "[object Array]" ) {
			for( var ii = 0, l = p.length; ii < l; ++ii ) {

				// if parent is an array and child is an object, generate an
				// encapsulated list of values (for insert statements)
				if( toString.call( p[ii] ) === "[object Object]" ) {

					// if "c" is empty, then push the actual column names
					if( c.length === 0 ) c.push( Object.keys( p[ii] ) );

					c.push( "(" + this.stringify( p[ii], "" ) + ")");
				}

				else {

					// generate a comma-separated list of fields
					c.push( this.format( p[ii], ii, "" ) );
				}
			}
		}

		else {
			for( var jj in p ) {
				if( toString.call( p[jj] ) === "[object Array]" ) {
					c.push( jj + " IN (" + this.stringify( p[jj] ) + ")" );
				}

				else {
					c.push( this.format( p[jj], jj, s ) );
				}
			}
		}

		return c;
	}


	/**
	 */

	Monologue.prototype.format = function( v, k, s ) {
		// strip out non-alpha characters (makes parsers choke)
		var push = v.toString().replace( rx, "" );

		// add value to the param stack
		this.params[push] = v;

		// spit out the bound param name
		return ( s.length > 0 ? k + " " + s + " " : '' ) + ":e_" + push;
	}


	/**
	 * Reset all placeholders so next query isn't polluted
	 */

	Monologue.prototype.reset = function() {
		this.params = {};

		global = {
			query: '',
			join: [],
			where: '',
			group: [],
			having: '',
			order: [],
			limit: '',
			last: ''
		};
	}

})();
