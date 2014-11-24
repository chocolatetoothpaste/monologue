(function() {
	var rx = /[^a-zA-Z0-9_]/g,
		root = this;

	function monologue() {
		// semi-global object to contain query parts until they are compiled
		var global = {
			query: '',
			join: [],
			where: '',
			having: '',
			order: [],
			group: [],
			limit: '',
			last: '',
			columns: null,
			itr: 0
		};

		return {
			params: {},
			sql: '',

			/**
			 */

			select: function( c, t ) {
				if( Array.isArray( c ) )
					c = c.join( ", " );

				global.query = "SELECT " + c + " FROM " + t;

				return this;
			},


			/**
			 */

			join: function( dir, t, f ) {
				if( typeof f === "undefined" ) {
					f = t;
					t = dir;
					dir = "LEFT";
				}

				if( typeof f === "object" ) {
					var fields = [];
					for( var ii in f ) {
						fields.push( ii + " = " + f[ii] );
					}

					f = fields.join(" AND ");
					delete fields;
				}

				global.join.push( " " + dir + " JOIN " + t + " ON " + f );

				return this;
			},


			/**
			 * t: table, p: params
			 */

			insert: function( t, p ) {
				// I don't know why this would ever NOT be the case
				if( typeof p === "object" ) {
					var c = [];

					// if it's not a nested array, cheat and make it one
					if( toString.call( p ) !== "[object Array]" ) {
						p = [p];
					}

					c = this.stringify( p, "");
					c = "(" + c.shift() + ") VALUES "
						+ c.join(',');
				}

				else if( typeof p === "string" ) {
					var c = p;
				}

				global.query = "INSERT INTO " + t + " " + c;

				return this;
			},


			/**
			 * t: table, p: params
			 */

			update: function( t, p ) {
				if( typeof p === "object" ) {
					var c = this.stringify( p );
					c = "SET " + c.join( ', ' );
				}

				else if( typeof p === "string" ) {
					var c = p;
				}

				else {
					// throw error
				}

				global.query = "UPDATE " + t + " " + c;

				return this;
			},


			/**
			 */

			delete: function( t, w ) {
				global.query = "DELETE FROM " + t;
				return ( w ? this.where( w ) : this );
			},


			/**
			 * w: where statement, s: separator
			 */

			where: function( w, s ) {
				s = ( typeof s === "undefined" ? "AND" : s );
				s = ( s.length > 0 ? " " + s + " " : s );

				if( toString.call( w ) === "[object Object]" ) {
					var crit = this.stringify( w );

					// stringify the where statements
					w = crit.join( s );
				}

				// check if a previous where statement has been set and glue it
				// all together
				global.where = ( global.where.length > 0
					? global.where + s + w
					: w );

				return this;
			},


			/**
			 */

			in: function( ins ) {
				var i = this.stringify( ins, '' );

				// returns "this"
				return this.where( " IN (" + i + ")", "" );
			},


			/**
			 */

			like: function( like, sep ) {
				sep = sep || "AND";

				// calling this.where() will take of stringifying, so gluing the
				// statement together is all that needs to be done here
				var k = "l_" + like.replace(rx, '');
				this.params[k] = like;
				like = " LIKE :" + k;

				return this.where( like, "" );
			},


			/**
			 */

			between: function( one, two ) {
				// create unique field names for each value
				var k1 = "b_" + one.replace(rx, "");
				var k2 = "b_" + two.replace(rx, "");

				this.params[k1] = one;
				this.params[k2] = two;

				return this.where( " BETWEEN :" + k1 + " AND :" + k2, '' );
			},


			/**
			 * g: group, d: direction
			 */

			group: function( g, d ) {
				d = d || 'ASC';

				if( toString.call( g ) === "[object Array]" ) g = g.join( ',' );

				global.group.push( g + " " + d );

				return this;
			},


			/**
			 * h: having
			 */

			having: function( h, sep ) {
				sep = ( typeof sep === "undefined" ? "AND" : sep );

				if( typeof h !== "string" ) {
					var criteria = this.stringify(h);

					// stringify the having statements
					h = criteria.join( " " + sep + " " );
				}

				// check if a previous statement has been set and glue it
				// all together
				global.having = ( global.having.length > 0
					? global.having + " " + sep + " " + h
					: h );

				return this;
			},


			/**
			 * o: order, d: direction
			 */

			order: function( o, d ) {
				d = d || 'ASC';

				if( toString.call( o ) === "[object Array]" ) o = o.join( ',' );

				global.order.push( o + " " + d );

				return this;
			},


			/**
			 * l: limit, o: offset
			 */

			limit: function( l, o ) {
				global.limit = ( typeof o === "undefined" ? l.toString() : o + ", " + l );
				return this;
			},


			/**
			 * f: file path, t: field terminator, e: field enclosure,
			 * l: line terminator
			 */

			file: function( f, t, e, l ) {
				if( typeof l === "undefined" ) {
					l = e;
					e = undefined;
				}

				global.last += " INTO OUTFILE '" + f
					+ "' FIELDS TERMINATED BY '" + t + "' "
					+ ( e ? "OPTIONALLY ENCLOSED BY '" + e + "'" : '' )
					+ " LINES TERMINATED BY '" + l + "'";

				return this;
			},


			/**
			 * Compile each part together and generate a valid SQL statement
			 */

			query: function() {
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
			},


			/**
			 * Takes an object or and array of objects and builds a SQL string
			 * p: params, s: separator, pre: bound param prefix
			 */

			stringify: function( p, s ) {
				s = ( typeof s === "undefined" ? "=" : s );
				var c = [];

				if( Array.isArray( p ) ) {
					for( var ii = 0, l = p.length; ii < l; ++ii ) {
						// if parent is an array and child is an object,
						// generate an encapsulated list of values (for inserts)
						if( toString.call( p[ii] ) === "[object Object]" ) {
							if( c.length === 0 ) {
								// grab the column names from the first object
								global.columns = Object.keys( p[0] ).sort();
								c.push( global.columns );
							}
							c.push( "(" + this.stringify( p[ii], "" ) + ")");
						}

						// I can't think of a circumstance where this block
						// would ever execute. further testing needed.
						else {
							// generate a comma-separated list of fields
							c.push( this.format( p[ii], ii, "" ) );
						}
					}
				}

				else {
					var col = global.columns || Object.keys( p ).sort();
					for( var jj = 0, len = col.length; jj < len; ++jj ) {
						if( Array.isArray( p[col[jj]] ) ) {
							c.push( col[jj] + " IN (" + this.stringify( p[col[jj]] ) + ")" );
						}

						else {
							c.push( this.format( p[col[jj]], col[jj], s ) );
						}
					}
				}

				return c;
			},


			/**
			 * takes a key/value and formats it for use in a bound-param query
			 */

			format: function( v, k, s ) {
				// using an iterator for field names to avoid collisions
				++global.itr;
				var r = "mono_" + global.itr;

				// add value to the param stack
				this.params[r] = v;

				// spit out the bound param name
				return ( s.length > 0 ? k + " " + s + " " : '' ) + ":" + r;
			}
		}
	}

	if( typeof module !== "undefined" && module.exports ) {
		module.exports = monologue;
	}
	else {
		root.monologue = monologue;
	}

})();