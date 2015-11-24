Monologue - Streamlined query building
======================================

[![NPM](https://nodei.co/npm/monologue.png?compact=true)](https://nodei.co/npm/monologue/)

**Breaking Change Coming**

Bound parameter-style queries will be removed in 0.5.0.  Documentation has been removed for quite a while, so this should affect very few, if any, users.

**Cool New Features**

2 convenience functions, .and() and .or(), where added allowing you to avoid the somewhat awkward interface of .where() (passing "AND" or "OR" as the second param).  These methods can be used out of order just like any other, they are essentially just aliases to .where() that handle the "AND"/"OR" for you.

monologue.where() was updated to handle arrays as a grouping mechanism.  An array of objects will be separated by OR, where an objects properties will be separated by AND.  See examples below.

**Install**

    npm install monologue

**API**

A new method has been introduced to deal with situations where backquoting is required.  An experimental approach was tested in previous versions where backquoting could be done inline, but this proved to be buggy and impossible to perform accurately.  However, you can now do it manually with monologue.backquote().  The method accepts 3 types of data: an array of column names, an object, or a string.  An array will result in each element being backquoted.  An object will return an array of backquoted keys.  A string will be returned backquoted.

Example:

    // result: [ '`email`', '`password`', '`type`' ]
    monologue().backquote(['email', 'password', 'type']);

    // result: { '`pizza`': "hawaiin bbq chicken", '`drink`': "chocolate milk", '`dessert`': "german chocolate cake" }
    monologue().backquote({
        pizza: "hawaiin bbq chicken",
        drink: "chocolate milk",
        dessert: "german chocolate cake"
    });

    // result: '`cupcake`'
    monologue().backquote('cupcake');

**Usage**

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
        .query().sql

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
        .query();

    console.log( mono.sql );
    // output: SELECT * FROM users WHERE id IN (1,2,3,4,5,6) AND date_time BETWEEN '2012-09-12' AND '2013-01-20' OR name LIKE 'ro%en' GROUP BY type, hamster ASC ORDER BY id ASC LIMIT 1000, 300


    // JOIN (default is inner):
    // SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE category = '67'

    monologue()
        .select( "*", "users u" )
        .join( "posts p", "p.user_id = u.id" )
        .where( { "category": "67" } )
        .query().sql;


    // JOIN (LEFT, as argument):
    // SELECT * FROM users u LEFT JOIN posts p ON p.user_id = u.id WHERE category = '67'

    monologue()
        .select( "*", "users u" )
        .join( "LEFT", "posts p", { "p.user_id": "u.id" } )
        .where( { "category": "67" } )
        .query().sql;


    // SELECT into outfile: the third param (OPTIONALLY ENCLOSED BY) is, as stated, optional. Just pass in the line ending and leave the 4th param out, the rest will be taken care of
    // output: SELECT * FROM users WHERE company = 'general motors' INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n'


    monologue()
        .select( "*", "users" )
        .where( { "company": "general motors" } )
        .file( "/tmp/datafile", ",", '"', "\\n" )
        .query().sql;


    // SELECT into outfile: without third param
    // output: SELECT * FROM users WHERE company = 'general motors' INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ','  LINES TERMINATED BY '\n'

    monologue()
        .select( "*", "users")
        .where( { "company": "general motors" } )
        .file( "/tmp/datafile", ",", "\\n" )
        .query().sql;


    // INSERT, passing an array of objects
    // output: INSERT INTO users (first_name, password, username) VALUES ('me','1234','test'),('pasta','abcd','example')

    monologue()
        .insert( 'users', [
            { username: 'test', password: '1234', first_name: 'me' },
            { username: 'example', password: 'abcd', first_name: "pasta" }
        ] )
        .query().sql;


    // INSERT, passing a single object
    // output: INSERT INTO users (first_name, password, username) VALUES ('cubert','abcd','me')

    monologue()
        .insert( 'users', {
            username: 'me', password: 'abcd', first_name: "cubert"
        } )
        .query().sql;


    // UPDATE
    // output: UPDATE users SET email = 'some@email.com', password = 'abcdefg', username = 'yoyo' WHERE id = 23

    monologue()
        .update( "users", {username: "yoyo", email: 'some@email.com', password: "abcdefg"} )
        .where( {id: 23} )
        .query().sql;


    // DELETE
    // output: DELETE FROM users WHERE first_name = 'me' AND password = '1234' AND username = 'test'

    monologue()
        .delete( 'users', { username: 'test', password: '1234', first_name: "me" } )
        .query().sql;


    // UNION
    // Wrappers can be out of order BEFORE the UNION statement,
    // wrappers after will be applied to the secondary statment
    // output: SELECT username, email FROM users WHERE company_id = '1234' UNION SELECT screename, email_address FROM app_users WHERE company = 'coName'

    monologue()
        .select('username, email', 'users')
        .where({"company_id": "1234"})
        .union('screename, email_address', 'app_users')
        .where({"company":"coName"})
        .query().sql

