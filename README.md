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

    // call the SQL wrappers in any order, see below: where, group, where, order
    mono.select( "*", "users")
        .where( { "id": [1,2,3,4,5,6,6,6,6,6] } ) // alternative to where("id").in([...])
        .where('date_time').between( '2012-09-12', '2013-01-20')
        .group('type')
        .where( "name", "OR" ).like("ro%en") // out of order, also passing "OR" as separator
        .order("id")
        .limit('300', 1000)
        .query();

    // Now pass query (or the var you assign, see above) and mono.params into your MySQL querying function!

    console.log( mono.sql ); // output: SELECT * FROM users WHERE id IN (:__in_1,:__in_2,:__in_3,:__in_4,:__in_5,:__in_6) AND date_time BETWEEN :__between_20120912 AND :__between_20130121 OR name LIKE :__like_ro GROUP BY type ASC ORDER BY id ASC LIMIT 1000, 300

    console.log( mono.params );
    /* output:
        {
            __between_20120912: "2012-09-12",
            __between_20130121: "2013-01-21",
            __in_1: 1,
            __in_2: 2,
            __in_3: 3,
            __in_4: 4,
            __in_5: 5,
            __in_6: 6,
            __like_roen: "ro%en"
        }
    */

    // Insert, passing an array of objects
    // output: INSERT INTO users (username,password,first_name) VALUES (:__eq_test,:__eq_1234,:__eq_me),(:__eq_example,:__eq_abcd,:__eq_rasta)

    monologue.insert( 'users', [
        { username: 'test', password: '1234', first_name: 'me' },
        { username: 'example', password: 'abcd', first_name: "rasta" }
    ] ).query().sql


    // Insert, passing a single object
    // output: INSERT INTO users (username,password,first_name) VALUES (:__eq_me,:__eq_abcd,:__eq_cubert)

    monologue.insert( 'users', { username: 'me', password: 'abcd', first_name: "cubert" } ).query().sql


    // Update
    // output: UPDATE users SET username = :__eq_yoyo, email = :__eq_kay, love = :__eq_toby WHERE id = :__eq_23

    monologue.update( "users", {username: "yoyo", email: 'kay', love: "toby"} ).where( {id: 23} ).query().sql


    // Delete
    // output: DELETE FROM users WHERE id = :__eq_23 AND username = :__eq_test AND password = :__eq_1234 AND first_name = :__eq_me

    monologue.delete( 'users', { username: 'test', password: '1234', first_name: "me" } ).query().sql;