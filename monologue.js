(function(exports) {
	"use strict";

	function monologue(opt) {
		var dict = { escape: true };

		if( typeof opt === "undefined" ) {
			opt = dict;
		}
		else {
			for( var i in dict ) {
				opt[i] = ( typeof opt[i] === "undefined" ? dict[i] : opt[i] );
			}
		}

		// semi-global object to contain query parts until they are compiled
		var _g = {
			query: '',
			join: [],
			where: '',
			having: '',
			order: [],
			group: [],
			limit: '',
			last: '',
			columns: null,
			itr: 0,
		};

		return {
			params: {},
			sql: '',


			/**
			 * resets the global container object
			 */

			reset: function() {
				_g = {
					query: '',
					join: [],
					where: '',
					having: '',
					order: [],
					group: [],
					limit: '',
					last: '',
					columns: null,
					itr: 0,
				};
			},

			/**
			 */

			select: function( col, tbl ) {
				if( Array.isArray( col ) )
					col = col.join( ", " );

				_g.query = "SELECT " + col + " FROM " + tbl;

				return this;
			},


			/**
			 * direction, table, statement
			 */

			join: function( dir, tbl, stmt ) {
				// default to inner join if unspecified (parity with mysql)
				if( typeof stmt === "undefined" ) {
					stmt = tbl;
					tbl = dir;
					dir = "INNER";
				}

				if( typeof stmt === "object" ) {
					var fields = [];
					for( var ii in stmt ) {
						fields.push( ii + " = " + stmt[ii] );
					}

					stmt = fields.join(" AND ");
				}

				_g.join.push( " " + dir + " JOIN " + tbl + " ON " + stmt );

				return this;
			},


			/**
			 * t: table, p: params
			 */

			insert: function( tbl, p ) {
				var col = '';

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

				_g.query = "INSERT INTO " + tbl + " " + col;

				return this;
			},


			/**
			 * t: table, p: params
			 */

			update: function( tbl, p ) {
				var col = '';

				if( typeof p === "object" ) {
					col = "SET " + this.stringify( p ).join( ', ' );
				}

				else if( typeof p === "string" ) {
					col = p;
				}

				else {
					// throw error
				}

				_g.query = "UPDATE " + tbl + " " + col;

				return this;
			},


			/**
			 */

			delete: function( tbl, wh ) {
				_g.query = "DELETE FROM " + tbl;
				return ( wh ? this.where( wh ) : this );
			},


			/**
			 */

			where: function( wh, sep ) {
				sep = ( typeof sep === "undefined" ? "AND" : sep );
				sep = ( sep.length > 0 ? " " + sep + " " : sep );

				if( wh === Object(wh) ) {
					// stringify the where statements
					wh = this.stringify( wh ).join( sep );
				}

				// check if a previous where statement has been set and glue it
				// all together
				_g.where = ( _g.where.length > 0
					? _g.where + sep + wh
					: wh );

				return this;
			},

			and: function( wh ) {
				return this.where( wh, 'AND' );
			},

			or: function( wh ) {
				return this.where( wh, 'OR' );
			},


			/**
			 */

			in: function( ins ) {
				ins = this.stringify( ins, '' );

				// returns "this"
				return this.where( " IN (" + ins + ")", "" );
			},


			/**
			 */

			like: function( like, sep ) {
				sep = sep || "AND";

				// calling this.where() will take of stringifying, so gluing the
				// statement together is all that needs to be done here
				if( opt.escape ) {
					like = " LIKE " + this.escape(like);
				}

				else {
					var k = "l_" + like.replace(/[^a-zA-Z0-9_]/g, '');
					this.params[k] = like;
					like = " LIKE :" + k;
				}

				_g.where += like;

				return this;
			},


			/**
			 */

			between: function( one, two ) {
				var between = '';

				if( opt.escape ) {
					between = " BETWEEN " + this.escape(one) + " AND "
						+ this.escape(two);
				}

				else {

					// create unique field names for each value
					var k1 = "b_" + one.replace(/[^a-zA-Z0-9_]/g, "");
					var k2 = "b_" + two.replace(/[^a-zA-Z0-9_]/g, "");

					this.params[k1] = one;
					this.params[k2] = two;

					between = " BETWEEN :" + k1 + " AND :" + k2
				}

				_g.where += between;

				return this;
			},


			/**
			 */

			group: function( grp, dir ) {
				dir = dir || 'ASC';

				if( Array.isArray( grp ) )
					grp = grp.join( ', ' );

				_g.group.push( grp + " " + dir );

				return this;
			},


			/**
			 */

			having: function( hav, sep ) {
				sep = ( typeof sep === "undefined" ? "AND" : sep );
				sep = ( sep.length > 0 ? " " + sep + " " : sep );

				if( typeof hav !== "string" ) {
					// stringify the having statements
					hav = this.stringify(hav).join( sep );
				}

				// check if a previous statement has been set and glue it
				// all together
				_g.having = ( _g.having.length > 0
					? _g.having + sep + hav
					: hav );

				return this;
			},


			/**
			 */

			order: function( ord, dir ) {
				dir = dir || 'ASC';

				if( Array.isArray( ord ) )
					ord = ord.join( ', ' );

				_g.order.push( ord + " " + dir );

				return this;
			},


			/**
			 */

			limit: function( lim, off ) {
				_g.limit = ( typeof off === "undefined"
					? '' + lim
					: off + ", " + lim );
				return this;
			},


			union: function( c, t ) {
				if( Array.isArray( c ) )
					c = c.join( ", " );

				var sql = this.query().sql;

				this.reset();

				_g.query = sql += " UNION SELECT " + c + " FROM " + t;

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

				_g.last += " INTO OUTFILE '" + f
					+ "' FIELDS TERMINATED BY '" + t + "' "
					+ ( e ? "OPTIONALLY ENCLOSED BY '" + e + "'" : '' )
					+ " LINES TERMINATED BY '" + l + "'";

				return this;
			},


			/**
			 * Compile each part together and generate a valid SQL statement
			 */

			query: function() {
				if( _g.join.length > 0 )
					_g.query += _g.join.join('');
				if( _g.where.length > 0 )
					_g.query += " WHERE " + _g.where;
				if( _g.group.length > 0 )
					_g.query += " GROUP BY " + _g.group.join(',');
				if( _g.having.length > 0 )
					_g.query += " HAVING " + _g.having;
				if( _g.order.length > 0 )
					_g.query += " ORDER BY " + _g.order.join(',');
				if( _g.limit.length > 0 )
					_g.query += " LIMIT " + _g.limit;
				if( _g.last.length > 0 )
					_g.query += _g.last;

				this.sql = _g.query;

				return this;
			},


			/**
			 * Takes an object or and array of objects and builds a SQL string
			 * p: params, s: separator
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
								_g.columns = Object.keys( p[0] ).sort();

								c.push( _g.columns.join(', ') );
							}

							c.push( "("
								+ this.stringify( p[ii], "" )
								+ ")"
							);
						}

						else {
							// generate a comma-separated list of fields
							c.push( this.format( p[ii], ii, "" ) );
						}
					}
				}

				else {
					var col = _g.columns || Object.keys( p ).sort();

					for( var jj = 0, len = col.length; jj < len; ++jj ) {
						// matching a column to a set, i.e. {id: [1,2,3,4]}
						if( Array.isArray( p[col[jj]] ) ) {
							var n = col[jj]
								+ " IN ("
								+ this.stringify( p[col[jj]] )
								+ ")";

							c.push( n );
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
				var r;

				if( opt.escape ) {
					r = this.escape(v);
				}
				else {
					// using an iterator for field names to avoid collisions
					++_g.itr;
					r = ":mono_" + _g.itr;

					// add value to the param stack
					this.params[r] = v;
				}

				// spit out the bound param name
				return ( s.length > 0 ? k + " " + s + " " : '' ) + r;

			},


			/**
			 * Escape unsafe characters to prevent sql injection
			 */

			escape: function( v ) {
				if( v === undefined || v === null ) {
					return 'NULL';
				}

				switch( typeof v ) {
					case 'boolean': return (v) ? 'true' : 'false';
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
			},


			backquote: function( col ) {
				if( Array.isArray(col) ) {
					return col.map(function(v) {
						return ( typeof v === 'object'
							? this.backquote(v)
							: '`' + v + '`'
						);
					// maintaining execution scope to avoid setting a var
					// (can't wait to upgrade node 4+)
					}.bind(this));
				}

				else if( col === Object(col) ){
					var obj = {};
					for( var i in col ) {
						obj['`' + i + '`'] = col[i];
					}

					return obj;
				}

				else {
					return '`' + col + '`';
				}
			}
		}
	}

	if( typeof module !== "undefined" && module.exports ) {
		module.exports = monologue;
	}
	else {
		window.monologue = monologue;
	}

})( typeof window === 'undefined' ? module.exports : window );