import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // create table
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("wallet", 255).notNullable();
    table.string("avatar", 255).notNullable();
    table.string("name", 255).notNullable();
    table.string("description", 255).notNullable();
  });

  // insert data
  await knex("users").insert([
    { id: 1, wallet: '200', avatar: 'https://example.com/avatar2.png', name: 'John Smith', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit' },
    { id: 3, wallet: '123', avatar: '', name: '', description: '' },
    { id: 4, wallet: '1234', avatar: '', name: '', description: '' },
    { id: 5, wallet: '1', avatar: '', name: '', description: '' },
    { id: 6, wallet: '0:fed265a59332abef0e2392fb653f94e8ff5cff55f6b35f6bfd3f3b7b5f862a2b', avatar: '222', name: 'Ihar Chernishev111', description: 'vTools failed to load source map: Could not load content for chrome111' },
    { id: 7, wallet: '0:fed265a59332abef0e2392fb653f94e8ff5cff55f6b35f6bfd3f3b7b5f862a2b', avatar: '', name: '', description: '' },
  ]);

  // Create 'articles' table
  await knex.schema.createTable("articles", (table) => {
    table.increments("id").primary();
    table.string("hash", 255).notNullable();
    table.string("content", 255).notNullable();
    table.integer("author_id").unsigned().notNullable();

    table.foreign("author_id").references("id").inTable("users");
  });

  // Insert data into 'articles' table
  await knex("articles").insert([
    { id: 2, hash: 'random-hash', content: 'Lorem ipsum dolor sit amet', author_id: 1 },
    { id: 3, hash: 'random-hash', content: 'Lorem ipsum dolor sit amet', author_id: 1 },
    { id: 4, hash: '00000000000', content: '{"time":1683731258538,"blocks":[{"id":"sheNwCUP5A","type":"header","data":{"text":"Title","level":1}},{"id":"u3i1-RBll_","type":"paragraph","data":{"text":"ceecec"}},{"id":"Z-X8jY2mAi","type":"paragraph","data":{"text":"ececec"}}],"version":"2.26.5"}', author_id: 6 },
    { id: 6, hash: '00000000000', content: '{"time":1683796077710,"blocks":[{"id":"sheNwCUP5A","type":"header","data":{"text":"Title11","level":1}},{"id":"4RA6seA4xt","type":"paragraph","data":{"text":"efefwefwef"}}],"version":"2.26.5"}', author_id: 6 },
    { id: 7, hash: '00000000000', content: '{"time":1683796230168,"blocks":[{"id":"sheNwCUP5A","type":"header","data":{"text":"Title1122","level":1}},{"id":"5Rk0mmE5T7","type":"paragraph","data":{"text":"yukddd11"}},{"id":"5jV6cesj88","type":"paragraph","data":{"text":"yku"}}],"version":"2.26.5"}', author_id: 6 },
    { id: 8, hash: '00000000000', content: '{"time":1683795761833,"blocks":[{"id":"sheNwCUP5A","type":"header","data":{"text":"Title","level":1}},{"id":"buOPouRBIE","type":"paragraph","data":{"text":"cdchh"}}],"version":"2.26.5"}', author_id: 6 },
    { id: 11, hash: '00000000000', content: '{"time":1683795580253,"blocks":[{"id":"fzJUR75ZC8","type":"paragraph","data":{"text":"111111222"}},{"id":"2xATC4OkUH","type":"paragraph","data":{"text":"111111"}}],"version":"2.26.5"}', author_id: 6 },
  ]);

  await knex.schema.createTable('images', table => {
    table.increments('id');
    table.integer("author_id").unsigned().notNullable();
    table.string('signature', 255).notNullable();
    table.string('path', 255).notNullable();

    table.foreign("author_id").references("id").inTable("users");

  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop 'images' table
  await knex.schema.dropTable('images');

  // Drop 'articles' table
  await knex.schema.dropTable("articles");

  // Drop 'users' table
  await knex.schema.dropTable("users");
}