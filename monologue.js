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
		separator = ( typeof separator === "undefined" ? "AND" : separator );

		if( typeof w !== "string" ) {
			criteria = [];

			for( k in w ) {
				k = k.replace( rx, '' );
				this.params[k] = w[k];
				criteria.push( k + " = :" + k );
			}

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
			criteria = [];

			for( k in h ) {
				k = k.replace( rx, '' );
				this.params[k] = h[k];
				criteria.push( k + " = :" + k );
			}

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

	Monologue.prototype.in = function( ins )
	{
		i = [];

		ins.map( function( v ) {
			var k = "__in_" + v;
			if( typeof this.params[k] === "undefined" ) {
				this.params[k] = v;
				i.push( ":" + k );
			}
		}.bind(this));

		i = i.join(",");

		// returns "this"
		return this.where( "IN (" + i + ")", "" );
	}


	/**
	 */

	Monologue.prototype.like = function( like, separator ) {
		separator = separator || "AND";

		if( typeof like !== "string" ) {
			like.map( function( v, k ) {
				var l = "__like_" + k.replace( rx, '' );
				this.params[l] = "%" + v + "%";
				like[l] = k + " LIKE :" + l;
			});

			like = "(" + like.join( " " + separator + " " ) + ")";
		}

		else {
			this.params["__like_" + like] = "%" + like + "%";
			like = "LIKE :__like_" + like;
		}

		return this.where( like, "" );
	}


	/**
	 */

	Monologue.prototype.between = function( one, two )
	{
		// a unique id of some kind is required to dsitinguish fields, so a md5
		// hash of the current where clause should give one each time
		// $column = md5( this.where );
		column = Math.floor(Math.random() * 10);
		var k = "__between_" + column + "_";

		// replace non-alpha-numeric (plus underscore) characters in the values
		// and use those as part of the unique field name (otherwise there the
		// values would collide)
		var k1 = k + one.replace( rx, '' );
		var k2 = k + two.replace( rx, '' );
		// $k1 = preg_replace('#[^a-zA-Z0-9_]#', '', "{$k}{$one}");
		// $k2 = preg_replace('#[^a-zA-Z0-9_]#', '',"{$k}{$two}");

		this.params[k1] = one;
		this.params[k2] = two;

		return this.where( " BETWEEN :" + k1 + " AND :" + k2, '' );
	}


	/**
	 * group, direction
	 */

	Monologue.prototype.group = function( g, d ) {
		d = d || 'ASC';

		if( typeof g !== "string" )
			g = g.join( ',' );

		qparts.group.push( g + " " + d );

		return this;
	}


	/**
	 * order, direction
	 */

	Monologue.prototype.order = function( o, d ) {
		d = d || 'ASC';

		if( typeof o !== "string" )
			o = o.join( ',' );

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

			var itr = (function( i ) {
				var v = [], c = [];
				index++;

				for( k in i ) {
					var p = k.replace( rx, '' ) + index;
					this.params[p] = i[k];

					if( columns.length === 0 )
						c.push( k );

					v.push( ":" + p );
				}

				if( columns.length === 0 )
					columns.push(c);

				values.push(v);

			}).bind(this);

			if( toString.call(params) === "[object Array]" ) {
				for( p in params )
					itr(params[p]);
			}
			else {
				itr(params);
			}

			for( v in values ) {
				values[v] = "(" + values[v].join(',') + ")";
			}

			columns = " (" + columns.join(', ') + ") VALUES " + values.join(',');

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
			var columns = [];

			for( k in params ) {
				var p = k.replace( rx, '' );
				columns.push( k + " = :" + p );
				this.params[p] = params[k];
			}

			columns = " SET " + columns.join( ', ' );
		}

		else {
			columns = " " + params;
		}

		qparts.query = "UPDATE " + table + columns;

		return this;
	};


	/**
	 */

	Monologue.prototype.delete = function( table, where )
	{
		qparts.query = "DELETE FROM " + table;

		if( where )
			this.where(where);

		return this;
	};
})();
