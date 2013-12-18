Monologue - Streamlined query building
======================================

**Install**

    npm install monologue

**Usage**

This was ported from a PHP library, and uses named parameters for binding. Some mysql packages in node support this, see their documentation for examples. This package will continue to evolve and support other methods in the future.

    var mono = require('monologue');

    // call the SQL wrappers in any order, see below: where, group, where, order
    mono.select( "*", "users")
        .where( "id" ).in([1,2,3,4,5,6,6,6,6,6])
        .where('date_time').between( '2012-09-12', '2013-01-20')
        .group('type')
        .where( "name", "OR" ).like("ro") // out of order, also passing "OR" as separator
        .order("id")
        .limit('300', 1000)

    var query = mono.query();

    // Now pass query (or the var you assign, see above) and mono.params into your MySQL querying function!

    console.log( query ); // output: SELECT * FROM users WHERE id IN (:__in_1,:__in_2,:__in_3,:__in_4,:__in_5,:__in_6) AND date_time BETWEEN :__between_8_20120912 AND :__between_8_20130121 OR name LIKE :__like_ro GROUP BY type ASC ORDER BY id ASC LIMIT 1000, 300

    console.log( mono.params );
    /* output: Automatically reduces duplicates!
        {
            __between_1342gavlkjh32awk4jh2kf2f5hs42d4h_20120912: "2012-09-12",
            __between_qlhk2j43hvakejh34kfjhvk3jrvkjnek_20130121: "2013-01-21",
            __in_1: 1,
            __in_2: 2,
            __in_3: 3,
            __in_4: 4,
            __in_5: 5,
            __in_6: 6,
            __like_ro: "%ro%"
        }
    */