Monologue - Streamlined query building
======================================

[![NPM](https://nodei.co/npm/monologue.png?compact=true)](https://nodei.co/npm/monologue/)

[Support Development](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9KXDJTKMBPXTE)

# Examples

*These are a little out of date due to recent changes but are pretty close to correct*


    var monologue = require('monologue');

    // grouping of where statements, pay attention to how the objects are grouped and what the output becomes
    // output: SELECT * FROM food WHERE type = 'junk' AND (chocolate = true AND flavor = 'sweet' OR caramel = true) OR (flavor = 'salty' AND peanuts = true)
    monologue()
        .select('*', 'food')
        .where({type: 'junk'})
        .and([
            {flavor: 'sweet', chocolate: true},
            {caramel: true}
        ])
        .or([ {flavor: 'salty', peanuts: true} ])
        .sql()

    // Less than basic SELECT statement


    // call the SQL wrappers in any order, see below: where, group, where, order
    var mono = monologue()
        .select( "*", "users")
        .where( { "id": [1,2,3,4,5,6] } ) // alternative to where("id").in([...])
        .and( 'date_time' ).between( '2012-09-12', '2013-01-20')
        .group( ['type', 'hamster' ] )
        .or( "name" ).like("ro%en") // out of order, also passing "OR" as separator
        .order( "id" )
        .limit( '300', 1000 )
        .sql();

    // output: SELECT * FROM users WHERE id IN (1,2,3,4,5,6) AND date_time BETWEEN '2012-09-12' AND '2013-01-20' OR name LIKE 'ro%en' GROUP BY type, hamster ASC ORDER BY id ASC LIMIT 1000, 300


    mono().ljoin( table, statement ); // LEFT JOIN
    mono().rjoin( table, statement ); // RIGHT JOIN
    mono().lojoin( table, statement ); // LEFT OUTER JOIN
    mono().rojoin( table, statement ); // RIGHT OUTER JOIN


    // JOIN (default is inner):
    // SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE category = '67'

    monologue()
        .select( "*", "users u" )
        .join( "posts p", "p.user_id = u.id" )
        .where( { "category": "67" } )
        .sql();


    // JOIN (LEFT, as argument):
    // SELECT * FROM users u LEFT JOIN posts p ON p.user_id = u.id WHERE category = '67'

    monologue()
        .select( "*", "users u" )
        .join( "LEFT", "posts p", { "p.user_id": "u.id" } )
        .where( { "category": "67" } )
        .sql();


    // SELECT into outfile: the third param (OPTIONALLY ENCLOSED BY) is, as stated, optional. Just pass in the line ending and leave the 4th param out, the rest will be taken care of
    // output: SELECT * FROM users WHERE company = 'general motors' INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n'


    monologue()
        .select( "*", "users" )
        .where( { "company": "general motors" } )
        .file( "/tmp/datafile", ",", '"', "\\n" )
        .sql();


    // SELECT into outfile: without third param
    // output: SELECT * FROM users WHERE company = 'general motors' INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ','  LINES TERMINATED BY '\n'

    monologue()
        .select( "*", "users")
        .where( { "company": "general motors" } )
        .file( "/tmp/datafile", ",", "\\n" )
        .sql();


    // INSERT, passing an array of objects
    // output: INSERT INTO users (first_name, password, username) VALUES ('me','1234','test'),('pasta','abcd','example')

    monologue()
        .insert( 'users', [
            { username: 'test', password: '1234', first_name: 'me' },
            { username: 'example', password: 'abcd', first_name: "pasta" }
        ] )
        .sql();


    // INSERT, passing a single object
    // output: INSERT INTO users (first_name, password, username) VALUES ('cubert','abcd','me')

    monologue()
        .insert( 'users', {
            username: 'me', password: 'abcd', first_name: "cubert"
        } )
        .sql();

    // INSERT, passing array of column names and array of values
    // output: INSERT INTO `users` (`email`,`first_name`,`last_name`) VALUES ('test@user.com', 'Test', 'User'),('example@sample.com', 'Sample', 'Person'),('fake@name.com', 'Fake', 'Name')

    monologue()
        .insert( 'users', ['email', 'first_name', 'last_name'], [
            ['test@user.com', 'Test', 'User'],
            ['example@sample.com', 'Sample', 'Person'],
            ['fake@name.com', 'Fake', 'Name']
        ]).sql();

    // UPDATE
    // output: UPDATE users SET email = 'some@email.com', password = 'abcdefg', username = 'yoyo' WHERE id = 23

    monologue()
        .update( "users", {username: "yoyo", email: 'some@email.com', password: "abcdefg"} )
        .where( {id: 23} )
        .sql();


    // DELETE
    // output: DELETE FROM users WHERE first_name = 'me' AND password = '1234' AND username = 'test'

    monologue()
        .delete( 'users', { username: 'test', password: '1234', first_name: "me" } )
        .sql();


    // UNION
    // Wrappers can be out of order BEFORE the UNION statement,
    // wrappers after will be applied to the secondary statment
    // output: SELECT username, email FROM users WHERE company_id = '1234' UNION SELECT screename, email_address FROM app_users WHERE company = 'coName'

    monologue()
        .select('username, email', 'users')
        .where({"company_id": "1234"})
        .union('screename, email_address', 'app_users')
        .where({"company":"coName"})
        .sql();

    // SELECT `username`, `password` FROM `users` WHERE id NOT IN (1,2,3,4)
    mono()
        .select(['username', 'password'], 'users')
        .where('id')
        .not([1,2,3,4])
        .sql();

    // SELECT * FROM `campsites` WHERE `reserved` != true AND `fishing` != \'slow\'
    mono()
        .select('*', 'campsites')
        .not({'reserved': true, fishing: 'slow'})
        .sql();

    // SELECT * FROM `media` WHERE `type` IS NOT NULL AND `file_size` > 0 AND `seconds` > 24325
    mono()
        .select('*', 'media')
        .not({'type': null})
        .gt({file_size: 0, seconds: 24325})
        .sql();

    // SELECT `username`, `password` FROM `users` WHERE `username` != \'joe\' AND `username` != \'bob\'
    mono()
        .select(['username', 'password'], 'users')
        .not([{username: 'joe'},{username: 'bob'}])
        .sql();

    // SELECT * FROM `users` WHERE last_login NOT BETWEEN \'2015-10-01 00:00:00\' AND \'2015-11-30 23:59:59\'
    mono()
        .select('*', 'users')
        .where('last_login')
        .not()
        .between('2015-10-01 00:00:00', '2015-11-30 23:59:59')
        .sql();

    // SELECT `title`, `post` FROM `posts` WHERE status < 8
    mono()
        .select(['title', 'post'], 'posts')
        .where('status').lt(8)
        .sql();

    // SELECT * FROM `posts` WHERE `favorited` <= 815 AND `commentors` <= 1516 OR `likes` <= 42
    mono()
        .select('*', 'posts')
        .lte([{favorited: 815, commentors: 1516},{likes: 42}], 'OR')
        .sql();

    // SELECT `post_id`, `comments` FROM `comments` WHERE `post_id` = 23565 AND date_time > \'2015-12-01 00:00:00\'
    mono()
        .select(['post_id', 'comments'], 'comments')
        .where({post_id: 23565})
        .where('date_time').gt('2015-12-01 00:00:00')
        .sql();

    // SELECT sum(id) as count FROM comments HAVING count >= 42
    mono({backquote: false})
        .select('sum(id) as count', 'comments')
        .having('count').gte(42)
        .sql();