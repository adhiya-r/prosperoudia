const allowedImportStatuses = ['queued', 'processing', 'completed', 'failed'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('import_jobs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('job_uuid').notNullable().unique();
    table.string('queue_job_id', 100);
    table.string('file_name', 255).notNullable();
    table.text('file_path');
    table.string('file_type', 20).notNullable();
    table.string('status', 20).notNullable();
    table.integer('total_rows');
    table.integer('successful_rows');
    table.integer('failed_rows');
    table.jsonb('error_summary');
    table.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('started_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['status'], 'import_jobs_status_idx');
    table.index(['created_by'], 'import_jobs_created_by_idx');
    table.index(['created_at'], 'import_jobs_created_at_idx');
  });

  await knex.raw(`
    ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_status_check
    CHECK (status IN (${sqlStringList(allowedImportStatuses)}))
  `);

  await knex.raw(`
    ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_rows_check
    CHECK (
      (total_rows IS NULL OR total_rows >= 0)
      AND (successful_rows IS NULL OR successful_rows >= 0)
      AND (failed_rows IS NULL OR failed_rows >= 0)
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('import_jobs');
};
