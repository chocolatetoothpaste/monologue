(function() {
	var rx = /[^a-zA-Z0-9_]/g,
		root = this,
		qparts = {
			query: '',
			where: '',
			having: '',
			order: [],
			group: [],
			limit: ''
		};

	function Monologue() {
		this.params = {}, this.sql = '';
	};

	function monologue() {
		qparts = {
			query: '',
			where: '',
			having: '',
			order: [],
			group: [],
			limit: ''
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

		c = ( typeof c === "string" ? c : c.join(", ") );

		qparts.query = "SELECT " + c + " FROM " + t;

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
			if( toString.call(params) !== "[object Array]" ) {
				params = [params];
			}

			columns = this.stringify( params, "");

			// console.log(columns);
			// columns = "VALUES " + columns.join();
			columns = " (" + columns.shift() + ") VALUES " + columns.join(',');
		}

		else if( typeof params === "string" ) {
			var columns = " " + params;
		}
		else {
			// emit error
		}

		qparts.query = "INSERT INTO " + table + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.update = function( table, params ) {
		this.reset();

		if( typeof params === "object" ) {
			var columns = this.stringify(params);
			columns = " SET " + columns.join( ', ' );
		}

		else if( typeof params === "string" ) {
			var columns = " " + params;
		}

		else {
			// throw error
		}

		qparts.query = "UPDATE " + table + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.delete = function( table, where )
	{
		this.reset();

		qparts.query = "DELETE FROM " + table;
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
		qparts.where = ( qparts.where.length > 0
			? qparts.where + s + w
			: w );

		return this;
	}


	/**
	 */

	Monologue.prototype.having = function( h, separator ) {
		separator = ( typeof separator === "undefined" ? "AND" : separator );

		if( typeof h !== "string" ) {
			var criteria = this.stringify(h);

			// stringify the having statements
			h = criteria.join( " " + separator + " " );
		}

		// check if a previous where statement has been set and glue it all together
		qparts.having = ( qparts.having.length > 0
			? qparts.having + " " + separator + " " + h
			: h );

		return this;
	}


	/**
	 */

	Monologue.prototype.in = function( ins, field ) {
		field = field || "";
		var i = this.stringify( [ins], '', '__in_');

		i = " IN (" + i.join(",") + ")";

		// returns "this"
		return this.where( i, "" );
	}


	/**
	 */

	Monologue.prototype.like = function( like, separator ) {
		separator = separator || "AND";

		// calling this.where() will take of stringifying, so gluing the
		// statement together is all that needs to be done here
		var k = "__like_" + like.replace(rx, '');
		this.params[k] = like;
		like = " LIKE :" + k;

		return this.where( like, "" );
	}


	/**
	 */

	Monologue.prototype.between = function( one, two )
	{
		// create unique field names for each value
		var k1 = "__between_" + one.replace(rx, "");
		var k2 = "__between_" + two.replace(rx, "");

		this.params[k1] = one;
		this.params[k2] = two;

		return this.where( " BETWEEN :" + k1 + " AND :" + k2, '' );
	}


	/**
	 * group, direction
	 */

	Monologue.prototype.group = function( g, d ) {
		d = d || 'ASC';

		if( typeof g !== "string" ) g = g.join( ',' );

		qparts.group.push( g + " " + d );

		return this;
	}


	/**
	 * order, direction
	 */

	Monologue.prototype.order = function( o, d ) {
		d = d || 'ASC';

		if( typeof o !== "string" ) o = o.join( ',' );

		qparts.order.push( o + " " + d );

		return this;
	}


	/**
	 * limit, offset
	 */

	Monologue.prototype.limit = function( l, o )
	{
		qparts.limit = ( typeof o === "undefined" ? l : o + ", " + l );
		return this;
	}


	/**
	 * Compile each part together and generate a valid SQL statement
	 */

	Monologue.prototype.query = function()
	{
		if( qparts.where.length > 0 )
			qparts.query += " WHERE " + qparts.where;
		if( qparts.group.length > 0 )
			qparts.query += " GROUP BY " + qparts.group.join(',');
		if( qparts.having.length > 0 )
			qparts.query += " HAVING " + qparts.having;
		if( qparts.order.length > 0 )
			qparts.query += " ORDER BY " + qparts.order.join(',');
		if( qparts.limit.length > 0 )
			qparts.query += " LIMIT " + qparts.limit;

		this.sql = qparts.query;

		return this;
	}


	/**
	 * s: serator
	 */

	Monologue.prototype.stringify = function( params, s, pre ) {
		s = ( typeof s === "undefined" ? "=" : s );
		pre = pre || '__eq_';
		var columns = [],
			type = toString.call( params );// === "[object Array]";

		if( type === "[object Array]" ) {
			for( var ii = 0, l = params.length; ii < l; ++ii ) {
				if( toString.call( params[ii] ) === "[object Object]" ) {
					// if columns is empty, then push the actual column names first
					if( columns.length === 0 ) {
						columns.push( Object.keys( params[ii] ) );
					}

					columns.push( "(" + this.stringify( params[ii], "" ) + ")");
				}
				else {
					columns.push( this.stringify( params[ii], s, pre ) );
				}
			}
		}

		else if( type === "[object Object]" ) {
			for( k in params ) {
				if( toString.call( params[k] ) === "[object Array]" ) {
					columns.push( k
						+ " IN (" + this.stringify( params[k], "", "__in_" )
						+ ")" );
				}
				else {
					columns.push( this.stringify( params[k], s, pre ) );
				}
			}
		}

		else {
			var i = pre + params.toString().replace(rx, "");
			var v = ( s.length > 0 ? k + " " + s + " " : '' ) + ":" + i;
			this.params[i] = params;

			columns.push( v );
		}

		return columns;
	}


	/**
	 * Reset all placeholders so next query isn't polluted
	 */

	Monologue.prototype.reset = function() {
		this.params = {};

		qparts = {
			query: '',
			where: '',
			having: '',
			order: [],
			group: [],
			limit: ''
		};
	}
})();
