import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('file', (table) => {
    table.string('reference', 64).primary().unique().index();
    table.integer('status').unsigned();
    table.string('mime_type', 255);
    table.bigInteger('size').unsigned(); // added size field
    table.string('sha256', 64).index(); // added sha256 field with index
    table.dateTime('created_at').defaultTo(knex.fn.now());
    table.dateTime('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('file');
}
