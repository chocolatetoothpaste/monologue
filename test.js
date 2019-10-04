var mono = require('./monologue');

exports.comparisons = function comparisons(test) {
	test.deepEqual(
		mono()
			.select('*', 'users')
			.where({password: null})
			.sql(),
		'SELECT * FROM `users` WHERE `password` IS NULL',
		'IS NULL'
	);

	test.deepEqual(
		mono()
			.select(['username', 'password'], 'users')
			.where('id')
			.not([1,2,3,4])
			.sql(),
		'SELECT `username`, `password` FROM `users` WHERE id NOT IN (1,2,3,4)',
		'NOT IN() (array)'
	);

	test.deepEqual(
		mono()
			.select('*', 'campsites')
			.not({'reserved': true, fishing: 'slow'})
			.sql(),
		'SELECT * FROM `campsites` WHERE `reserved` != true AND `fishing` != \'slow\'',
		'NOT EQUAL (object) (!=)'
	);

	test.deepEqual(
		mono()
			.select('media')
			.not({'type': null})
			.gt({file_size: 0, length: 24325})
			.sql(),
		'SELECT * FROM `media` WHERE `type` IS NOT NULL AND `file_size` > 0 AND `length` > 24325',
		'IS NOT NULL'
	);

	test.deepEqual(
		mono()
			.select(['username', 'password'], 'users')
			.not([{username: 'joe'},{username: 'bob'}])
			.sql(),
		'SELECT `username`, `password` FROM `users` WHERE `username` != \'joe\' AND `username` != \'bob\'',
		'NOT EQUAL (array of objects) (!=)'
	);

	test.deepEqual(
		mono()
			.select('*', 'users')
			.where('last_login')
			.not()
			.between('2015-10-01 00:00:00', '2015-11-30 23:59:59')
			.sql(),
		'SELECT * FROM `users` WHERE last_login NOT BETWEEN \'2015-10-01 00:00:00\' AND \'2015-11-30 23:59:59\'',
		'NOT BETWEEN'
	);

	test.deepEqual(
		mono()
			.select(['title', 'post'], 'posts')
			.where('status').lt(8)
			.sql(),
		'SELECT `title`, `post` FROM `posts` WHERE status < 8',
		'Less than (<)'
	);

	test.deepEqual(
		mono({backquote: false})
			.select('*', 'posts')
			.lte({favorited: 815})
			.sql(),
		'SELECT * FROM posts WHERE favorited <= 815',
		'Less than/equal to (<=)'
	);

	test.deepEqual(
		mono()
			.select('*', 'posts')
			.lte([{favorited: 815, commentors: 1516},{likes: 42}], 'OR')
			.sql(),
		'SELECT * FROM `posts` WHERE `favorited` <= 815 AND `commentors` <= 1516 OR `likes` <= 42',
		'Comparison with complex grouping and separator'
	);

	test.deepEqual(
		mono()
			.update('posts', {featured: true})
			.lt({views: 1000, comments: 23}, 'OR')
			.sql(),
		'UPDATE `posts` SET `featured` = true WHERE `views` < 1000 OR `comments` < 23',
		'Comparison with optional/alternative separator'
	);

	test.deepEqual(
		mono()
			.select(['post_id', 'comments'], 'comments')
			.where({post_id: 23565})
			.where('date_time').gt('2015-12-01 00:00:00')
			.sql(),
		'SELECT `post_id`, `comments` FROM `comments` WHERE `post_id` = 23565 AND date_time > \'2015-12-01 00:00:00\'',
		'Greater Than (>)'
	);

	test.deepEqual(
		mono({backquote: false})
			.select(['sum(id) as count'], 'comments')
			.having('count').gte(42)
			.sql(),
		'SELECT sum(id) as count FROM comments HAVING count >= 42',
		'Greater Than/Equal to (>=)'
	);

	test.done();
};

exports.select = function(test) {

	test.deepEqual(
		mono().select( "users")
			.where( { "id": [1,2,3,4,5,6] } ) // alternative to where("id").in([...])
			.and( '`date_time`' ).between( '2012-09-12', '2013-01-20')
			.group( ['type', 'hamster' ] ) // out of order, also passing "OR" as separator
			.order( "id" )
			.and({'monkey': 'see'}).or({'monkey': 'do'})
			.limit( '300', 1000 )
			.or( "`name`" ).like("ro%en")
			.sql(),
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
			.having('posts').gt(5)
			.sql(),
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
			.sql(),
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
		.sql(),
		"SELECT * FROM `food` WHERE `type` = 'junk' AND "
			+ "(`flavor` = 'sweet' AND `chocolate` = true OR `caramel` = true) OR "
			+ "(`flavor` = 'salty' AND `peanuts` = true)",
		"parenthetical where statements"
	);

	test.deepEqual(
		mono()
		.select('movies')
		.where({type: 'comedy'})
		.sql(),
		"SELECT * FROM `movies` WHERE `type` = 'comedy'",
		"SELECT without column"
	);


	test.done();
};

exports.insert = function(test) {
	test.deepEqual(
		mono().insert( 'users', [
			{ username: 'test', password: '1234', first_name: 'bob', type: 1 },
			{ password: 'abcd', username: 'geo23', first_name: "george", type: 2 },
			{ first_name: "rudy", password: 'sh1r3l1ng', username: 'rudedude', type: null }
		] ).sql(),
		"INSERT INTO `users` (`username`, `password`, `first_name`, `type`) "
			+ "VALUES ('test', '1234', 'bob', 1),('geo23', 'abcd', 'george', 2),('rudedude', 'sh1r3l1ng', 'rudy', NULL)",
		"Multiple INSERTs"
	);

	test.deepEqual(
		mono({sort_keys: true})
			.insert( 'users', {
				username: 'me',
				first_name: "cubert",
				password: 'abcd'
			}).sql(),
		"INSERT INTO `users` (`first_name`, `password`, `username`) "
			+ "VALUES ('cubert', 'abcd', 'me')",
		"Single INSERT, sorting keys"
	);

	test.deepEqual(
		mono()
			.insert( 'users', ['email', 'first_name', 'last_name'], [
				['test@user.com', 'Test', 'User'],
				['example@sample.com', 'Sample', 'Person'],
				['fake@name.com', 'Fake', 'Name']
			]).sql(),
		"INSERT INTO `users` (`email`,`first_name`,`last_name`) VALUES "
			+ "('test@user.com', 'Test', 'User'),"
			+ "('example@sample.com', 'Sample', 'Person'),"
			+ "('fake@name.com', 'Fake', 'Name')",
		'Semantic Insert'
	)

	test.deepEqual(
		mono()
			.insert( 'books', {
				title: 'the big sky',
				author: "a.b. guthrie",
				year: '1947',
				pages: 386
			}).values(['Into the Wild', 'Jon Krakauer', '1997', 207])
			.sql(),
		"INSERT INTO `books` (`title`, `author`, `year`, `pages`) VALUES "
			+ "('the big sky', 'a.b. guthrie', '1947', 386),"
			+ "('Into the Wild','Jon Krakauer','1997',207)"
	)

	test.done();
};

exports.update = function(test) {
	test.deepEqual(
		mono({backquote: false})
			.update( "users", {
				username: "yoyo",
				email: 'some@email.com',
				password: "abcdefg",
				type: null
			}).where({
				id: 23,
				cupcake: 'chocolate'
			})
			.sql(),
		"UPDATE users SET username = 'yoyo', email = 'some@email.com', "
			+ "password = 'abcdefg', type = NULL WHERE id = 23 AND cupcake = 'chocolate'",
		"Simple UPDATE"
	);

	test.deepEqual(
		mono({backquote: false})
			.update( "comments", {
				email: 'some@email.com',
				comment: "Hello!"
			}).set({
				'timestamp': '123456789'
			}).where({
				id: 23
			})
			.sql(),

		"UPDATE comments SET email = 'some@email.com', comment = 'Hello!', "
			+ "timestamp = '123456789' WHERE id = 23",
		"Update with .set() (additive)"
	);

	test.deepEqual(
		mono({backquote: false})
			.update( "files", {
				name: 'MyFile.pdf',
				path: "/path/to/myfile.pdf",
				status: 1,
				user_id: 23
			}).set({
				status: 0,
				user_id: 45,
				hidden: 1
			}).where({
				id: 867
			})
			.sql(),
		"UPDATE files SET name = 'MyFile.pdf', path = '/path/to/myfile.pdf', "
			+ "status = 0, user_id = 45, hidden = 1 WHERE id = 867",
		"Update with .set() (additive/overwrite)"
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
			}).sql(),
		"DELETE FROM users WHERE "
			+ "username = 'test' AND password = '1234' AND first_name = 'me'",
		"Simple DELETE"
	);

	test.done();
};

exports.query = function(test) {
	test.deepEqual(
		mono()
			.query('SHOW TABLES FROM somedb')
			.sql(),
		"SHOW TABLES FROM somedb",
		"Simple QUERY"
	);

	test.deepEqual(
		mono()
			.query('SHOW TABLES FROM another')
			.where({table: 'condition'})
			.sql(),
		"SHOW TABLES FROM another WHERE `table` = 'condition'",
		"Simple QUERY with clause"
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
			.sql(),
		"SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id "
			+ "WHERE category = '67'",
		"Default JOIN"
	);

	test.deepEqual(
		mono({backquote: false}).select( "*", "users u" )
			.rjoin( "posts p", { "p.user_id": "u.id" } )
			.rojoin( "comments c", "p.id = c.post_id" )
			.where( { "category": "67" } )
			.sql(),
		"SELECT * FROM users u RIGHT JOIN posts p ON p.user_id = u.id "
			+ "RIGHT OUTER JOIN comments c ON p.id = c.post_id "
			+ "WHERE category = '67'",
		"Specifying join type: LEFT JOIN"
	);

	var multi = mono({backquote: false}).select( "*", "users u" )
		.join( "posts p", "p.user_id = u.id" )
		.ljoin( "post_meta m", "m.post_id = p.id" )
		.lojoin( "comments c", "p.id = c.post_id" )
		.where( { "category": "67" } )
		.sql();

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
		.where({email: "'; DROP TABLE members; --"})
		.sql(),
		"SELECT `email`, `password`, `full_name` FROM `members` WHERE `email` = '\\'; "
			+ "DROP TABLE members; --'",
		"SQL Injection"
	);

	test.deepEqual(mono()
		.select(['username', 'password', 'type'], 'users')
		.where({"1 = 1--": ""})
		.sql(),
		"SELECT `username`, `password`, `type` FROM `users` WHERE `1 = 1--` = ''",
		"JS Key Injection"
	);

	test.deepEqual(mono()
		.select('*', 'pages')
		.where({title: '\n\t'})
		.sql(),
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
			.sql(),
		"SELECT * FROM `users` WHERE `company` = 'general motors' "
			+ "INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ',' "
			+ "OPTIONALLY ENCLOSED BY '\"' LINES TERMINATED BY '\\n'",
		"SELECT INTO FILE with ENCLOSED BY"
	);

	test.deepEqual(
		mono().select( "*", "users" )
			.where( { "company": "general motors" } )
			.file( "/tmp/datafile", ",", "\\n" )
			.sql(),
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

exports.explain = function explain(test) {
	test.deepEqual(
		mono().select('*', 'users').where({email: 'some@example.com'}).explain(),
		'EXPLAIN SELECT * FROM `users` WHERE `email` = \'some@example.com\''
	);

	test.done();
};

exports.coexist = function coexist(test) {
	// make sure instances stay separate
	var m1 = mono().select('*', 'users').where({id: 42}).sql();
	var m2 = mono().insert('messages', {
		'title': 'hello',
		'message': 'world'
	}).sql();

	test.deepEqual(
		m1,
		'SELECT * FROM `users` WHERE `id` = 42',
		'select'
	);

	test.deepEqual(
		m2,
		'INSERT INTO `messages` (`title`, `message`) VALUES (\'hello\', \'world\')',
		'insert'
	);

	test.done();
};
