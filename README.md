Monologue - Streamlined query building
======================================

### BREAKING CHANGE: monologue.query() will no longer return the query string, it will return "this".  monologue.sql will now have the compiled query, and monolouge.params will have your param values (no change)
### Behavior of monologue.like() was changed slightly, see examples below.  It will no longer add "%" for you, you can add it wherever you want.
#### Monologue won't attempt to remove duplicates. It was problematic and opens the door to buggy output. Reduce your values sets before passing

**Install**

    npm install monologue

**Usage**

This was ported from a PHP library, and uses named parameters for binding (PDO library). Some mysql packages in node support this, see their documentation for examples. This package will continue to evolve and support other methods in the future.

    var mono = require('monologue');

    // Less than basic SELECT statement
    // output: SELECT * FROM users WHERE id IN (:i_1,:i_2,:i_3,:i_4,:i_5,:i_6) AND username = :e_someguy AND email = :e_someguyexampleorg OR email = :e_someguygmailcom AND date BETWEEN :b_20120912 AND :b_20130121 AND name LIKE :l_roen OR name LIKE :l_bb GROUP BY type ASC ORDER BY id ASC LIMIT 1000, 300

    // call the SQL wrappers in any order, see below: where, group, where, order
    mono.select( "*", "users")
        .where( { "id": [1,2,3,4,5,6] } ) // alternative to where("id").in([...])
        .where( 'date_time' ).between( '2012-09-12', '2013-01-20')
        .group( 'type' )
        .where( "name", "OR" ).like("ro%en") // out of order, also passing "OR" as separator
        .order( "id" )
        .limit( '300', 1000 )
        .query().sql;

    console.log( mono.params );
    /* output:
        {
            b_20120912: "2012-09-12",
            b_20130121: "2013-01-20",
            i_1: 1,
            i_2: 2,
            i_3: 3,
            i_4: 4,
            i_5: 5,
            i_6: 6,
            l_roen: "ro%en"
        }
    */

    // SELECT into outfile: the third param (OPTIONALLY ENCLOSED BY) is, as stated, optional. Just pass in the line ending and leave the 4th param out, the rest will be taken care of
    // output: SELECT * FROM users WHERE company = :e_generalmotors INTO OUTFILE '/tmp/datafile' FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n'

    monologue.select( "*", "users")
    .where( { "company": "general motors" } ) // alternative to where("id").in([...])
    .file( "/tmp/datafile", ",", '"', "\\n" )
    .query();

    // INSERT, passing an array of objects
    // output: INSERT INTO users (username,password,first_name) VALUES (:e_test,:e_1234,:e_me),(:e_example,:e_abcd,:e_rasta)

    monologue.insert( 'users', [
        { username: 'test', password: '1234', first_name: 'me' },
        { username: 'example', password: 'abcd', first_name: "rasta" }
    ] ).query().sql


    // INSERT, passing a single object
    // output: INSERT INTO users (username,password,first_name) VALUES (:e_me,:e_abcd,:e_cubert)

    monologue.insert( 'users', { username: 'me', password: 'abcd', first_name: "cubert" } ).query().sql


    // UPDATE
    // output: UPDATE users SET username = :e_yoyo, email = :e_kay, password = :e_abcdefg WHERE id = :e_23

    monologue.update( "users", {username: "yoyo", email: 'some@email.com', password: "abcdefg"} ).where( {id: 23} ).query().sql


    // DELETE
    // output: DELETE FROM users WHERE username = :e_test AND password = :e_1234 AND first_name = :e_me

    monologue.delete( 'users', { username: 'test', password: '1234', first_name: "me" } ).query().sql;