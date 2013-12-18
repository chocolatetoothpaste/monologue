(function() {
	var rx = /[^a-zA-Z0-9_]/g,
		root = this,
		yoe = {
			query: '',
			where: '',
			having: '',
			order: [],
			group: [],
			limit: ''
		};

	function Query() {
		this.params = {};
	};

	if( typeof module !== "undefined" && module.exports ) {
		module.exports = new Query;
	}

	else {
		root.mono = new Query;
	}


	/**
	 * Creates a select statement using properties defined before calling method
	 * @return string	the generated query string
	 */

	Query.prototype.select = function( c, t ) {
		c = ( typeof c === "string" ? c : c.join(", ") );

		yoe.query = "SELECT " + c + " FROM " + t;

		return this;
	}

	Query.prototype.where = function( w, separator ) {
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
		yoe.where = ( yoe.where.length > 0
			? yoe.where + " " + separator + " " + w
			: w );

		return this;
	}

	Query.prototype.having = function( h, separator ) {
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
		yoe.having = ( yoe.having.length > 0
			? yoe.having + " " + separator + " " + h
			: h );

		return this;
	}

	Query.prototype.in = function( ins )
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

	Query.prototype.like = function( like, separator ) {
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

	Query.prototype.between = function( one, two )
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

	// group, direction
	Query.prototype.group = function( g, d ) {
		d = d || 'ASC';

		if( typeof g !== "string" )
			g = g.join( ',' );

		yoe.group.push( g + " " + d );

		return this;
	}

	// order, direction
	Query.prototype.order = function( o, d ) {
		d = d || 'ASC';

		if( typeof o !== "string" )
			o = o.join( ',' );

		yoe.order.push( o + " " + d );

		return this;
	}

	// limit, offset
	Query.prototype.limit = function( l, o )
	{
		yoe.limit = ( typeof o === "undefined" ? l : o + ", " + l );
		return this;
	}


	/**
	 * Compile each part together and generate a valid SQL statement
	 */

	Query.prototype.query = function()
	{
		if( yoe.where.length > 0 )
			yoe.query = yoe.query + " WHERE " + yoe.where;
		if( yoe.group.length > 0 )
			yoe.query += ' GROUP BY ' + yoe.group.join(',');
		if( yoe.having.length > 0 )
			yoe.query = yoe.query + " HAVING " + yoe.having;
		if( yoe.order.length > 0 )
			yoe.query += ' ORDER BY ' + yoe.order.join(',');
		if( yoe.limit.length > 0 )
			yoe.query += " LIMIT " + yoe.limit;

		return yoe.query;
	}


	/**
	 * Return a generated insert statement from one or more sets of values
	 * passed as an associative array. Inserting a batch of rows rather than
	 * multiple consecutive inserts will be WAY faster.
	 * @param string $table
	 * @param array $values
	 * @return string
	 */

	// Query.prototype.insert = function( $table, array $params )
	// {
	// 	$columns = array();
	// 	$multi = ( count( $params ) != count( $params, COUNT_RECURSIVE ) );
	// 	if( $multi )
	// 	{
	// 		$arr = array();
	// 		foreach( $params as $k => $void )
	// 		{
	// 			// sort the keys so that each group of values are inserted in
	// 			// the same order
	// 			ksort( $void );
	// 			if( ! $columns )
	// 			{
	// 				$columns = array_keys( $params[0] );
	// 				sort( $columns );
	// 			}

	// 			foreach( $void as $pkey => $pvalue )
	// 			{
	// 				$this->params[$pkey . $k] = $pvalue;//sprintf( ':%s', $pvalue );
	// 				$arr[] = ":{$pkey}{$k}";
	// 			}

	// 			$params[$k] = implode( ', ', $arr );
	// 			$params[$k] = sprintf( '(%s)', $params[$k] );
	// 			$arr = array();
	// 		}

	// 		$params = implode( ', ', $params );

	// 	}
	// 	else
	// 	{
	// 		ksort( $params );
	// 		$this->params = $params;
	// 		$columns = array_keys( $this->params );
	// 		$params = asprintf( ':%1$s', $columns );
	// 		$params = implode( ', ', $params );
	// 		$params = sprintf( '(%s)', $params );
	// 	}

	// 	$columns = sprintf( '(%s)', '`' . implode( '`, `', $columns ) . '`' );
	// 	$this->query = "INSERT INTO $table $columns VALUES $params";

	// 	return $this;
	// }


	/**
	 * Generates an update statement
	 * @param string $table
	 * @param array $params
	 * @param array $where
	 * @return string
	 */

	Query.prototype.update = function( table, params ) {
		if( typeof params !== "string" ) {
			this.params = params;
			var columns = [];

			params.map( function( v, k ) {
				k = k.replace( rx, '' );
				columns.push( k + " = :" + k )
			});

			columns = columns.join( ', ' );
		}

		else {
			columns = params;
		}

		this.query = "UPDATE " + table + " SET " + columns;

		return this;
	};


	/**
	 * Creates a select statement using properties defined before calling method
	 * @return string	the generated query string
	 */

	Query.prototype.delete = function( t )
	{
		yoe.table = t;
		yoe.query = "DELETE FROM " + yoe.table;

		return this;
	};
})();
