#!/bin/sh
/usr/bin/mysqld --user=mysql &
sleep 5 &&
mysql -h 127.0.0.1 -uroot -e "source /app/migrations/db.sql" &&
mysql -h 127.0.0.1 -uroot -e "CREATE USER 'fjuser'@'%' IDENTIFIED BY 'fjpassword';" &&
mysql -h 127.0.0.1 -uroot -e "GRANT ALL ON fair_journal.* TO 'fjuser'@'%';" &&
mysql -h 127.0.0.1 -uroot -e "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '';" &&
npx knex migrate:latest &&
npm run test
