#!/bin/sh
/usr/bin/mysqld --user=mysql --bind-address=127.0.0.1 &
sleep 5 &&
mysql --protocol=TCP -h 127.0.0.1 -uroot -e "source ./migrations/db.sql" &&
mysql --protocol=TCP -h 127.0.0.1 -uroot -e "CREATE USER 'fjuser'@'%' IDENTIFIED BY 'fjpassword';" &&
mysql --protocol=TCP -h 127.0.0.1 -uroot -e "GRANT ALL ON fair_journal.* TO 'fjuser'@'%';" &&
mysql --protocol=TCP -h 127.0.0.1 -uroot -e "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '';" &&
npx knex migrate:latest &&
npm run test
