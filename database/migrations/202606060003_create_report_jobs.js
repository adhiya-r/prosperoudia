const allowedReportStatuses = ['queued', 'processing', 'completed', 'failed'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('report_jobs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('job_uuid').notNullable().unique();
    table.string('queue_job_id', 100);
    table.string('report_type', 50).notNullable();
    table.jsonb('filters');
    table.string('status', 20).notNullable();
    table.text('output_file_path');
    table.jsonb('error_summary');
    table.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('started_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['report_type'], 'report_jobs_report_type_idx');
    table.index(['status'], 'report_jobs_status_idx');
    table.index(['created_by'], 'report_jobs_created_by_idx');
    table.index(['created_at'], 'report_jobs_created_at_idx');
  });

  await knex.raw(`
    ALTER TABLE report_jobs
    ADD CONSTRAINT report_jobs_status_check
    CHECK (status IN (${sqlStringList(allowedReportStatuses)}))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('report_jobs');
};
