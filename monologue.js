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
		this.params = {};
	};

	if( typeof module !== "undefined" && module.exports ) {
		module.exports = new Monologue;
	}
	else {
		root.monologue = new Monologue;
	}


	/**
	 */

	Monologue.prototype.select = function( c, t ) {
		c = ( typeof c === "string" ? c : c.join(", ") );

		qparts.query = "SELECT " + c + " FROM " + t;

		return this;
	}


	/**
	 */

	Monologue.prototype.where = function( w, separator ) {
		// if( typeof separator === "undefined" ) {
		// 	separator = opt;
		// 	opt = null;
		// }

		separator = ( typeof separator === "undefined" ? "AND" : separator );

		if( typeof w !== "string" ) {
			var criteria = this.stringify(w);

			// stringify the where statements
			w = criteria.join( " " + separator + " " );
		}

		// check if a previous where statement has been set and glue it all together
		qparts.where = ( qparts.where.length > 0
			? qparts.where + " " + separator + " " + w
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
		var i = this.stringify(ins, '', '__in_');

		i = i.join(",");

		// returns "this"
		return this.where( field + " IN (" + i + ")", "" );
	}


	/**
	 */

	Monologue.prototype.like = function( like, separator ) {
		separator = separator || "AND";

		// if( typeof like !== "string" ) {
			// for( k in like ) {
			// 	var l = "__like_" + k;
			// 	this.params[l] = like[k];
			// 	like[l] = k + " LIKE :" + l;
			// }
			// like = this.stringify( like, "LIKE", "__like_" );
			// console.log(like);
			// like = "(" + like.join( " " + separator + " " ) + ")";
		// }

		// else {
			var k = "__like_" + like.replace(rx, '');
			this.params[k] = like;
			like = "LIKE :" + k;
		// }

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

		return qparts.query;
	}


	/**
	 */

	Monologue.prototype.insert = function( table, params ) {
		if( typeof params !== "string" ) {
			var columns = [], values = [], index = 0;

			// var itr = (function( i ) {
			// 	var v = [], c = [];
			// 	index++;

			// 	for( k in i ) {
			// 		var p = k + index;
			// 		this.params[p] = i[k];

			// 		if( columns.length === 0 )
			// 			c.push( k );

			// 		v.push( ":" + p );
			// 	}

			// 	if( columns.length === 0 )
			// 		columns.push(c);

			// 	values.push(v);

			// }).bind(this);

			if( toString.call(params) !== "[object Array]" ) {
				params = [params];
				// values = this.stringify( params, "" ).join(",");
			}
			// else {

			// 	// values = this.stringify(params, "");
			// 	// console.log(values);
			// }

			values = this.stringify( params, "").join(",");


			// for( v in values ) {
				// values[v] = "(" + values[v].join(',') + ")";
			// }

			columns = " (" + columns.join(', ') + ") VALUES " + values;

		}

		else {
			var columns = " " + params;
		}

		qparts.query = "INSERT INTO " + table + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.update = function( table, params ) {
		if( typeof params !== "string" ) {
			var columns = this.stringify(params);
			columns = " SET " + columns.join( ', ' );
		}

		else {
			var columns = " " + params;
		}

		qparts.query = "UPDATE " + table + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.delete = function( table, where )
	{
		qparts.query = "DELETE FROM " + table;
		return ( where ? this.where( where ) : this );
	};


	/**
	 */

	Monologue.prototype.stringify = function( params, sep, pre ) {
		sep = ( typeof sep !== "undefined" ? sep : '=' );
		pre = pre || '__eq_';
		var columns = [];

		for( k in params ) {
			// if value is an array, it must be an IN() statement
			if( toString.call( params ) === "[object Array]" ) {
				columns.push( "(" + this.stringify( params[k], "" ) + ")");
			}

			else if( toString.call( params[k] ) === "[object Array]" ) {
				v = this.where( k ).in( params[k] );
			}

			else {
				var i = pre + params[k].toString().replace(rx, "");
				var v = ( sep.length > 0 ? k + " " + sep : '' ) + " :" + i;
				this.params[i] = params[k];

				columns.push( v );
			}
		}

		if( columns.length > 0 )
			return columns;
	}
})();
