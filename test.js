var monologue = require('./monologue');

exports.select = function(test) {
	test.expect(3);

	test.deepEqual(
		monologue().select( "*", "users")
			.where( { "id": [1,2,3,4,5,6] } ) // alternative to where("id").in([...])
			.where( 'date_time' ).between( '2012-09-12', '2013-01-20')
			.group( ['type', 'hamster' ] )
			.where( "name", "OR" ).like("ro%en") // out of order, also passing "OR" as separator
			.order( "id" )
			.limit( '300', 1000 )
			.query().sql,
		"SELECT * FROM users WHERE id IN (1,2,3,4,5,6) AND date_time BETWEEN '2012-09-12' AND '2013-01-20' OR name LIKE 'ro%en' GROUP BY type, hamster ASC ORDER BY id ASC LIMIT 1000, 300",
		"Complicated SELECT"
	);

	test.deepEqual(
		monologue().select('id, username, password, sum(posts) as posts', 'users').where('status').in([4,15,3,9]).having('posts > 5').query().sql,
		"SELECT id, username, password, sum(posts) as posts FROM users WHERE status IN (4,15,3,9) HAVING posts > 5",
		"SELECT with HAVING and .in()"
	);

	test.deepEqual(
		monologue().select(['username', 'email', 'first_name', 'last_name'], 'users').where({"company_id": "1234"}).union('screename, email_address', 'app_users').where({"company":"coName"}).query().sql,
		"SELECT username, email, first_name, last_name FROM users WHERE company_id = '1234' UNION SELECT screename, email_address FROM app_users WHERE company = 'coName'",
		"simple UNION with where clauses"
	);

	test.done();
};

exports.insert = function(test) {
	test.expect(2);

	test.deepEqual(
		monologue().insert( 'users', [
			{ username: 'test', password: '1234', first_name: 'me' },
			{ username: 'example', password: 'abcd', first_name: "pasta" }
		] ).query().sql,
		"INSERT INTO users (first_name, password, username) VALUES ('me','1234','test'),('pasta','abcd','example')",
		"Multiple INSERTs"
	);

	test.deepEqual(
		monologue().insert( 'users', { username: 'me', password: 'abcd', first_name: "cubert" } ).query().sql,
		"INSERT INTO users (first_name, password, username) VALUES ('cubert','abcd','me')",
		"Single INSERT"
	);

	test.done();
};

exports.update = function(test) {
	test.expect(1);

	test.deepEqual(
		monologue().update( "users", {username: "yoyo", email: 'some@email.com', password: "abcdefg"} ).where( {id: 23, cupcake: 'chocolate'} ).query().sql,
		"UPDATE users SET email = 'some@email.com', password = 'abcdefg', username = 'yoyo' WHERE cupcake = 'chocolate' AND id = 23",
		"Simple UPDATE"
	);

	test.done();
};

exports.delete = function(test) {
	test.expect(1);

	test.deepEqual(
		monologue().delete( 'users', { username: 'test', password: '1234', first_name: "me" } ).query().sql,
		"DELETE FROM users WHERE first_name = 'me' AND password = '1234' AND username = 'test'",
		"Simple DELETE"
	);

	test.done();
};

exports.join = function(test) {
	test.expect(3);

	test.deepEqual(
		monologue().select( "*", "users u" )
			.join( "posts p", "p.user_id = u.id" )
			.where( { "category": "67" } )
			.query().sql,
		"SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE category = '67'",
		"Default JOIN"
	);

	test.deepEqual(
		monologue().select( "*", "users u" )
			.join( "LEFT", "posts p", { "p.user_id": "u.id" } )
			.where( { "category": "67" } )
			.query().sql,
		"SELECT * FROM users u LEFT JOIN posts p ON p.user_id = u.id WHERE category = '67'",
		"Specifying join type: LEFT JOIN"
	);

	var multi = monologue().select( "*", "users u" )
		.join( "posts p", "p.user_id = u.id" )
		.join( "LEFT", "post_meta m", "m.post_id = p.id" )
		.join( "LEFT OUTER", "comments c", "p.id = c.post_id" )
		.where( { "category": "67" } )
		.query().sql;

	test.deepEqual(
		multi,
		"SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id LEFT JOIN post_meta m ON m.post_id = p.id LEFT OUTER JOIN comments c ON p.id = c.post_id WHERE category = '67'",
		"Multiple JOINs"
	);

	test.done();
};

exports.injection = function(test) {
	test.expect(2);

	var inj = monologue()
		.select(['email', 'password', 'full_name'], 'members')
		.where({email: "x'; DROP TABLE members; --"})
		.query().sql;

	test.deepEqual(
		inj,
		"SELECT email, password, full_name FROM members WHERE email = 'x\\'; DROP TABLE members; --'",
		"SQL Injection"
	);

	var whitespace = monologue()
		.select('*', 'pages')
		.where({title: '\n\t'})
		.query().sql;

	test.deepEqual(
		whitespace,
		"SELECT * FROM pages WHERE title = '\\n\\t'",
		"Whitespace Characters"
	);

	test.done();

};

exports.file = function(test) {
	test.expect(2);

	test.deepEqual(
		monologue().select( "*", "users" )
			.where( { "company": "general motors" } )
			.file( "/tmp/datafile", ",", '"', "\\n" )
			.query().sql,
		"SELECT * FROM users WHERE company = 'general motors' INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' LINES TERMINATED BY '\\n'",
		"SELECT INTO FILE with ENCLOSED BY"
	);

	test.deepEqual(
		monologue().select( "*", "users" )
			.where( { "company": "general motors" } )
			.file( "/tmp/datafile", ",", "\\n" )
			.query().sql,
		"SELECT * FROM users WHERE company = 'general motors' INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ','  LINES TERMINATED BY '\\n'",
		"SELECT INTO FILE simple"
	);

	test.done();
};


exports.backquote = function(test) {
	test.expect(4);

	var q1 = monologue();

	var obj = {
		pizza: "hawaiin bbq chicken",
		drink: "chocolate milk",
		dessert: "german chocolate cake"
	};

	test.deepEqual(
		q1.backquote(['email', 'password', 'type']),
		[ '`email`', '`password`', '`type`' ]
	);

	test.deepEqual(
		q1.backquote([{breakfast: ['bacon', 'eggs']}, {'lunch': 'sangwich'}, {'dinner': 'prime rib'}]),
		[ {"`breakfast`": ['bacon', 'eggs']}, {'`lunch`': 'sangwich'}, {'`dinner`': 'prime rib'} ]
	);

	test.deepEqual(
		q1.backquote(obj),
		{
			'`pizza`': "hawaiin bbq chicken",
			'`drink`': "chocolate milk",
			'`dessert`': "german chocolate cake"
		}
	);

	test.deepEqual(
		q1.backquote('cupcake'),
		'`cupcake`'
	);


	test.done();
};