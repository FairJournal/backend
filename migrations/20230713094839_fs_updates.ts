import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('fs_update', table => {
    table.increments('id').unsigned().primary();
    table.string('public_key', 64).notNullable();
    table.integer('update_id').unsigned().notNullable();
    table.text('update', 'longtext').notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    // Setting the combination of public_key + update_id to be unique
    table.unique(['public_key', 'update_id']);
    table.index('public_key'); // Add an index to the public_key column
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('fs_update');
}
