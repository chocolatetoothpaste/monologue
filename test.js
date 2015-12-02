var mono = require('./monologue');

exports.select = function(test) {

	test.deepEqual(
		mono().select( "*", "users")
			.where( { "id": [1,2,3,4,5,6] } ) // alternative to where("id").in([...])
			.and( '`date_time`' ).between( '2012-09-12', '2013-01-20')
			.group( ['type', 'hamster' ] ) // out of order, also passing "OR" as separator
			.order( "id" )
			.and({'monkey': 'see'}).or({'monkey': 'do'})
			.limit( '300', 1000 )
			.or( "`name`" ).like("ro%en")
			.query().sql,
		"SELECT * FROM `users` WHERE `id` IN (1,2,3,4,5,6) AND `date_time` BETWEEN "
			+ "'2012-09-12' AND '2013-01-20' AND `monkey` = 'see' OR `monkey` = 'do'"
			+ " OR `name` LIKE 'ro%en' GROUP BY `type`, `hamster` ASC ORDER BY `id` ASC "
			+ "LIMIT 300 OFFSET 1000",
		"Complicated SELECT"
	);

	test.deepEqual(
		mono({backquote: false})
			.select('id, username, password, sum(posts) as posts', 'users')
			.where('status')
			.in([4,15,3,9])
			.having('posts > 5')
			.query().sql,
		"SELECT id, username, password, sum(posts) as posts FROM users "
			+ "WHERE status IN (4,15,3,9) HAVING posts > 5",
		"SELECT with HAVING and .in()"
	);

	test.deepEqual(
		mono()
			.select(['username', 'email', 'first_name', 'last_name'], 'users')
			.where({"company_id": "1234"})
			.union(['screename', 'email_address','firstName','lastName'], 'app_users')
			.where({"company":"coName"})
			.query().sql,
		"SELECT `username`, `email`, `first_name`, `last_name` FROM `users` "
			+ "WHERE `company_id` = '1234' "
			+ "UNION SELECT `screename`, `email_address`, `firstName`, `lastName` "
			+ "FROM `app_users` WHERE `company` = 'coName'",
		"simple UNION with where clauses"
	);

	test.deepEqual(
		mono()
		.select('*', 'food')
		.where({type: 'junk'})
		.and([{flavor: 'sweet', chocolate: true},{caramel: true}])
		.or([{flavor: 'salty', peanuts: true}])
		.query().sql,
		"SELECT * FROM `food` WHERE `type` = 'junk' AND "
			+ "(`flavor` = 'sweet' AND `chocolate` = true OR `caramel` = true) OR "
			+ "(`flavor` = 'salty' AND `peanuts` = true)",
		"parenthetical where statements"
	);

	test.done();
};

exports.insert = function(test) {
	test.deepEqual(
		mono({sort_keys: false}).insert( 'users', [
			{ username: 'test', password: '1234', first_name: 'bob' },
			{ password: 'abcd', username: 'geo23', first_name: "george" },
			{ first_name: "rudy", password: 'sh1r3l1ng', username: 'rudedude' }
		] ).query().sql,
		"INSERT INTO `users` (`username`, `password`, `first_name`) "
			+ "VALUES ('test','1234','bob'),('geo23','abcd','george'),('rudedude','sh1r3l1ng','rudy')",
		"Multiple INSERTs"
	);

	test.deepEqual(
		mono()
			.insert( 'users', {
				username: 'me',
				password: 'abcd',
				first_name: "cubert"
			}).query().sql,
		"INSERT INTO `users` (`username`, `password`, `first_name`) "
			+ "VALUES ('me','abcd','cubert')",
		"Single INSERT"
	);

	test.done();
};

exports.update = function(test) {
	test.deepEqual(
		mono({backquote: false})
			.update( "users", {
				username: "yoyo",
				email: 'some@email.com',
				password: "abcdefg"
			}).where({
				id: 23,
				cupcake: 'chocolate'
			})
			.query().sql,
		"UPDATE users SET username = 'yoyo', email = 'some@email.com', "
			+ "password = 'abcdefg' WHERE id = 23 AND cupcake = 'chocolate'",
		"Simple UPDATE"
	);

	test.done();
};

exports.delete = function(test) {
	test.deepEqual(
		mono({backquote: false})
			.delete( 'users', {
				username: 'test',
				password: '1234',
				first_name: "me"
			}).query().sql,
		"DELETE FROM users WHERE "
			+ "username = 'test' AND password = '1234' AND first_name = 'me'",
		"Simple DELETE"
	);

	test.done();
};

exports.join = function(test) {
	test.deepEqual(
		mono({backquote: false})
			.select( "*", "users u" )
			.join( "posts p", "p.user_id = u.id" )
			.where({
				"category": "67"
			})
			.query().sql,
		"SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id "
			+ "WHERE category = '67'",
		"Default JOIN"
	);

	test.deepEqual(
		mono({backquote: false}).select( "*", "users u" )
			.join( "LEFT", "posts p", { "p.user_id": "u.id" } )
			.where( { "category": "67" } )
			.query().sql,
		"SELECT * FROM users u LEFT JOIN posts p ON p.user_id = u.id "
			+ "WHERE category = '67'",
		"Specifying join type: LEFT JOIN"
	);

	var multi = mono({backquote: false}).select( "*", "users u" )
		.join( "posts p", "p.user_id = u.id" )
		.join( "LEFT", "post_meta m", "m.post_id = p.id" )
		.join( "LEFT OUTER", "comments c", "p.id = c.post_id" )
		.where( { "category": "67" } )
		.query().sql;

	test.deepEqual(
		multi,
		"SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id "
			+ "LEFT JOIN post_meta m ON m.post_id = p.id "
			+ "LEFT OUTER JOIN comments c ON p.id = c.post_id "
			+ "WHERE category = '67'",
		"Multiple JOINs"
	);

	test.done();
};

exports.injection = function(test) {
	test.deepEqual(mono()
		.select(['email', 'password', 'full_name'], 'members')
		.where({email: "x'; DROP TABLE members; --"})
		.query().sql,
		"SELECT `email`, `password`, `full_name` FROM `members` WHERE `email` = 'x\\'; "
			+ "DROP TABLE members; --'",
		"SQL Injection"
	);

	test.deepEqual(mono()
		.select(['username', 'password', 'type'], 'users')
		.where({"1 = 1--": ""})
		.query().sql,
		"SELECT `username`, `password`, `type` FROM `users` WHERE `1 = 1--` = ''",
		"JS Key Injection"
	);

	test.deepEqual(mono()
		.select('*', 'pages')
		.where({title: '\n\t'})
		.query().sql,
		"SELECT * FROM `pages` WHERE `title` = '\\n\\t'",
		"Whitespace Characters"
	);

	test.done();

};

exports.file = function(test) {
	test.deepEqual(
		mono().select( "*", "users" )
			.where( { "company": "general motors" } )
			.file( "/tmp/datafile", ",", '"', "\\n" )
			.query().sql,
		"SELECT * FROM `users` WHERE `company` = 'general motors' "
			+ "INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ',' "
			+ "OPTIONALLY ENCLOSED BY '\"' LINES TERMINATED BY '\\n'",
		"SELECT INTO FILE with ENCLOSED BY"
	);

	test.deepEqual(
		mono().select( "*", "users" )
			.where( { "company": "general motors" } )
			.file( "/tmp/datafile", ",", "\\n" )
			.query().sql,
		"SELECT * FROM `users` WHERE `company` = 'general motors' "
			+ "INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ','  "
			+ "LINES TERMINATED BY '\\n'",
		"SELECT INTO FILE simple"
	);

	test.done();
};


exports.backquote = function(test) {
	var m = mono();

	var obj = {
		pizza: "hawaiin bbq chicken",
		drink: "chocolate milk",
		dessert: "german chocolate cake"
	};

	test.deepEqual(
		m.backquote(['email', 'password', 'type']),
		[ '`email`', '`password`', '`type`' ]
	);

	test.deepEqual(
		m.backquote([
			{breakfast: ['bacon', 'eggs']},
			{"lunch": 'sangwich'},
			{"dinner": 'prime rib'}
		]),
		[
			{"`breakfast`": ['bacon', 'eggs']},
			{"`lunch`": 'sangwich'},
			{"`dinner`": 'prime rib'}
		]
	);

	test.deepEqual(
		m.backquote(obj),
		{
			'`pizza`': "hawaiin bbq chicken",
			'`drink`': "chocolate milk",
			'`dessert`': "german chocolate cake"
		}
	);

	test.deepEqual(
		m.backquote('cupcake'),
		'`cupcake`'
	);


	test.done();
};